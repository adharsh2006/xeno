import os
import json
from groq import Groq
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Customer, Campaign, CampaignLog
from filter_engine import apply_segment_filters
import schemas

router = APIRouter(prefix="/ai", tags=["ai"])

def get_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured. Please add GROQ_API_KEY to your environment.")
    return Groq(api_key=api_key)


def safe_generate(client, prompt: str, max_retries: int = 2) -> str:
    """Generate text with retry on failure using Groq."""
    for attempt in range(max_retries):
        try:
            completion = client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
    return ""


@router.post("/segment", response_model=schemas.AISegmentResponse)
def ai_segment(payload: schemas.AISegmentRequest, db: Session = Depends(get_db)):
    """Convert natural language to segment filter criteria using Groq."""
    client = get_client()

    prompt = f"""You are a CRM segmentation assistant. Convert the user's description into a JSON filter object.

Available filter keys:
- min_spent: minimum total spend in INR (number)
- max_spent: maximum total spend in INR (number)  
- days_inactive: last purchase more than N days ago (number)
- days_active: last purchase within N days (number)
- channel_preference: "whatsapp", "email", "sms", or "rcs" (string)
- min_orders: minimum number of orders (number)
- max_orders: maximum number of orders (number)

User request: "{payload.prompt}"

Respond ONLY with valid JSON, no markdown, no explanation outside JSON. Example:
{{"filter_criteria": {{"min_spent": 5000}}, "explanation": "Customers who spent over ₹5000"}}"""

    try:
        raw = safe_generate(client, prompt)
        # Strip markdown code fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        filter_criteria = data.get("filter_criteria", {})
        explanation = data.get("explanation", payload.prompt)
    except Exception as e:
        filter_criteria = {}
        explanation = f"Could not parse AI response: {str(e)[:100]}"

    count = apply_segment_filters(db, filter_criteria).count()

    return schemas.AISegmentResponse(
        filter_criteria=filter_criteria,
        explanation=explanation,
        customer_count=count,
    )


@router.post("/message", response_model=schemas.AIMessageResponse)
def ai_message(payload: schemas.AIMessageRequest, db: Session = Depends(get_db)):
    """Generate a personalized message for a customer using Groq."""
    client = get_client()

    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    channel = payload.channel
    context = payload.campaign_context or "a promotional campaign"

    channel_hints = {
        "whatsapp": "casual, warm, max 160 chars, use Hi {name}",
        "sms": "very brief, max 140 chars, professional",
        "email": "subject line + 2-3 sentence body, formal yet friendly",
        "rcs": "engaging, use 1-2 emojis, max 200 chars",
    }
    hint = channel_hints.get(channel, "concise and friendly")

    prompt = f"""Write a personalized {channel.upper()} marketing message for an Indian D2C brand called BrewCo (coffee & tea).

Customer: {customer.name}
Total spent: ₹{customer.total_spent:,.0f}
Last purchase: {customer.last_purchase_date.strftime('%B %Y') if customer.last_purchase_date else 'some time ago'}
Campaign: {context}
Channel style: {hint}

Rules:
- Use {{name}} as a placeholder for the customer name (literal text)
- Use ₹ for currency
- Sound warm and Indian in tone
- No hashtags, no links

Write ONLY the message text, nothing else:"""

    try:
        msg_text = safe_generate(client, prompt)
        msg_text = msg_text.replace("{name}", customer.name)
    except Exception as e:
        msg_text = f"Hi {customer.name}, we have an exciting offer just for you! Visit us today. - BrewCo"

    return schemas.AIMessageResponse(message=msg_text)


@router.post("/insights", response_model=schemas.AIInsightsResponse)
def ai_insights(payload: schemas.AIInsightsRequest, db: Session = Depends(get_db)):
    """Generate campaign performance insights using Groq."""
    client = get_client()

    campaign = db.query(Campaign).filter(Campaign.id == payload.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    sent = campaign.total_sent or 1
    delivery_rate = round(campaign.total_delivered / sent * 100, 1)
    open_rate = round(campaign.total_opened / sent * 100, 1)
    click_rate = round(campaign.total_clicked / sent * 100, 1)
    conv_rate = round(campaign.total_converted / sent * 100, 1)

    prompt = f"""You are a marketing analytics expert for an Indian D2C brand. 
Summarize this campaign's performance in exactly 2-3 sentences. Be specific about numbers, highlight what worked well, and suggest ONE actionable improvement.

Campaign: {campaign.name}
Channel: {campaign.channel}
Status: {campaign.status}
Sent: {campaign.total_sent:,}
Delivered: {campaign.total_delivered:,} ({delivery_rate}%)
Opened: {campaign.total_opened:,} ({open_rate}%)
Clicked: {campaign.total_clicked:,} ({click_rate}%)
Converted: {campaign.total_converted:,} ({conv_rate}%)

Write your 2-3 sentence insight:"""

    try:
        insights = safe_generate(client, prompt)
    except Exception as e:
        insights = f"Campaign delivered to {delivery_rate}% of recipients with a {open_rate}% open rate and {conv_rate}% conversion rate. Performance aligns with industry benchmarks for {campaign.channel} campaigns."

    return schemas.AIInsightsResponse(insights=insights)

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
from models import Customer, Order, Segment, Campaign, CampaignLog  # noqa: F401 - registers models
from routers import customers, segments, campaigns, receipts, ai

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BrewCo CRM API",
    description="AI-Native Mini CRM Backend",
    version="1.0.0",
)

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(customers.router)
app.include_router(segments.router)
app.include_router(campaigns.router)
app.include_router(receipts.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {"message": "BrewCo CRM API", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/dashboard/stats")
def dashboard_stats(db=None):
    from database import SessionLocal
    from sqlalchemy import func
    from models import Customer, Campaign, CampaignLog, Order

    db = SessionLocal()
    try:
        total_customers = db.query(func.count(Customer.id)).scalar() or 0
        total_campaigns = db.query(func.count(Campaign.id)).scalar() or 0

        # Revenue driven = sum of all orders
        revenue = db.query(func.sum(Order.amount)).scalar() or 0

        # Avg open rate from completed campaigns
        campaigns = db.query(Campaign).filter(Campaign.total_sent > 0).all()
        open_rates = [
            c.total_opened / c.total_sent * 100
            for c in campaigns
            if c.total_sent > 0
        ]
        avg_open_rate = round(sum(open_rates) / len(open_rates), 1) if open_rates else 0

        # Active campaigns
        active = (
            db.query(Campaign)
            .filter(Campaign.status == "running")
            .all()
        )
        active_data = []
        for c in active:
            sent = c.total_sent or 1
            active_data.append({
                "id": c.id,
                "name": c.name,
                "channel": c.channel.value if hasattr(c.channel, "value") else c.channel,
                "status": c.status.value if hasattr(c.status, "value") else c.status,
                "total_sent": c.total_sent,
                "delivery_rate": round(c.total_delivered / sent * 100, 1),
            })

        return {
            "total_customers": total_customers,
            "total_campaigns": total_campaigns,
            "revenue_driven": round(revenue),
            "avg_open_rate": avg_open_rate,
            "active_campaigns": active_data,
        }
    finally:
        db.close()

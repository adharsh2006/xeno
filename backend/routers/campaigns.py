import asyncio
import os
from datetime import datetime
from typing import List

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from filter_engine import apply_segment_filters
from models import Campaign, CampaignLog, Segment
import schemas

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

CHANNEL_SERVICE_URL = os.getenv("CHANNEL_SERVICE_URL", "http://localhost:8001")


# ─── Background Task ──────────────────────────────────────────────────────────

async def launch_campaign_task(campaign_id: int):
    """
    Background task: loop through segment customers, create logs,
    call channel service for each.
    """
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return

        segment = db.query(Segment).filter(Segment.id == campaign.segment_id).first()
        if not segment:
            return

        customers = apply_segment_filters(db, segment.filter_criteria).all()

        channel = (
            campaign.channel.value
            if hasattr(campaign.channel, "value")
            else campaign.channel
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            for customer in customers:
                # Personalize message
                message = campaign.message_template.replace("{name}", customer.name)

                # Create log
                log = CampaignLog(
                    campaign_id=campaign.id,
                    customer_id=customer.id,
                    message_sent=message,
                    status="sent",
                )
                db.add(log)
                db.flush()
                log_id = log.id

                # Increment sent
                campaign.total_sent += 1
                db.commit()

                # Fire and forget to channel service
                try:
                    await client.post(
                        f"{CHANNEL_SERVICE_URL}/send",
                        json={
                            "log_id": log_id,
                            "customer_id": customer.id,
                            "customer_name": customer.name,
                            "customer_email": customer.email,
                            "customer_phone": customer.phone,
                            "channel": channel,
                            "message": message,
                        },
                    )
                except Exception:
                    pass  # Channel service will retry

                await asyncio.sleep(0.05)  # Rate limit: ~20 msgs/sec

        # Mark completed
        campaign.status = "completed"
        db.commit()
    finally:
        db.close()


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.post("", response_model=schemas.CampaignOut, status_code=201)
def create_campaign(payload: schemas.CampaignCreate, db: Session = Depends(get_db)):
    segment = db.query(Segment).filter(Segment.id == payload.segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    campaign = Campaign(**payload.model_dump())
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/launch", response_model=schemas.CampaignOut)
async def launch_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == "running":
        raise HTTPException(status_code=400, detail="Campaign already running")

    campaign.status = "running"
    campaign.launched_at = datetime.utcnow()
    db.commit()
    db.refresh(campaign)

    # Schedule background task
    background_tasks.add_task(launch_campaign_task, campaign_id)

    return campaign


@router.get("/{campaign_id}/stats", response_model=schemas.CampaignStats)
def get_campaign_stats(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    sent = campaign.total_sent or 1  # avoid div by zero

    return schemas.CampaignStats(
        id=campaign.id,
        name=campaign.name,
        status=campaign.status.value
        if hasattr(campaign.status, "value")
        else campaign.status,
        total_sent=campaign.total_sent,
        total_delivered=campaign.total_delivered,
        total_opened=campaign.total_opened,
        total_clicked=campaign.total_clicked,
        total_converted=campaign.total_converted,
        delivery_rate=round(campaign.total_delivered / sent * 100, 1),
        open_rate=round(campaign.total_opened / sent * 100, 1),
        click_rate=round(campaign.total_clicked / sent * 100, 1),
        conversion_rate=round(campaign.total_converted / sent * 100, 1),
    )


@router.get("/{campaign_id}", response_model=schemas.CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/{campaign_id}/logs", response_model=List[schemas.CampaignLogOut])
def get_campaign_logs(
    campaign_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    logs = (
        db.query(CampaignLog)
        .filter(CampaignLog.campaign_id == campaign_id)
        .order_by(CampaignLog.updated_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        result.append(
            schemas.CampaignLogOut(
                id=log.id,
                campaign_id=log.campaign_id,
                customer_id=log.customer_id,
                customer_name=log.customer.name if log.customer else None,
                customer_email=log.customer.email if log.customer else None,
                message_sent=log.message_sent,
                status=log.status.value if hasattr(log.status, "value") else log.status,
                updated_at=log.updated_at,
            )
        )
    return result

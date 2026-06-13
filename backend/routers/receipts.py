from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Campaign, CampaignLog
import schemas

router = APIRouter(prefix="/receipts", tags=["receipts"])

# Status progression order
STATUS_ORDER = ["sent", "delivered", "failed", "opened", "clicked", "converted"]


@router.post("", status_code=200)
def handle_receipt(payload: schemas.ReceiptIn, db: Session = Depends(get_db)):
    log = db.query(CampaignLog).filter(CampaignLog.id == payload.log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    old_status = (
        log.status.value if hasattr(log.status, "value") else log.status
    )
    new_status = payload.status

    log.status = new_status
    log.updated_at = datetime.utcnow()

    # Update campaign counters
    campaign = db.query(Campaign).filter(Campaign.id == log.campaign_id).first()
    if campaign:
        if new_status == "delivered":
            campaign.total_delivered += 1
        elif new_status == "opened":
            campaign.total_opened += 1
        elif new_status == "clicked":
            campaign.total_clicked += 1
        elif new_status == "converted":
            campaign.total_converted += 1

    db.commit()
    return {"ok": True, "log_id": payload.log_id, "status": new_status}

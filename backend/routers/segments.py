from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from models import Segment, Customer, Order
from filter_engine import apply_segment_filters
import schemas

router = APIRouter(prefix="/segments", tags=["segments"])


def count_segment_customers(db: Session, filter_criteria: dict) -> int:
    return apply_segment_filters(db, filter_criteria).count()


@router.get("", response_model=List[schemas.SegmentOut])
def list_segments(db: Session = Depends(get_db)):
    return db.query(Segment).order_by(Segment.created_at.desc()).all()


@router.post("", response_model=schemas.SegmentOut, status_code=201)
def create_segment(payload: schemas.SegmentCreate, db: Session = Depends(get_db)):
    count = count_segment_customers(db, payload.filter_criteria)
    segment = Segment(
        name=payload.name,
        description=payload.description,
        filter_criteria=payload.filter_criteria,
        customer_count=count,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment


@router.post("/preview", response_model=schemas.SegmentPreviewResponse)
def preview_segment(
    payload: schemas.SegmentPreviewRequest, db: Session = Depends(get_db)
):
    query = apply_segment_filters(db, payload.filter_criteria)
    total = query.count()
    sample = query.limit(5).all()

    sample_out = []
    for c in sample:
        order_count = (
            db.query(func.count(Order.id))
            .filter(Order.customer_id == c.id)
            .scalar()
            or 0
        )
        sample_out.append(
            schemas.CustomerListOut(
                id=c.id,
                name=c.name,
                email=c.email,
                phone=c.phone,
                channel_preference=c.channel_preference.value
                if hasattr(c.channel_preference, "value")
                else c.channel_preference,
                total_spent=c.total_spent,
                last_purchase_date=c.last_purchase_date,
                created_at=c.created_at,
                order_count=order_count,
            )
        )

    return schemas.SegmentPreviewResponse(count=total, sample_customers=sample_out)


@router.get("/{segment_id}/customers", response_model=List[schemas.CustomerListOut])
def get_segment_customers(segment_id: int, db: Session = Depends(get_db)):
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    customers = apply_segment_filters(db, segment.filter_criteria).all()
    result = []
    for c in customers:
        order_count = (
            db.query(func.count(Order.id))
            .filter(Order.customer_id == c.id)
            .scalar()
            or 0
        )
        result.append(
            schemas.CustomerListOut(
                id=c.id,
                name=c.name,
                email=c.email,
                phone=c.phone,
                channel_preference=c.channel_preference.value
                if hasattr(c.channel_preference, "value")
                else c.channel_preference,
                total_spent=c.total_spent,
                last_purchase_date=c.last_purchase_date,
                created_at=c.created_at,
                order_count=order_count,
            )
        )
    return result

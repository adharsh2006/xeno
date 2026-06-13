from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
import json

from database import get_db
from models import Customer, Order
import schemas

router = APIRouter(prefix="/customers", tags=["customers"])


def customer_to_list_out(customer: Customer, db: Session) -> schemas.CustomerListOut:
    order_count = db.query(func.count(Order.id)).filter(
        Order.customer_id == customer.id
    ).scalar() or 0
    return schemas.CustomerListOut(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        channel_preference=customer.channel_preference.value
        if hasattr(customer.channel_preference, "value")
        else customer.channel_preference,
        total_spent=customer.total_spent,
        last_purchase_date=customer.last_purchase_date,
        created_at=customer.created_at,
        order_count=order_count,
    )


@router.get("", response_model=schemas.PaginatedCustomers)
def list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Customer)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Customer.name.ilike(pattern),
                Customer.email.ilike(pattern),
                Customer.phone.ilike(pattern),
            )
        )

    total = query.count()
    customers = query.offset((page - 1) * per_page).limit(per_page).all()
    items = [customer_to_list_out(c, db) for c in customers]

    return schemas.PaginatedCustomers(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page,
    )


@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/import", status_code=201)
def import_customers(customers: List[schemas.CustomerCreate], db: Session = Depends(get_db)):
    created = []
    for c in customers:
        existing = db.query(Customer).filter(Customer.email == c.email).first()
        if existing:
            continue
        customer = Customer(**c.model_dump())
        db.add(customer)
        created.append(c.email)
    db.commit()
    return {"imported": len(created), "emails": created}

"""
filter_criteria JSON structure supported:
{
  "min_spent": 5000,
  "max_spent": 15000,
  "days_inactive": 90,          # last purchase > N days ago
  "days_active": 30,            # last purchase within N days
  "channel_preference": "whatsapp",
  "min_orders": 3,
  "max_orders": 10,
  "min_last_purchase_amount": 500,
}
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from models import Customer, Order


def apply_segment_filters(db: Session, filter_criteria: dict):
    """Apply segment filter criteria and return matching customers query."""
    query = db.query(Customer)

    if "min_spent" in filter_criteria:
        query = query.filter(Customer.total_spent >= filter_criteria["min_spent"])

    if "max_spent" in filter_criteria:
        query = query.filter(Customer.total_spent <= filter_criteria["max_spent"])

    if "channel_preference" in filter_criteria:
        query = query.filter(
            Customer.channel_preference == filter_criteria["channel_preference"]
        )

    if "days_inactive" in filter_criteria:
        cutoff = datetime.utcnow() - timedelta(days=filter_criteria["days_inactive"])
        query = query.filter(Customer.last_purchase_date < cutoff)

    if "days_active" in filter_criteria:
        cutoff = datetime.utcnow() - timedelta(days=filter_criteria["days_active"])
        query = query.filter(Customer.last_purchase_date >= cutoff)

    if "min_orders" in filter_criteria:
        subq = (
            db.query(Order.customer_id, func.count(Order.id).label("cnt"))
            .group_by(Order.customer_id)
            .subquery()
        )
        query = query.join(subq, Customer.id == subq.c.customer_id).filter(
            subq.c.cnt >= filter_criteria["min_orders"]
        )

    if "max_orders" in filter_criteria:
        subq = (
            db.query(Order.customer_id, func.count(Order.id).label("cnt"))
            .group_by(Order.customer_id)
            .subquery()
        )
        query = query.join(subq, Customer.id == subq.c.customer_id).filter(
            subq.c.cnt <= filter_criteria["max_orders"]
        )

    return query

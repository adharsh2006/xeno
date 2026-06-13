from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey,
    JSON, Text, func
)
from sqlalchemy.orm import relationship
from database import Base
import enum


class ChannelEnum(str, enum.Enum):
    whatsapp = "whatsapp"
    email = "email"
    sms = "sms"
    rcs = "rcs"


class CampaignStatusEnum(str, enum.Enum):
    draft = "draft"
    running = "running"
    completed = "completed"


class LogStatusEnum(str, enum.Enum):
    sent = "sent"
    delivered = "delivered"
    failed = "failed"
    opened = "opened"
    clicked = "clicked"
    converted = "converted"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    channel_preference = Column(String(20), default="whatsapp")
    total_spent = Column(Float, default=0.0)
    last_purchase_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    campaign_logs = relationship("CampaignLog", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    product_name = Column(String(200), nullable=False)
    purchased_at = Column(DateTime, default=func.now())

    customer = relationship("Customer", back_populates="orders")


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    filter_criteria = Column(JSON, nullable=False, default=dict)
    customer_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())

    campaigns = relationship("Campaign", back_populates="segment")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    segment_id = Column(Integer, ForeignKey("segments.id"), nullable=False)
    message_template = Column(Text, nullable=False)
    channel = Column(String(20), nullable=False)
    status = Column(String(20), default="draft")
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)
    total_converted = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    launched_at = Column(DateTime, nullable=True)

    segment = relationship("Segment", back_populates="campaigns")
    logs = relationship("CampaignLog", back_populates="campaign")


class CampaignLog(Base):
    __tablename__ = "campaign_logs"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    message_sent = Column(Text, nullable=True)
    status = Column(String(20), default="sent")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    campaign = relationship("Campaign", back_populates="logs")
    customer = relationship("Customer", back_populates="campaign_logs")


from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr


# ─── Customer Schemas ─────────────────────────────────────────────────────────

class OrderOut(BaseModel):
    id: int
    amount: float
    product_name: str
    purchased_at: datetime

    class Config:
        from_attributes = True


class CustomerBase(BaseModel):
    name: str
    email: str
    phone: str
    channel_preference: str = "whatsapp"
    total_spent: float = 0.0
    last_purchase_date: Optional[datetime] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    id: int
    created_at: datetime
    orders: List[OrderOut] = []

    class Config:
        from_attributes = True


class CustomerListOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    channel_preference: str
    total_spent: float
    last_purchase_date: Optional[datetime]
    created_at: datetime
    order_count: int = 0

    class Config:
        from_attributes = True


class PaginatedCustomers(BaseModel):
    items: List[CustomerListOut]
    total: int
    page: int
    per_page: int
    total_pages: int


# ─── Segment Schemas ──────────────────────────────────────────────────────────

class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    filter_criteria: Dict[str, Any] = {}


class SegmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    filter_criteria: Dict[str, Any]
    customer_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class SegmentPreviewRequest(BaseModel):
    filter_criteria: Dict[str, Any]


class SegmentPreviewResponse(BaseModel):
    count: int
    sample_customers: List[CustomerListOut]


# ─── Campaign Schemas ─────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    segment_id: int
    message_template: str
    channel: str


class CampaignOut(BaseModel):
    id: int
    name: str
    segment_id: int
    message_template: str
    channel: str
    status: str
    total_sent: int
    total_delivered: int
    total_opened: int
    total_clicked: int
    total_converted: int
    created_at: datetime
    launched_at: Optional[datetime]

    class Config:
        from_attributes = True


class CampaignStats(BaseModel):
    id: int
    name: str
    status: str
    total_sent: int
    total_delivered: int
    total_opened: int
    total_clicked: int
    total_converted: int
    delivery_rate: float
    open_rate: float
    click_rate: float
    conversion_rate: float


# ─── Campaign Log Schemas ─────────────────────────────────────────────────────

class CampaignLogOut(BaseModel):
    id: int
    campaign_id: int
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    message_sent: Optional[str]
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Receipt Schema ───────────────────────────────────────────────────────────

class ReceiptIn(BaseModel):
    log_id: int
    status: str  # delivered, failed, opened, clicked, converted


# ─── AI Schemas ───────────────────────────────────────────────────────────────

class AISegmentRequest(BaseModel):
    prompt: str


class AISegmentResponse(BaseModel):
    filter_criteria: Dict[str, Any]
    explanation: str
    customer_count: int


class AIMessageRequest(BaseModel):
    customer_id: int
    channel: str
    campaign_context: Optional[str] = None


class AIMessageResponse(BaseModel):
    message: str


class AIInsightsRequest(BaseModel):
    campaign_id: int


class AIInsightsResponse(BaseModel):
    insights: str

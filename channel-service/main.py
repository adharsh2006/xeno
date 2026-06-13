"""
Channel Service — Stub delivery simulator.
Port: 8001

Receives /send requests from the CRM, simulates delivery lifecycle,
and POSTs callbacks to CRM /receipts endpoint.

Delivery lifecycle:
  sent → (1-4s) → 90% delivered | 10% failed
  delivered → (2-6s) → 70% chance opened
  opened → (2-5s) → 40% chance clicked
  clicked → (1-3s) → 35% chance converted

Each callback retries up to 3 times with exponential backoff (1s, 2s, 4s).
"""
import asyncio
import os
import random
import logging

import httpx
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BrewCo Channel Service",
    description="Stub delivery service with simulated delivery lifecycle",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CRM_URL = os.getenv("CRM_URL", "http://localhost:8000")


class SendRequest(BaseModel):
    log_id: int
    customer_id: int
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    channel: str
    message: str


async def callback_with_retry(log_id: int, status: str, max_retries: int = 3):
    """POST status callback to CRM with exponential backoff retry."""
    backoff = 1
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{CRM_URL}/receipts",
                    json={"log_id": log_id, "status": status},
                )
                if resp.status_code == 200:
                    logger.info(f"[LOG {log_id}] Callback OK: {status}")
                    return True
                logger.warning(
                    f"[LOG {log_id}] Callback returned {resp.status_code}, attempt {attempt + 1}"
                )
        except Exception as e:
            logger.warning(f"[LOG {log_id}] Callback error (attempt {attempt + 1}): {e}")

        if attempt < max_retries - 1:
            await asyncio.sleep(backoff)
            backoff *= 2

    logger.error(f"[LOG {log_id}] All {max_retries} callback attempts failed for status: {status}")
    return False


async def simulate_delivery(log_id: int, channel: str):
    """Simulate the full delivery lifecycle for a message."""
    try:
        # Step 1: Wait 1-4s, then deliver or fail (90%/10%)
        await asyncio.sleep(random.uniform(1, 4))
        if random.random() < 0.10:
            # Failed
            await callback_with_retry(log_id, "failed")
            return
        
        # Delivered
        await callback_with_retry(log_id, "delivered")

        # Step 2: Wait 2-6s, then 70% chance opened
        await asyncio.sleep(random.uniform(2, 6))
        if random.random() > 0.70:
            return
        await callback_with_retry(log_id, "opened")

        # Step 3: Wait 2-5s, then 40% chance clicked
        await asyncio.sleep(random.uniform(2, 5))
        if random.random() > 0.40:
            return
        await callback_with_retry(log_id, "clicked")

        # Step 4: Wait 1-3s, then 35% chance converted
        await asyncio.sleep(random.uniform(1, 3))
        if random.random() > 0.35:
            return
        await callback_with_retry(log_id, "converted")

    except Exception as e:
        logger.error(f"[LOG {log_id}] Simulation error: {e}")


@app.get("/")
def root():
    return {"message": "BrewCo Channel Service", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/send", status_code=200)
async def send_message(payload: SendRequest, background_tasks: BackgroundTasks):
    """
    Accept message delivery request. Returns 200 immediately.
    Simulates delivery lifecycle in background.
    """
    logger.info(
        f"[LOG {payload.log_id}] Sending via {payload.channel} to {payload.customer_name}"
    )
    background_tasks.add_task(simulate_delivery, payload.log_id, payload.channel)
    return {
        "accepted": True,
        "log_id": payload.log_id,
        "channel": payload.channel,
        "message": "Message queued for delivery",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

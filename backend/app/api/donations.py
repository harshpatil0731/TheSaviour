"""Donations and perishable batches router."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import Donation
from app.store import store

router = APIRouter()


@router.get("/donations", response_model=List[Donation], tags=["Donations"])
def get_donations(
    urgency: Optional[str] = Query(None, description="Filter by urgency: CRITICAL, HIGH, MODERATE, STABLE"),
    status: Optional[str] = Query(None, description="Filter by status: AVAILABLE, PARTIALLY_ASSIGNED, etc."),
) -> List[Donation]:
    """Retrieve all perishable food and aid donations."""
    return store.list_donations(urgency=urgency, status=status)


@router.get("/donations/{donation_id}", response_model=Donation, tags=["Donations"])
def get_donation_by_id(donation_id: str) -> Donation:
    """Retrieve a single donation batch by ID."""
    donation = store.get_donation(donation_id)
    if not donation:
        raise HTTPException(status_code=404, detail=f"Donation batch '{donation_id}' not found.")
    return donation

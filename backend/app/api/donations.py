"""Donations and perishable batches router for TheSaviour Phase 2."""

import math
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models import (
    Donation,
    DonationCreate,
    DonationUpdate,
    DonationAllocateRequest,
    DonationCategory,
    DonationStatus,
    UrgencyLevel,
    CompatibilityCheckResult,
)
from app.store import store
from app.compatibility import evaluate_compatibility

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


@router.post("/donations", response_model=Donation, status_code=status.HTTP_201_CREATED, tags=["Donations"])
def create_donation(payload: DonationCreate) -> Donation:
    """
    Register and validate a new donation batch.
    Validates quantity > 0, aid type, donor details, geo coordinates, and future deadline.
    Automatically assigns urgency level and initial unallocated quantity.
    """
    now = datetime.now(timezone.utc)

    # 1. Validate Expiry / Deadline
    try:
        expires_str = payload.expires_at.replace("Z", "+00:00")
        expires_dt = datetime.fromisoformat(expires_str)
        if expires_dt.tzinfo is None:
            expires_dt = expires_dt.replace(tzinfo=timezone.utc)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid ISO 8601 expiry timestamp '{payload.expires_at}': {str(e)}",
        )

    if expires_dt <= now:
        raise HTTPException(
            status_code=422,
            detail=f"Expiry deadline '{payload.expires_at}' has already expired. Safety invariant violated.",
        )

    safe_window_minutes = int((expires_dt - now).total_seconds() / 60)
    if safe_window_minutes <= 0:
        raise HTTPException(
            status_code=422,
            detail="Safe window duration must be at least 1 minute.",
        )

    # 2. Derive Urgency Level
    if safe_window_minutes < 60:
        urgency = UrgencyLevel.CRITICAL
    elif safe_window_minutes < 120:
        urgency = UrgencyLevel.HIGH
    elif safe_window_minutes < 240:
        urgency = UrgencyLevel.MODERATE
    else:
        urgency = UrgencyLevel.STABLE

    # 3. Validate Location Coordinates
    loc = payload.location
    if not loc.name.strip() or not loc.address.strip():
        raise HTTPException(
            status_code=422,
            detail="Donation location name and address cannot be empty.",
        )
    if not (-90.0 <= loc.latitude <= 90.0 and -180.0 <= loc.longitude <= 180.0):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid coordinates: lat={loc.latitude}, lon={loc.longitude}. Must be valid WGS84 coordinates.",
        )

    # 4. Populate mandatory requirements by category if not already specified
    reqs = list(payload.requirements)
    if payload.category == DonationCategory.REFRIGERATED_MEDICINE:
        if "has_refrigeration" not in reqs:
            reqs.append("has_refrigeration")
        if "cold_chain_icepack" not in reqs:
            reqs.append("cold_chain_icepack")
    elif payload.category == DonationCategory.INFANT_FORMULA:
        if "has_water" not in reqs:
            reqs.append("has_water")
    elif payload.category == DonationCategory.RAW_RATION_KIT:
        if "has_fuel" not in reqs:
            reqs.append("has_fuel")
        if "has_water" not in reqs:
            reqs.append("has_water")

    # 5. Suggested Parcels (Standard bike capacity is 40 units)
    suggested_parcels = max(1, math.ceil(payload.quantity / 40))

    # 6. Construct Unique ID and Domain Entity
    ts_ms = int(now.timestamp() * 1000)
    donation_id = f"batch-pune-{ts_ms % 100000}"
    donor_id = payload.donor_id or f"donor-{ts_ms % 10000}"

    new_donation = Donation(
        id=donation_id,
        donor_id=donor_id,
        donor_name=payload.donor_name.strip(),
        donor_type=payload.donor_type.strip(),
        location=loc,
        item_name=payload.item_name.strip(),
        category=payload.category,
        quantity=payload.quantity,
        remaining_quantity=payload.quantity,
        unit=payload.unit.strip(),
        ready_at=payload.ready_at or now.isoformat(),
        expires_at=expires_dt.isoformat(),
        safe_window_minutes=safe_window_minutes,
        urgency_level=urgency,
        status=DonationStatus.AVAILABLE,
        requirements=reqs,
        suggested_parcels=suggested_parcels,
        notes=payload.notes.strip() if payload.notes else None,
        created_at=now.isoformat(),
    )

    created = store.create_donation(new_donation)
    return created


@router.patch("/donations/{donation_id}", response_model=Donation, tags=["Donations"])
def update_donation(donation_id: str, payload: DonationUpdate) -> Donation:
    """Update donation batch status, unallocated remaining quantity, or notes."""
    try:
        updated = store.update_donation(
            donation_id=donation_id,
            status=payload.status,
            remaining_quantity=payload.remaining_quantity,
            notes=payload.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not updated:
        raise HTTPException(status_code=404, detail=f"Donation batch '{donation_id}' not found.")
    return updated


@router.post("/donations/{donation_id}/allocate", response_model=Donation, tags=["Donations"])
def allocate_donation(donation_id: str, payload: DonationAllocateRequest) -> Donation:
    """
    Allocate a quantity from the donation batch.
    Validates quantity > 0 and prevents over-allocation.
    Updates remaining_quantity and transitions status accordingly.
    """
    try:
        updated = store.allocate_donation(
            donation_id=donation_id,
            quantity=payload.quantity,
            shelter_id=payload.shelter_id,
            notes=payload.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not updated:
        raise HTTPException(status_code=404, detail=f"Donation batch '{donation_id}' not found.")
    return updated


@router.get("/donations/{donation_id}/compatible-shelters", response_model=List[CompatibilityCheckResult], tags=["Donations"])
def get_compatible_shelters_for_donation(donation_id: str) -> List[CompatibilityCheckResult]:
    """
    Deterministically evaluate compatibility of all registered shelters
    for this specific donation batch.
    """
    donation = store.get_donation(donation_id)
    if not donation:
        raise HTTPException(status_code=404, detail=f"Donation batch '{donation_id}' not found.")

    results: List[CompatibilityCheckResult] = []
    shelters = store.list_shelters()
    for shelter in shelters:
        res = evaluate_compatibility(
            shelter=shelter,
            category=donation.category,
            quantity=donation.remaining_quantity,
        )
        results.append(res)
    return results

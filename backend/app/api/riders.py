"""Volunteer riders router for TheSaviour Phase 2."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models import (
    Rider,
    RiderUpdate,
    RiderStatusUpdate,
)
from app.store import store

router = APIRouter()


@router.get("/riders", response_model=List[Rider], tags=["Riders"])
def get_riders(
    status: Optional[str] = Query(None, description="Filter by status: AVAILABLE, EN_ROUTE_PICKUP, etc."),
) -> List[Rider]:
    """Retrieve all volunteer two-wheeler and cargo riders."""
    return store.list_riders(status=status)


@router.get("/riders/{rider_id}", response_model=Rider, tags=["Riders"])
def get_rider_by_id(rider_id: str) -> Rider:
    """Retrieve a single rider by ID."""
    rider = store.get_rider(rider_id)
    if not rider:
        raise HTTPException(status_code=404, detail=f"Rider '{rider_id}' not found.")
    return rider


@router.patch("/riders/{rider_id}", response_model=Rider, tags=["Riders"])
def update_rider(rider_id: str, payload: RiderUpdate) -> Rider:
    """
    Update rider availability, status, carrying capacity, current load, or location.
    Enforces carrying capacity bounds and prevents capacity violations.
    """
    try:
        updated = store.update_rider(
            rider_id=rider_id,
            status=payload.status,
            capacity_units=payload.capacity_units,
            current_load=payload.current_load,
            is_active=payload.is_active,
            reliability_score=payload.reliability_score,
            location=payload.location,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not updated:
        raise HTTPException(status_code=404, detail=f"Rider '{rider_id}' not found.")
    return updated


@router.patch("/riders/{rider_id}/status", response_model=Rider, tags=["Riders"])
def update_rider_status(rider_id: str, payload: RiderStatusUpdate) -> Rider:
    """Update rider operational status (AVAILABLE, EN_ROUTE_PICKUP, SUSPECT, etc.)."""
    updated = store.update_rider(rider_id=rider_id, status=payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Rider '{rider_id}' not found.")
    return updated

"""Night shelters and relief camps router for TheSaviour Phase 2."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models import (
    Shelter,
    ShelterUpdate,
    ShelterNeedsUpdate,
    ShelterStatus,
    CompatibilityCheckResult,
)
from app.store import store
from app.compatibility import evaluate_compatibility

router = APIRouter()


@router.get("/shelters", response_model=List[Shelter], tags=["Shelters"])
def get_shelters(
    status: Optional[str] = Query(None, description="Filter by status: OPEN, AT_CAPACITY, CLOSED"),
) -> List[Shelter]:
    """Retrieve all night shelters, relief camps, and emergency centers."""
    return store.list_shelters(status=status)


@router.get("/shelters/{shelter_id}", response_model=Shelter, tags=["Shelters"])
def get_shelter_by_id(shelter_id: str) -> Shelter:
    """Retrieve a single shelter by ID."""
    shelter = store.get_shelter(shelter_id)
    if not shelter:
        raise HTTPException(status_code=404, detail=f"Shelter '{shelter_id}' not found.")
    return shelter


@router.patch("/shelters/{shelter_id}", response_model=Shelter, tags=["Shelters"])
def update_shelter(shelter_id: str, payload: ShelterUpdate) -> Shelter:
    """
    Update shelter demand, capacity, occupancy, operational capabilities, or status.
    Enforces capacity bounds, non-negative demand, and occupancy bounds.
    """
    try:
        updated = store.update_shelter(
            shelter_id=shelter_id,
            needed_meals=payload.needed_meals,
            capacity=payload.capacity,
            current_occupancy=payload.current_occupancy,
            status=payload.status,
            capabilities=payload.capabilities,
            needed_categories=payload.needed_categories,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not updated:
        raise HTTPException(status_code=404, detail=f"Shelter '{shelter_id}' not found.")
    return updated


@router.put("/shelters/{shelter_id}/needs", response_model=Shelter, tags=["Shelters"])
def update_shelter_needs(shelter_id: str, payload: ShelterNeedsUpdate) -> Shelter:
    """
    Update shelter meal demand and operational capabilities.
    Prevents negative demand and records update in event log.
    """
    try:
        updated = store.update_shelter(
            shelter_id=shelter_id,
            needed_meals=payload.needed_meals,
            capabilities=payload.capabilities,
            needed_categories=payload.needed_categories,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not updated:
        raise HTTPException(status_code=404, detail=f"Shelter '{shelter_id}' not found.")
    return updated


@router.post("/shelters/{shelter_id}/close", response_model=Shelter, tags=["Shelters"])
def close_shelter(shelter_id: str) -> Shelter:
    """Mark a shelter as CLOSED and automatically recover/reroute active parcels via Salvage Ladder."""
    shelter = store.get_shelter(shelter_id)
    if not shelter:
        raise HTTPException(status_code=404, detail=f"Shelter '{shelter_id}' not found.")
    
    from app.recovery import recover_shelter_disruption
    recover_shelter_disruption(shelter_id, is_closed=True)
    return store.get_shelter(shelter_id)


@router.post("/shelters/{shelter_id}/open", response_model=Shelter, tags=["Shelters"])
def open_shelter(shelter_id: str) -> Shelter:
    """Reopen a shelter for inbound deliveries."""
    updated = store.update_shelter(shelter_id=shelter_id, status=ShelterStatus.OPEN)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Shelter '{shelter_id}' not found.")
    return updated


@router.get("/shelters/{shelter_id}/compatible-donations", response_model=List[CompatibilityCheckResult], tags=["Shelters"])
def get_compatible_donations_for_shelter(shelter_id: str) -> List[CompatibilityCheckResult]:
    """
    Deterministically evaluate compatibility of this shelter against all available
    donation batches currently in the inventory.
    """
    shelter = store.get_shelter(shelter_id)
    if not shelter:
        raise HTTPException(status_code=404, detail=f"Shelter '{shelter_id}' not found.")

    results: List[CompatibilityCheckResult] = []
    donations = store.list_donations()
    for donation in donations:
        res = evaluate_compatibility(
            shelter=shelter,
            category=donation.category,
            quantity=donation.remaining_quantity,
        )
        results.append(res)
    return results

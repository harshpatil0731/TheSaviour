"""Automatic aid allocation and dispatch router for TheSaviour Phase 3 and Phase 5."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status

from app.models import (
    Allocation,
    AllocationStatus,
    AllocationStatusUpdate,
    AutoAllocationResponse,
)
from app.store import store
from app.allocator import run_auto_allocation
from app.recovery import transition_allocation_status

router = APIRouter()


@router.post("/allocations/auto", response_model=AutoAllocationResponse, status_code=status.HTTP_200_OK, tags=["Allocations"])
def trigger_auto_allocation() -> AutoAllocationResponse:
    """
    Execute the deterministic allocation and batch-splitting engine.
    Matches available donations with open compatible shelters and volunteer riders,
    prioritizing earliest expiry and greatest unmet demand.
    """
    result = run_auto_allocation()
    return result


@router.get("/allocations", response_model=List[Allocation], tags=["Allocations"])
def list_allocations() -> List[Allocation]:
    """Retrieve all recorded parcel allocations."""
    return store.list_allocations()


@router.get("/allocations/{allocation_id}", response_model=Allocation, tags=["Allocations"])
def get_allocation_by_id(allocation_id: str) -> Allocation:
    """Retrieve a single allocation by ID."""
    alloc = store.get_allocation(allocation_id)
    if not alloc:
        raise HTTPException(status_code=404, detail=f"Allocation '{allocation_id}' not found.")
    return alloc


@router.post("/allocations/{allocation_id}/pickup", response_model=Allocation, tags=["Dispatch Lifecycle"])
def mark_parcel_picked_up(allocation_id: str) -> Allocation:
    """Mark a parcel as picked up by the assigned courier."""
    try:
        return transition_allocation_status(allocation_id, AllocationStatus.PICKED_UP)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 422
        raise HTTPException(status_code=status_code, detail=str(e))


@router.post("/allocations/{allocation_id}/in-transit", response_model=Allocation, tags=["Dispatch Lifecycle"])
def mark_parcel_in_transit(allocation_id: str) -> Allocation:
    """Mark a parcel as actively in transit towards the destination shelter."""
    try:
        return transition_allocation_status(allocation_id, AllocationStatus.IN_TRANSIT)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 422
        raise HTTPException(status_code=status_code, detail=str(e))


@router.post("/allocations/{allocation_id}/deliver", response_model=Allocation, tags=["Dispatch Lifecycle"])
def mark_parcel_delivered(allocation_id: str) -> Allocation:
    """Confirm successful delivery of a parcel at the destination shelter."""
    try:
        return transition_allocation_status(allocation_id, AllocationStatus.DELIVERED)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 422
        raise HTTPException(status_code=status_code, detail=str(e))


@router.post("/allocations/{allocation_id}/release", response_model=Allocation, tags=["Dispatch Lifecycle"])
def mark_parcel_released(allocation_id: str) -> Allocation:
    """Voluntarily release a parcel back to inventory for fleet reassignment."""
    try:
        return transition_allocation_status(
            allocation_id,
            AllocationStatus.UNSALVAGEABLE,
            notes="Voluntarily released by courier; cargo marked for reassignment."
        )
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 422
        raise HTTPException(status_code=status_code, detail=str(e))


@router.patch("/allocations/{allocation_id}/status", response_model=Allocation, tags=["Dispatch Lifecycle"])
def update_allocation_status(allocation_id: str, payload: AllocationStatusUpdate) -> Allocation:
    """Convenience endpoint to transition an allocation's lifecycle state with validation."""
    try:
        return transition_allocation_status(
            allocation_id,
            payload.status,
            notes=payload.notes,
        )
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 422
        raise HTTPException(status_code=status_code, detail=str(e))


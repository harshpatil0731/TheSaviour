"""Automatic aid allocation and dispatch router for TheSaviour Phase 3."""

from typing import List
from fastapi import APIRouter, HTTPException, status

from app.models import (
    Allocation,
    AutoAllocationResponse,
)
from app.store import store
from app.allocator import run_auto_allocation

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
    all_allocs = store.list_allocations()
    for alloc in all_allocs:
        if alloc.id == allocation_id:
            return alloc
    raise HTTPException(status_code=404, detail=f"Allocation '{allocation_id}' not found.")

"""Volunteer riders router."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import Rider
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

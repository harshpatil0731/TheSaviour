"""Night shelters and relief camps router."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import Shelter
from app.store import store

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

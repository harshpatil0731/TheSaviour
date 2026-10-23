"""Compatibility verification router for TheSaviour Phase 2."""

from fastapi import APIRouter, HTTPException
from app.models import (
    CompatibilityCheckRequest,
    CompatibilityCheckResult,
)
from app.store import store
from app.compatibility import evaluate_compatibility

router = APIRouter()


@router.post("/compatibility/check", response_model=CompatibilityCheckResult, tags=["Compatibility"])
def check_compatibility(payload: CompatibilityCheckRequest) -> CompatibilityCheckResult:
    """
    Check deterministic compatibility between an aid category/quantity and a shelter.
    Evaluates required utility dependencies (water, fuel, cold storage), operational status,
    and capacity limits.
    """
    shelter = store.get_shelter(payload.shelter_id)
    if not shelter:
        raise HTTPException(status_code=404, detail=f"Shelter '{payload.shelter_id}' not found.")

    return evaluate_compatibility(
        shelter=shelter,
        category=payload.category,
        quantity=payload.quantity,
    )

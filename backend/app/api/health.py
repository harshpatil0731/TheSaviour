"""Health check router."""

from fastapi import APIRouter
from app.models import HealthResponse
from app.store import store

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
def get_health() -> HealthResponse:
    """Return system health status and active in-memory record counts."""
    return store.get_health()

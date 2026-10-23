"""Dashboard summary and aggregates router."""

from fastapi import APIRouter
from app.models import DashboardResponse
from app.store import store

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse, tags=["Dashboard"])
def get_dashboard() -> DashboardResponse:
    """
    Get aggregated dashboard metrics for TheSaviour:
    - Summary metrics (available donations, active deliveries, urgent batches, available riders)
    - High-urgency donation batches
    - Recent operational activities
    - Fleet and shelter snapshots
    """
    return store.get_dashboard_data()

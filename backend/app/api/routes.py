"""Delivery route calculation router for TheSaviour."""

from fastapi import APIRouter
from app.routes_service import (
    RouteCalculationRequest,
    RouteCalculationResponse,
    calculate_delivery_route,
    get_server_google_maps_key,
)

router = APIRouter()


@router.post("/routes/calculate", response_model=RouteCalculationResponse, tags=["Routes"])
def compute_route(payload: RouteCalculationRequest) -> RouteCalculationResponse:
    """
    Calculate delivery route between donor pickup point and shelter destination.
    Uses Google Routes API if server key is configured in root .env;
    otherwise provides clearly labeled straight-line geodesic fallback with Haversine distance.
    """
    return calculate_delivery_route(
        origin_lat=payload.origin_lat,
        origin_lng=payload.origin_lng,
        dest_lat=payload.dest_lat,
        dest_lng=payload.dest_lng,
    )


@router.get("/routes/config", tags=["Routes"])
def get_map_config():
    """Retrieve map configuration status and corridor center."""
    has_key = get_server_google_maps_key() is not None
    return {
        "has_server_google_maps_key": has_key,
        "default_center": {
            "name": "Pune City Center",
            "latitude": 18.5204,
            "longitude": 73.8567,
        },
        "default_zoom": 12,
        "region": "Pune Relief Corridor, Maharashtra",
    }

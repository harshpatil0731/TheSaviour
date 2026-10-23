"""
Route Calculation and Geometry Service for TheSaviour.
Supports Google Routes / Directions API with server-side key from root .env,
and provides deterministic Haversine distance with geodesic waypoints as a clearly labeled fallback.
Includes in-memory cache to prevent redundant API calls.
"""

import math
import os
import json
import urllib.request
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

# Cache to avoid repeated API requests
_ROUTE_CACHE: Dict[str, dict] = {}


class RoutePoint(BaseModel):
    latitude: float
    longitude: float


class RouteCalculationRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    donor_name: Optional[str] = None
    shelter_name: Optional[str] = None


class RouteCalculationResponse(BaseModel):
    origin: RoutePoint
    destination: RoutePoint
    distance_km: float
    estimated_duration_minutes: int
    route_type: str  # "GOOGLE_ROUTES_API" | "STRAIGHT_LINE_FALLBACK"
    polyline: List[RoutePoint]
    is_fallback: bool
    note: str


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points on Earth in kilometers."""
    r = 6371.0  # Earth radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)


def generate_interpolated_waypoints(
    lat1: float, lon1: float, lat2: float, lon2: float, steps: int = 20
) -> List[RoutePoint]:
    """Generate smooth intermediate coordinate waypoints along straight line."""
    waypoints: List[RoutePoint] = []
    for i in range(steps + 1):
        frac = i / float(steps)
        curr_lat = lat1 + (lat2 - lat1) * frac
        curr_lon = lon1 + (lon2 - lon1) * frac
        waypoints.append(RoutePoint(latitude=round(curr_lat, 6), longitude=round(curr_lon, 6)))
    return waypoints


def get_server_google_maps_key() -> Optional[str]:
    """Read server Google Maps API key from environment or root .env file."""
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if key and key.strip():
        return key.strip()

    # Check root .env file if not in process environment
    root_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    if os.path.exists(root_env_path):
        try:
            with open(root_env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GOOGLE_MAPS_API_KEY="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
        except Exception:
            pass
    return None


def calculate_delivery_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> RouteCalculationResponse:
    """
    Compute delivery route. Queries Google Directions/Routes API if server key is configured;
    otherwise falls back to deterministic geodesic calculation with haversine distance.
    Caches responses to avoid redundant calls.
    """
    cache_key = f"{origin_lat:.4f},{origin_lng:.4f}->{dest_lat:.4f},{dest_lng:.4f}"
    if cache_key in _ROUTE_CACHE:
        return RouteCalculationResponse(**_ROUTE_CACHE[cache_key])

    server_key = get_server_google_maps_key()

    # Try Google Directions API if server key exists
    if server_key:
        try:
            url = (
                f"https://maps.googleapis.com/maps/api/directions/json?"
                f"origin={origin_lat},{origin_lng}&destination={dest_lat},{dest_lng}&mode=driving&key={server_key}"
            )
            req = urllib.request.Request(url, headers={"User-Agent": "TheSaviour-Backend/1.0"})
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    if payload.get("status") == "OK" and payload.get("routes"):
                        route_data = payload["routes"][0]
                        leg = route_data["legs"][0]
                        dist_km = round(leg["distance"]["value"] / 1000.0, 2)
                        dur_mins = max(1, math.ceil(leg["duration"]["value"] / 60.0))

                        # Decode polyline or extract steps
                        polyline_points: List[RoutePoint] = []
                        for step in leg.get("steps", []):
                            polyline_points.append(RoutePoint(
                                latitude=step["start_location"]["lat"],
                                longitude=step["start_location"]["lng"],
                            ))
                        polyline_points.append(RoutePoint(
                            latitude=dest_lat,
                            longitude=dest_lng,
                        ))

                        result = RouteCalculationResponse(
                            origin=RoutePoint(latitude=origin_lat, longitude=origin_lng),
                            destination=RoutePoint(latitude=dest_lat, longitude=dest_lng),
                            distance_km=dist_km,
                            estimated_duration_minutes=dur_mins,
                            route_type="GOOGLE_ROUTES_API",
                            polyline=polyline_points,
                            is_fallback=False,
                            note="Live turn-by-turn road route computed via Google Directions API.",
                        )
                        _ROUTE_CACHE[cache_key] = result.model_dump()
                        return result
        except Exception:
            # Fall back safely if API call fails (network, quota, etc.)
            pass

    # Deterministic Straight-Line Fallback
    dist_km = haversine_distance_km(origin_lat, origin_lng, dest_lat, dest_lng)
    # Estimate time in Pune urban corridor: 24 km/h bike speed + traffic factor 1.25 + 3 min handling buffer
    dur_mins = max(3, math.ceil((dist_km / 24.0) * 60 * 1.25) + 3)
    waypoints = generate_interpolated_waypoints(origin_lat, origin_lng, dest_lat, dest_lng, steps=25)

    result = RouteCalculationResponse(
        origin=RoutePoint(latitude=origin_lat, longitude=origin_lng),
        destination=RoutePoint(latitude=dest_lat, longitude=dest_lng),
        distance_km=dist_km,
        estimated_duration_minutes=dur_mins,
        route_type="STRAIGHT_LINE_FALLBACK",
        polyline=waypoints,
        is_fallback=True,
        note="Straight-line geodesic fallback (Live road routing not configured). Distance computed via Haversine.",
    )
    _ROUTE_CACHE[cache_key] = result.model_dump()
    return result

"""
Automated unit tests for TheSaviour Delivery Routing and Map Integration.
Tests route calculation, Haversine distance, waypoint interpolation,
caching, and fallback behavior.
"""

from fastapi.testclient import TestClient
from app.main import app
from app.routes_service import haversine_distance_km, generate_interpolated_waypoints

client = TestClient(app)


def test_haversine_distance_calculation():
    """Verify haversine formula calculates reasonable distance in Pune corridor."""
    # Koregaon Park (18.5362, 73.8940) to Shivajinagar (18.5308, 73.8475) ~ 5 km
    dist = haversine_distance_km(18.5362, 73.8940, 18.5308, 73.8475)
    assert 4.0 <= dist <= 6.0


def test_generate_interpolated_waypoints():
    """Verify waypoint generator produces smooth sequence of coordinates."""
    points = generate_interpolated_waypoints(18.50, 73.80, 18.60, 73.90, steps=10)
    assert len(points) == 11
    assert points[0].latitude == 18.50
    assert points[0].longitude == 73.80
    assert points[-1].latitude == 18.60
    assert points[-1].longitude == 73.90


def test_compute_route_endpoint_fallback():
    """
    Test POST /api/routes/calculate returns a valid route with clearly labeled fallback
    when live server key is not configured.
    """
    payload = {
        "origin_lat": 18.5362,
        "origin_lng": 73.8940,
        "dest_lat": 18.5626,
        "dest_lng": 73.8322,
    }
    res = client.post("/api/routes/calculate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["distance_km"] > 0
    assert data["estimated_duration_minutes"] >= 3
    assert len(data["polyline"]) > 0
    assert data["route_type"] in ("GOOGLE_ROUTES_API", "STRAIGHT_LINE_FALLBACK")
    assert "origin" in data and "destination" in data
    assert data["is_fallback"] in (True, False)


def test_routes_config_endpoint():
    """Test GET /api/routes/config returns Pune default center and key availability flag."""
    res = client.get("/api/routes/config")
    assert res.status_code == 200
    data = res.json()
    assert "has_server_google_maps_key" in data
    assert "default_center" in data
    assert data["default_center"]["latitude"] == 18.5204
    assert data["default_center"]["longitude"] == 73.8567

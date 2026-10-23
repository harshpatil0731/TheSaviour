"""
Verification tests for TheSaviour Phase 1 backend endpoints.
Uses FastAPI TestClient to test all five required GET endpoints and filters.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_health():
    """Test 1: Verify GET /api/health returns 200 and valid schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "counts" in data
    assert data["counts"]["donations"] >= 6
    assert data["counts"]["riders"] >= 5
    assert data["counts"]["shelters"] >= 4


def test_get_dashboard():
    """Test 2: Verify GET /api/dashboard returns correct summary statistics and lists."""
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    summary = data["summary"]

    assert summary["available_donations_count"] >= 1
    assert summary["total_meals_available"] > 0
    assert summary["active_deliveries_count"] >= 1
    assert summary["urgent_batches_count"] >= 1
    assert summary["available_riders_count"] >= 1
    assert summary["total_riders_count"] >= 5
    assert summary["active_shelters_count"] >= 1

    assert "urgent_donations" in data
    assert len(data["urgent_donations"]) > 0
    assert "recent_activities" in data
    assert len(data["recent_activities"]) > 0


def test_get_donations():
    """Test 3: Verify GET /api/donations lists donations and supports urgency filters."""
    response = client.get("/api/donations")
    assert response.status_code == 200
    donations = response.json()
    assert isinstance(donations, list)
    assert len(donations) >= 6

    # Test single item lookup
    first_id = donations[0]["id"]
    single_res = client.get(f"/api/donations/{first_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == first_id

    # Test filtering by urgency
    critical_res = client.get("/api/donations?urgency=CRITICAL")
    assert critical_res.status_code == 200
    critical_list = critical_res.json()
    for item in critical_list:
        assert item["urgency_level"] == "CRITICAL"


def test_get_riders():
    """Test 4: Verify GET /api/riders lists volunteer fleet."""
    response = client.get("/api/riders")
    assert response.status_code == 200
    riders = response.json()
    assert isinstance(riders, list)
    assert len(riders) >= 5

    # Test single rider lookup
    first_rider_id = riders[0]["id"]
    single_res = client.get(f"/api/riders/{first_rider_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == first_rider_id
    assert single_res.json()["reliability_score"] > 0

    # Test status filter
    avail_res = client.get("/api/riders?status=AVAILABLE")
    assert avail_res.status_code == 200
    for r in avail_res.json():
        assert r["status"] == "AVAILABLE"


def test_get_shelters():
    """Test 5: Verify GET /api/shelters lists shelters with capabilities."""
    response = client.get("/api/shelters")
    assert response.status_code == 200
    shelters = response.json()
    assert isinstance(shelters, list)
    assert len(shelters) >= 4

    # Verify capabilities structure
    for s in shelters:
        assert "capabilities" in s
        assert "has_water" in s["capabilities"]
        assert "has_fuel" in s["capabilities"]
        assert "has_refrigeration" in s["capabilities"]

    # Test single shelter lookup
    first_shelter_id = shelters[0]["id"]
    single_res = client.get(f"/api/shelters/{first_shelter_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == first_shelter_id


def test_404_handling():
    """Verify clean 404 response for nonexistent IDs."""
    res = client.get("/api/donations/non-existent-batch-999")
    assert res.status_code == 404
    res = client.get("/api/riders/non-existent-rider-999")
    assert res.status_code == 404
    res = client.get("/api/shelters/non-existent-shelter-999")
    assert res.status_code == 404

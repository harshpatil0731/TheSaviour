"""
Comprehensive automated tests for TheSaviour Phase 2:
- Successful donation batch creation and remaining unallocated quantity tracking
- Validation checks (invalid quantities, past deadline, missing fields, invalid coordinates)
- Shelter demand and operational capability updates
- Negative demand, capacity violations, and shelter open/close
- Rider availability, carrying capacity updates, and load violations
- Deterministic aid compatibility engine
- Resource not found (404) error handling
"""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_store_state():
    """Ensure clean initial store state before each test."""
    store.reset_to_demo_data()


# ============================================================================
# 1. DONATION CREATION & VALIDATION TESTS
# ============================================================================

def test_create_donation_success():
    """Test successful creation of a donation batch with valid fields and future expiry."""
    future_time = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    payload = {
        "donor_name": "Deccan Gymkhana Community Hall",
        "donor_type": "Banquet Hall",
        "item_name": "Fresh Pulao and Paneer Curry",
        "category": "cooked_meal",
        "quantity": 100,
        "unit": "meals",
        "location": {
            "name": "Deccan Gymkhana",
            "address": "Prabhat Road, Deccan, Pune 411004",
            "latitude": 18.5167,
            "longitude": 73.8415,
        },
        "expires_at": future_time,
        "notes": "Packed in thermal containers.",
    }

    response = client.post("/api/donations", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["item_name"] == "Fresh Pulao and Paneer Curry"
    assert data["quantity"] == 100
    assert data["remaining_quantity"] == 100
    assert data["status"] == "AVAILABLE"
    assert data["urgency_level"] == "MODERATE"
    assert data["safe_window_minutes"] > 120
    assert data["suggested_parcels"] == 3  # ceil(100 / 40)
    assert "batch-pune-" in data["id"]

    # Verify donation is accessible via GET
    get_res = client.get(f"/api/donations/{data['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["donor_name"] == "Deccan Gymkhana Community Hall"


def test_create_donation_invalid_quantity():
    """Test rejection of zero or negative donation quantities."""
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    base_payload = {
        "donor_name": "Test Donor",
        "donor_type": "Restaurant",
        "item_name": "Surplus Rice",
        "category": "cooked_meal",
        "quantity": 0,  # Invalid
        "unit": "meals",
        "location": {
            "name": "Camp Area",
            "address": "MG Road, Pune",
            "latitude": 18.5204,
            "longitude": 73.8567,
        },
        "expires_at": future_time,
    }

    # Zero quantity
    res_zero = client.post("/api/donations", json=base_payload)
    assert res_zero.status_code == 422

    # Negative quantity
    base_payload["quantity"] = -25
    res_neg = client.post("/api/donations", json=base_payload)
    assert res_neg.status_code == 422


def test_create_donation_past_expiry():
    """Test rejection when expiry deadline has already passed."""
    past_time = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    payload = {
        "donor_name": "Past Donor",
        "donor_type": "Mess",
        "item_name": "Leftover Dal",
        "category": "cooked_meal",
        "quantity": 50,
        "unit": "meals",
        "location": {
            "name": "Kothrud",
            "address": "Paud Road, Pune",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
        "expires_at": past_time,
    }

    response = client.post("/api/donations", json=payload)
    assert response.status_code == 422
    assert "expired" in response.json()["detail"].lower()


def test_create_donation_invalid_coordinates_and_blank_fields():
    """Test validation of WGS84 coordinates and non-empty strings."""
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    payload = {
        "donor_name": "Valid Donor",
        "donor_type": "Restaurant",
        "item_name": "Sandwiches",
        "category": "cooked_meal",
        "quantity": 40,
        "unit": "meals",
        "location": {
            "name": "   ",  # Blank name
            "address": "MG Road, Pune",
            "latitude": 195.0,  # Invalid latitude (>90)
            "longitude": 73.8567,
        },
        "expires_at": future_time,
    }

    response = client.post("/api/donations", json=payload)
    assert response.status_code == 422


def test_create_donation_invalid_category():
    """Test rejection of non-existent donation categories."""
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    payload = {
        "donor_name": "Donor",
        "donor_type": "Restaurant",
        "item_name": "Electronics",
        "category": "invalid_aid_category",
        "quantity": 10,
        "unit": "items",
        "location": {
            "name": "Swargate",
            "address": "Tilak Road, Pune",
            "latitude": 18.5018,
            "longitude": 73.8586,
        },
        "expires_at": future_time,
    }

    response = client.post("/api/donations", json=payload)
    assert response.status_code == 422


# ============================================================================
# 2. UNALLOCATED QUANTITY TRACKING & ALLOCATION
# ============================================================================

def test_allocation_and_status_transitions():
    """Test partial allocation, remaining quantity decrement, and status change to FULLY_ASSIGNED."""
    # Seed batch-pune-101 has quantity 180 and remaining_quantity 180
    donation_id = "batch-pune-101"

    # 1. Partial allocation: allocate 80 out of 180
    res1 = client.post(f"/api/donations/{donation_id}/allocate", json={"quantity": 80, "shelter_id": "shelter-pune-301"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["remaining_quantity"] == 100
    assert data1["status"] == "PARTIALLY_ASSIGNED"

    # 2. Second allocation: allocate remaining 100
    res2 = client.post(f"/api/donations/{donation_id}/allocate", json={"quantity": 100, "shelter_id": "shelter-pune-302"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["remaining_quantity"] == 0
    assert data2["status"] == "FULLY_ASSIGNED"

    # 3. Over-allocation attempt: try allocating when 0 remain
    res3 = client.post(f"/api/donations/{donation_id}/allocate", json={"quantity": 10})
    assert res3.status_code == 422
    assert "unallocated" in res3.json()["detail"].lower()


def test_allocation_invalid_quantities():
    """Test rejection of non-positive allocation amounts."""
    res_zero = client.post("/api/donations/batch-pune-101/allocate", json={"quantity": 0})
    assert res_zero.status_code == 422

    res_neg = client.post("/api/donations/batch-pune-101/allocate", json={"quantity": -10})
    assert res_neg.status_code == 422


# ============================================================================
# 3. SHELTER DEMAND, CAPABILITIES & STATUS MANAGEMENT
# ============================================================================

def test_update_shelter_demand_and_capabilities():
    """Test updating shelter demand, capacity, occupancy, and capabilities."""
    shelter_id = "shelter-pune-301"
    payload = {
        "needed_meals": 120,
        "capacity": 250,
        "current_occupancy": 160,
        "capabilities": {
            "has_water": True,
            "has_fuel": True,
            "has_refrigeration": True,
        },
    }

    res = client.patch(f"/api/shelters/{shelter_id}", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["needed_meals"] == 120
    assert data["capacity"] == 250
    assert data["current_occupancy"] == 160
    assert data["capabilities"]["has_refrigeration"] is True


def test_update_shelter_needs_endpoint():
    """Test PUT /api/shelters/{id}/needs updates demand and records activity."""
    shelter_id = "shelter-pune-302"
    payload = {
        "needed_meals": 95,
        "capabilities": {
            "has_water": True,
            "has_fuel": False,
            "has_refrigeration": False,
        },
    }

    res = client.put(f"/api/shelters/{shelter_id}/needs", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["needed_meals"] == 95
    assert data["capabilities"]["has_fuel"] is False


def test_prevent_negative_shelter_demand():
    """Test that negative shelter needed_meals is rejected."""
    res = client.patch("/api/shelters/shelter-pune-301", json={"needed_meals": -20})
    assert res.status_code == 422


def test_prevent_shelter_capacity_violations():
    """Test that occupancy exceeding capacity or capacity less than occupancy is rejected."""
    # Attempt to set current_occupancy (300) > capacity (200)
    res1 = client.patch("/api/shelters/shelter-pune-301", json={"current_occupancy": 300, "capacity": 200})
    assert res1.status_code == 422
    assert "exceed" in res1.json()["detail"].lower()

    # Attempt to lower capacity (50) below existing current_occupancy (110)
    res2 = client.patch("/api/shelters/shelter-pune-301", json={"capacity": 50})
    assert res2.status_code == 422


def test_shelter_open_and_close():
    """Test closing and reopening a shelter."""
    shelter_id = "shelter-pune-301"

    # Close shelter
    res_close = client.post(f"/api/shelters/{shelter_id}/close")
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "CLOSED"

    # Reopen shelter
    res_open = client.post(f"/api/shelters/{shelter_id}/open")
    assert res_open.status_code == 200
    assert res_open.json()["status"] == "OPEN"


# ============================================================================
# 4. RIDER AVAILABILITY & CAPACITY MANAGEMENT
# ============================================================================

def test_update_rider_status_and_capacity():
    """Test updating rider status and carrying capacity."""
    rider_id = "rider-pune-201"
    payload = {
        "status": "EN_ROUTE_PICKUP",
        "capacity_units": 60,
        "current_load": 40,
    }

    res = client.patch(f"/api/riders/{rider_id}", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "EN_ROUTE_PICKUP"
    assert data["capacity_units"] == 60
    assert data["current_load"] == 40


def test_prevent_rider_capacity_violations():
    """Test rejection of non-positive capacity or current load exceeding capacity."""
    rider_id = "rider-pune-201"

    # Zero capacity
    res_zero = client.patch(f"/api/riders/{rider_id}", json={"capacity_units": 0})
    assert res_zero.status_code == 422

    # Load exceeds capacity
    res_over = client.patch(f"/api/riders/{rider_id}", json={"capacity_units": 40, "current_load": 65})
    assert res_over.status_code == 422
    assert "exceed" in res_over.json()["detail"].lower()


def test_update_rider_status_convenience_endpoint():
    """Test PATCH /api/riders/{id}/status."""
    rider_id = "rider-pune-202"
    res = client.patch(f"/api/riders/{rider_id}/status", json={"status": "AVAILABLE"})
    assert res.status_code == 200
    assert res.json()["status"] == "AVAILABLE"


# ============================================================================
# 5. DETERMINISTIC AID COMPATIBILITY ENGINE
# ============================================================================

def test_infant_formula_requires_clean_water():
    """Infant formula requires water: shelter without water must fail compatibility."""
    shelter_id = "shelter-pune-302"  # In seed data, shelter-302 has has_water=True, has_fuel=False

    # Check initially when shelter has water
    res1 = client.post("/api/compatibility/check", json={
        "category": "infant_formula",
        "shelter_id": shelter_id,
        "quantity": 30,
    })
    assert res1.status_code == 200
    assert res1.json()["is_compatible"] is True

    # Disable water capability on shelter
    client.patch(f"/api/shelters/{shelter_id}", json={
        "capabilities": {"has_water": False, "has_fuel": False, "has_refrigeration": False}
    })

    # Check again: must now fail compatibility
    res2 = client.post("/api/compatibility/check", json={
        "category": "infant_formula",
        "shelter_id": shelter_id,
        "quantity": 30,
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_compatible"] is False
    assert "has_water" in data2["missing_capabilities"]


def test_raw_ration_kit_requires_fuel_and_water():
    """Raw ration kits require fuel and water: shelter without fuel must fail compatibility."""
    shelter_id = "shelter-pune-302"  # has_water=True, has_fuel=False in seed data

    res = client.post("/api/compatibility/check", json={
        "category": "raw_ration_kit",
        "shelter_id": shelter_id,
        "quantity": 50,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_compatible"] is False
    assert "has_fuel" in data["missing_capabilities"]


def test_refrigerated_medicine_requires_cold_storage():
    """Refrigerated medicine requires cold storage."""
    # shelter-pune-301 has has_refrigeration=False in seed data
    res_no_fridge = client.post("/api/compatibility/check", json={
        "category": "refrigerated_medicine",
        "shelter_id": "shelter-pune-301",
        "quantity": 20,
    })
    assert res_no_fridge.status_code == 200
    assert res_no_fridge.json()["is_compatible"] is False
    assert "has_refrigeration" in res_no_fridge.json()["missing_capabilities"]

    # shelter-pune-303 has has_refrigeration=True in seed data
    res_fridge = client.post("/api/compatibility/check", json={
        "category": "refrigerated_medicine",
        "shelter_id": "shelter-pune-303",
        "quantity": 20,
    })
    assert res_fridge.status_code == 200
    assert res_fridge.json()["is_compatible"] is True


def test_closed_shelter_incompatible():
    """A closed shelter cannot accept any aid regardless of category."""
    shelter_id = "shelter-pune-304"
    # Close shelter first
    client.post(f"/api/shelters/{shelter_id}/close")

    res = client.post("/api/compatibility/check", json={
        "category": "cooked_meal",
        "shelter_id": shelter_id,
        "quantity": 25,
    })
    assert res.status_code == 200
    assert res.json()["is_compatible"] is False
    assert "closed" in res.json()["reasons"][0].lower()


def test_get_compatible_shelters_for_donation():
    """Test querying all evaluated shelters for a specific donation batch."""
    res = client.get("/api/donations/batch-pune-103/compatible-shelters")  # batch-103 is refrigerated medicine
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 4

    # shelter-pune-303 has refrigeration in seed data
    shelter_303_res = next(r for r in results if r["shelter_id"] == "shelter-pune-303")
    assert shelter_303_res["is_compatible"] is True

    shelter_301_res = next(r for r in results if r["shelter_id"] == "shelter-pune-301")
    assert shelter_301_res["is_compatible"] is False
    assert "has_refrigeration" in shelter_301_res["missing_capabilities"]


# ============================================================================
# 6. RESOURCE NOT FOUND (404) TESTS
# ============================================================================

def test_missing_resources_return_404():
    """Verify 404 responses for non-existent IDs."""
    assert client.get("/api/donations/nonexistent-batch").status_code == 404
    assert client.patch("/api/donations/nonexistent-batch", json={"notes": "test"}).status_code == 404
    assert client.post("/api/donations/nonexistent-batch/allocate", json={"quantity": 10}).status_code == 404
    assert client.get("/api/donations/nonexistent-batch/compatible-shelters").status_code == 404

    assert client.get("/api/shelters/nonexistent-shelter").status_code == 404
    assert client.patch("/api/shelters/nonexistent-shelter", json={"needed_meals": 50}).status_code == 404
    assert client.post("/api/shelters/nonexistent-shelter/close").status_code == 404

    assert client.get("/api/riders/nonexistent-rider").status_code == 404
    assert client.patch("/api/riders/nonexistent-rider", json={"status": "AVAILABLE"}).status_code == 404

    assert client.post("/api/compatibility/check", json={
        "category": "cooked_meal",
        "shelter_id": "nonexistent-shelter",
    }).status_code == 404

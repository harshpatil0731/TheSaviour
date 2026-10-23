"""
Automated test suite for TheSaviour Phase 3:
- Automatic batch splitting and intelligent allocation engine
- Expiry deadline priority (least safe window prioritized)
- Multi-shelter parcel splitting (e.g. 180 meals partitioned across shelters)
- Shelter demand and physical capacity limits (holds placed, demand decremented)
- Courier carrying capacity limits and status transitions
- Incompatible aid rejection and closed shelter exclusion
- Insufficient available riders handling
- Partial allocation leaving remaining quantity available
- Idempotency, repeated requests, and double-allocation prevention
- No valid allocation scenario
"""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models import (
    Donation,
    DonationCategory,
    DonationStatus,
    Location,
    Rider,
    RiderStatus,
    Shelter,
    ShelterCapabilities,
    ShelterStatus,
    UrgencyLevel,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_store_state():
    """Ensure clean store before each test."""
    store.reset_to_demo_data()


# ============================================================================
# 1. SUCCESSFUL AUTO-ALLOCATION & BATCH SPLITTING
# ============================================================================

def test_auto_allocation_success_and_batch_splitting():
    """
    Test that calling POST /api/allocations/auto matches donations to shelters and riders,
    correctly splitting large batches across multiple couriers and shelters.
    """
    response = client.post("/api/allocations/auto")
    assert response.status_code == 200
    data = response.json()

    assert data["total_allocations_created"] > 0
    assert data["total_quantity_allocated"] > 0
    assert len(data["allocations"]) == data["total_allocations_created"]

    # Verify allocation structure
    first_alloc = data["allocations"][0]
    assert "alloc-" in first_alloc["id"]
    assert first_alloc["donation_id"] != ""
    assert first_alloc["shelter_id"] != ""
    assert first_alloc["rider_id"] != ""
    assert first_alloc["quantity"] > 0
    assert first_alloc["status"] == "ALLOCATED"
    assert "Matched" in first_alloc["reason"]

    # Verify allocations are saved in store and accessible via GET /api/allocations
    get_res = client.get("/api/allocations")
    assert get_res.status_code == 200
    assert len(get_res.json()) >= data["total_allocations_created"]


def test_donation_split_across_multiple_shelters():
    """
    Explicit test for Handout Worked Example:
    A bulk donation of 180 meals is split between Shelter A (e.g. 100) and Shelter B (e.g. 80).
    """
    store._donations.clear()
    store._shelters.clear()
    store._riders.clear()
    store._allocations.clear()

    future_exp = (datetime.now(timezone.utc) + timedelta(minutes=60)).isoformat()

    # 1. Single large donation: 180 meals
    store.create_donation(
        Donation(
            id="batch-split-test",
            donor_id="donor-split",
            donor_name="Central Banquet",
            donor_type="Banquet Hall",
            location=Location(name="Center", address="Main St", latitude=18.52, longitude=73.85),
            item_name="Biryani Feast",
            category=DonationCategory.COOKED_MEAL,
            quantity=180,
            remaining_quantity=180,
            unit="meals",
            ready_at="2026-10-23T12:00:00Z",
            expires_at=future_exp,
            safe_window_minutes=60,
            urgency_level=UrgencyLevel.HIGH,
            status=DonationStatus.AVAILABLE,
            requirements=[],
            created_at="2026-10-23T12:00:00Z",
        )
    )

    # 2. Two shelters: Shelter 1 needs 100, Shelter 2 needs 80
    store.update_shelter(
        shelter_id="shelter-alpha",
        needed_meals=100,
        capacity=150,
        current_occupancy=50,
        status=ShelterStatus.OPEN,
        capabilities=ShelterCapabilities(has_water=True, has_fuel=True, has_refrigeration=False),
    )
    # Manually register the two test shelters
    shelter1 = Shelter(
        id="shelter-alpha",
        name="Shelter Alpha",
        contact_person="Person A",
        phone="111",
        location=Location(name="Loc A", address="A St", latitude=18.53, longitude=73.84),
        status=ShelterStatus.OPEN,
        capacity=150,
        current_occupancy=50,
        needed_meals=100,
        capabilities=ShelterCapabilities(has_water=True, has_fuel=True, has_refrigeration=False),
    )
    shelter2 = Shelter(
        id="shelter-beta",
        name="Shelter Beta",
        contact_person="Person B",
        phone="222",
        location=Location(name="Loc B", address="B St", latitude=18.54, longitude=73.86),
        status=ShelterStatus.OPEN,
        capacity=120,
        current_occupancy=40,
        needed_meals=80,
        capabilities=ShelterCapabilities(has_water=True, has_fuel=True, has_refrigeration=False),
    )
    store._shelters = {"shelter-alpha": shelter1, "shelter-beta": shelter2}

    # 3. Four riders to handle the 4 parcels
    r1 = Rider(
        id="rider-1", name="Rider One", phone="1", vehicle_type="Bike",
        capacity_units=60, current_load=0, status=RiderStatus.AVAILABLE,
        location=Location(name="L1", address="A1", latitude=18.5, longitude=73.8),
        reliability_score=0.99, completed_deliveries=10, last_heartbeat_at="2026-10-23T12:00:00Z",
    )
    r2 = Rider(
        id="rider-2", name="Rider Two", phone="2", vehicle_type="Bike",
        capacity_units=60, current_load=0, status=RiderStatus.AVAILABLE,
        location=Location(name="L2", address="A2", latitude=18.5, longitude=73.8),
        reliability_score=0.95, completed_deliveries=8, last_heartbeat_at="2026-10-23T12:00:00Z",
    )
    r3 = Rider(
        id="rider-3", name="Rider Three", phone="3", vehicle_type="Bike",
        capacity_units=60, current_load=0, status=RiderStatus.AVAILABLE,
        location=Location(name="L3", address="A3", latitude=18.5, longitude=73.8),
        reliability_score=0.90, completed_deliveries=5, last_heartbeat_at="2026-10-23T12:00:00Z",
    )
    r4 = Rider(
        id="rider-4", name="Rider Four", phone="4", vehicle_type="Bike",
        capacity_units=60, current_load=0, status=RiderStatus.AVAILABLE,
        location=Location(name="L4", address="A4", latitude=18.5, longitude=73.8),
        reliability_score=0.88, completed_deliveries=4, last_heartbeat_at="2026-10-23T12:00:00Z",
    )
    store._riders = {"rider-1": r1, "rider-2": r2, "rider-3": r3, "rider-4": r4}

    # Run auto-allocation
    res = client.post("/api/allocations/auto")
    assert res.status_code == 200
    data = res.json()

    assert data["total_quantity_allocated"] == 180
    assert data["total_allocations_created"] >= 3

    # Verify the batch is now FULLY_ASSIGNED with 0 remaining
    don = store.get_donation("batch-split-test")
    assert don.remaining_quantity == 0
    assert don.status == DonationStatus.FULLY_ASSIGNED

    # Verify parcels were distributed between shelter-alpha and shelter-beta
    dest_shelters = {a["shelter_id"] for a in data["allocations"]}
    assert "shelter-alpha" in dest_shelters
    assert "shelter-beta" in dest_shelters


# ============================================================================
# 2. PRIORITIZATION: EARLIEST EXPIRY FIRST
# ============================================================================

def test_earliest_expiry_allocated_first():
    """
    When riders/shelters are scarce, the donation expiring soonest (least safe window)
    must be allocated before a donation with a longer expiry window.
    """
    store._donations.clear()
    store._shelters.clear()
    store._riders.clear()
    store._allocations.clear()

    now = datetime.now(timezone.utc)

    # Urgent donation: expires in 30 mins
    d_urgent = Donation(
        id="batch-urgent-30m",
        donor_id="d1", donor_name="Urgent Mess", donor_type="Mess",
        location=Location(name="Loc1", address="Addr1", latitude=18.5, longitude=73.8),
        item_name="Urgent Curry", category=DonationCategory.COOKED_MEAL,
        quantity=40, remaining_quantity=40, unit="meals",
        ready_at=now.isoformat(), expires_at=(now + timedelta(minutes=30)).isoformat(),
        safe_window_minutes=30, urgency_level=UrgencyLevel.CRITICAL, status=DonationStatus.AVAILABLE,
        requirements=[], created_at=now.isoformat(),
    )

    # Later donation: expires in 180 mins
    d_later = Donation(
        id="batch-later-180m",
        donor_id="d2", donor_name="Later Mess", donor_type="Mess",
        location=Location(name="Loc2", address="Addr2", latitude=18.5, longitude=73.8),
        item_name="Later Rice", category=DonationCategory.COOKED_MEAL,
        quantity=40, remaining_quantity=40, unit="meals",
        ready_at=now.isoformat(), expires_at=(now + timedelta(minutes=180)).isoformat(),
        safe_window_minutes=180, urgency_level=UrgencyLevel.MODERATE, status=DonationStatus.AVAILABLE,
        requirements=[], created_at=now.isoformat(),
    )
    store._donations = {"batch-later-180m": d_later, "batch-urgent-30m": d_urgent}

    # Only 1 shelter with room for 40
    s1 = Shelter(
        id="s1", name="Shelter One", contact_person="C1", phone="1",
        location=Location(name="L1", address="A1", latitude=18.5, longitude=73.8),
        status=ShelterStatus.OPEN, capacity=100, current_occupancy=60, needed_meals=40,
        capabilities=ShelterCapabilities(has_water=True, has_fuel=True, has_refrigeration=False),
    )
    store._shelters = {"s1": s1}

    # Only 1 rider available
    r1 = Rider(
        id="r1", name="Solo Rider", phone="1", vehicle_type="Bike",
        capacity_units=40, current_load=0, status=RiderStatus.AVAILABLE,
        location=Location(name="L1", address="A1", latitude=18.5, longitude=73.8),
        reliability_score=0.98, completed_deliveries=10, last_heartbeat_at=now.isoformat(),
    )
    store._riders = {"r1": r1}

    res = client.post("/api/allocations/auto")
    assert res.status_code == 200
    data = res.json()

    assert data["total_allocations_created"] == 1
    # Urgent donation MUST have been the one allocated
    assert data["allocations"][0]["donation_id"] == "batch-urgent-30m"
    assert store.get_donation("batch-urgent-30m").status == DonationStatus.FULLY_ASSIGNED

    # Later donation remains unallocated
    assert store.get_donation("batch-later-180m").remaining_quantity == 40
    assert store.get_donation("batch-later-180m").status == DonationStatus.AVAILABLE


# ============================================================================
# 3. SAFETY & INCOMPATIBILITY REJECTION
# ============================================================================

def test_incompatible_aid_rejected_from_allocation():
    """
    If a donation requires clean water or cold storage, shelters without those
    capabilities must NOT be allocated that cargo.
    """
    store._donations.clear()
    store._shelters.clear()
    store._riders.clear()
    store._allocations.clear()

    now = datetime.now(timezone.utc)

    # Refrigerated medicine donation
    d_med = Donation(
        id="batch-cold-med",
        donor_id="d1", donor_name="Pharmacy", donor_type="Pharmacy",
        location=Location(name="Loc", address="Addr", latitude=18.5, longitude=73.8),
        item_name="Insulin Emergency Vials", category=DonationCategory.REFRIGERATED_MEDICINE,
        quantity=30, remaining_quantity=30, unit="vials",
        ready_at=now.isoformat(), expires_at=(now + timedelta(hours=3)).isoformat(),
        safe_window_minutes=180, urgency_level=UrgencyLevel.MODERATE, status=DonationStatus.AVAILABLE,
        requirements=["has_refrigeration"], created_at=now.isoformat(),
    )
    store._donations = {"batch-cold-med": d_med}

    # Shelter without refrigeration
    s_no_fridge = Shelter(
        id="s-no-fridge", name="Camp Without Fridge", contact_person="P", phone="1",
        location=Location(name="L", address="A", latitude=18.5, longitude=73.8),
        status=ShelterStatus.OPEN, capacity=100, current_occupancy=20, needed_meals=50,
        capabilities=ShelterCapabilities(has_water=True, has_fuel=True, has_refrigeration=False),
    )
    store._shelters = {"s-no-fridge": s_no_fridge}

    r1 = Rider(
        id="r1", name="Rider", phone="1", vehicle_type="Bike",
        capacity_units=40, current_load=0, status=RiderStatus.AVAILABLE,
        location=Location(name="L", address="A", latitude=18.5, longitude=73.8),
        reliability_score=0.9, completed_deliveries=5, last_heartbeat_at=now.isoformat(),
    )
    store._riders = {"r1": r1}

    res = client.post("/api/allocations/auto")
    assert res.status_code == 200
    data = res.json()

    # 0 allocations created because shelter lacks refrigeration!
    assert data["total_allocations_created"] == 0
    assert len(data["skipped_donations"]) == 1
    assert "compatible" in data["skipped_donations"][0]["reason"].lower()


def test_closed_shelters_excluded():
    """Shelters marked CLOSED must never receive automated allocations."""
    store._donations.clear()
    store._shelters.clear()
    store._riders.clear()
    store._allocations.clear()

    now = datetime.now(timezone.utc)
    d = Donation(
        id="batch-food", donor_id="d1", donor_name="Mess", donor_type="Mess",
        location=Location(name="L", address="A", latitude=18.5, longitude=73.8),
        item_name="Pulao", category=DonationCategory.COOKED_MEAL,
        quantity=40, remaining_quantity=40, unit="meals",
        ready_at=now.isoformat(), expires_at=(now + timedelta(hours=2)).isoformat(),
        safe_window_minutes=120, urgency_level=UrgencyLevel.HIGH, status=DonationStatus.AVAILABLE,
        requirements=[], created_at=now.isoformat(),
    )
    store._donations = {"batch-food": d}

    # Only closed shelter exists
    s_closed = Shelter(
        id="s-closed", name="Evacuated Shelter", contact_person="P", phone="1",
        location=Location(name="L", address="A", latitude=18.5, longitude=73.8),
        status=ShelterStatus.CLOSED, capacity=100, current_occupancy=0, needed_meals=50,
        capabilities=ShelterCapabilities(has_water=True, has_fuel=True, has_refrigeration=True),
    )
    store._shelters = {"s-closed": s_closed}

    r = Rider(
        id="r1", name="Rider", phone="1", vehicle_type="Bike",
        capacity_units=40, current_load=0, status=RiderStatus.AVAILABLE,
        location=Location(name="L", address="A", latitude=18.5, longitude=73.8),
        reliability_score=0.9, completed_deliveries=5, last_heartbeat_at=now.isoformat(),
    )
    store._riders = {"r1": r}

    res = client.post("/api/allocations/auto")
    assert res.status_code == 200
    assert res.json()["total_allocations_created"] == 0
    assert store.get_donation("batch-food").status == DonationStatus.AVAILABLE


# ============================================================================
# 4. CAPACITY & INSUFFICIENT RIDERS
# ============================================================================

def test_insufficient_riders_partial_allocation():
    """
    If donation needs 100 meals but only one rider with capacity 40 is available,
    it should allocate 40 and leave 60 unallocated.
    """
    store._donations.clear()
    store._shelters.clear()
    store._riders.clear()
    store._allocations.clear()

    now = datetime.now(timezone.utc)
    d = Donation(
        id="batch-large", donor_id="d1", donor_name="Mess", donor_type="Mess",
        location=Location(name="L", address="A", latitude=18.5, longitude=73.8),
        item_name="Rice & Stew", category=DonationCategory.COOKED_MEAL,
        quantity=100, remaining_quantity=100, unit="meals",
        ready_at=now.isoformat(), expires_at=(now + timedelta(hours=2)).isoformat(),
        safe_window_minutes=120, urgency_level=UrgencyLevel.HIGH, status=DonationStatus.AVAILABLE,
        requirements=[], created_at=now.isoformat(),
    )
    store._donations = {"batch-large": d}

    # Shelter needs 100
    s = Shelter(
        id="s1", name="Open Shelter", contact_person="P", phone="1",
        location=Location(name="L", address="A", latitude=18.5, longitude=73.8),
        status=ShelterStatus.OPEN, capacity=150, current_occupancy=20, needed_meals=100,
        capabilities=ShelterCapabilities(has_water=True, has_fuel=True, has_refrigeration=True),
    )
    store._shelters = {"s1": s}

    # ONLY 1 Rider with capacity 40
    r = Rider(
        id="r1", name="Rider", phone="1", vehicle_type="Bike",
        capacity_units=40, current_load=0, status=RiderStatus.AVAILABLE,
        location=Location(name="L", address="A", latitude=18.5, longitude=73.8),
        reliability_score=0.9, completed_deliveries=5, last_heartbeat_at=now.isoformat(),
    )
    store._riders = {"r1": r}

    res = client.post("/api/allocations/auto")
    assert res.status_code == 200
    data = res.json()

    assert data["total_allocations_created"] == 1
    assert data["total_quantity_allocated"] == 40
    assert data["allocations"][0]["quantity"] == 40

    # Donation is PARTIALLY_ASSIGNED with 60 remaining
    updated_d = store.get_donation("batch-large")
    assert updated_d.remaining_quantity == 60
    assert updated_d.status == DonationStatus.PARTIALLY_ASSIGNED


# ============================================================================
# 5. IDEMPOTENCY & DUPLICATE PREVENTION
# ============================================================================

def test_repeated_auto_allocation_prevents_duplicate_allocations():
    """
    Calling POST /api/allocations/auto repeatedly must NOT double-allocate
    quantities that have already been matched.
    """
    # 1. First run on seed data
    res1 = client.post("/api/allocations/auto")
    assert res1.status_code == 200
    data1 = res1.json()
    first_allocations_count = data1["total_allocations_created"]
    assert first_allocations_count > 0

    # 2. Immediate second run without new riders or donations
    res2 = client.post("/api/allocations/auto")
    assert res2.status_code == 200
    data2 = res2.json()

    # Couriers from run 1 are already committed; no double allocations!
    assert data2["total_quantity_allocated"] == 0
    assert data2["total_allocations_created"] == 0


def test_no_valid_allocation_possible_when_empty():
    """When no donations or shelters are active, returns clean explainable response."""
    store._donations.clear()
    store._shelters.clear()
    store._riders.clear()
    store._allocations.clear()

    res = client.post("/api/allocations/auto")
    assert res.status_code == 200
    data = res.json()
    assert data["total_allocations_created"] == 0
    assert data["total_quantity_allocated"] == 0
    assert "No active donations" in data["message"]

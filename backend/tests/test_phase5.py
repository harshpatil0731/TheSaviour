"""
Automated test suite for TheSaviour Phase 5:
Dispatch Recovery, Salvage Ladder, Lifecycle State Machine, and Chaos Simulation.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.store import store
from app.models import AllocationStatus, RiderStatus, ShelterStatus


@pytest.fixture(autouse=True)
def reset_store_before_each_test():
    """Ensure clean demo state before every test."""
    store.reset_to_demo_data()
    yield
    store.reset_to_demo_data()


@pytest.fixture
def client():
    return TestClient(app)


def test_rider_failure_and_parcel_recovery(client):
    """
    Test that when a courier goes silent, they are marked SUSPECT
    and their active parcel is handed over to another available courier.
    """
    # 1. Trigger auto-allocation to create assignments
    alloc_res = client.post("/api/allocations/auto")
    assert alloc_res.status_code == 200
    allocations = alloc_res.json()["allocations"]
    assert len(allocations) > 0

    first_alloc = allocations[0]
    assigned_rider_id = first_alloc["rider_id"]
    assigned_qty = first_alloc["quantity"]

    # Ensure an alternative courier is available with spare capacity
    client.patch(
        "/api/riders/rider-pune-202",
        json={"status": "AVAILABLE", "current_load": 0, "capacity_units": 60}
    )

    # 2. Simulate assigned courier going silent
    fail_res = client.post(f"/api/sim/rider/{assigned_rider_id}/go-silent")
    assert fail_res.status_code == 200
    data = fail_res.json()

    assert data["rider_id"] == assigned_rider_id
    assert data["rider_status"] == "SUSPECT"
    assert len(data["affected_allocations"]) > 0

    # Verify courier is marked SUSPECT in store
    rider_check = client.get(f"/api/riders/{assigned_rider_id}")
    assert rider_check.json()["status"] == "SUSPECT"

    # Verify allocation in store was reassigned
    updated_alloc = client.get(f"/api/allocations/{first_alloc['id']}")
    assert updated_alloc.status_code == 200
    alloc_data = updated_alloc.json()
    assert alloc_data["original_rider_id"] == assigned_rider_id
    assert alloc_data["recovery_reason"] is not None
    assert alloc_data["rider_id"] != assigned_rider_id


def test_rider_failure_when_no_fleet_available_releases_parcel(client):
    """
    Test that when a courier fails and NO other riders are available,
    the parcel is safely released back to donation inventory for reallocation.
    """
    alloc_res = client.post("/api/allocations/auto")
    allocations = alloc_res.json()["allocations"]
    first_alloc = allocations[0]
    assigned_rider_id = first_alloc["rider_id"]
    qty = first_alloc["quantity"]

    # Mark all other riders as OFFLINE
    for r in store.list_riders():
        if r.id != assigned_rider_id:
            store.update_rider(r.id, status=RiderStatus.OFFLINE)

    fail_res = client.post(f"/api/sim/rider/{assigned_rider_id}/go-silent")
    assert fail_res.status_code == 200

    updated_alloc = client.get(f"/api/allocations/{first_alloc['id']}")
    alloc_data = updated_alloc.json()
    assert alloc_data["status"] == "UNSALVAGEABLE"
    assert "Released" in alloc_data["recovery_reason"]


def test_shelter_closure_and_salvage_ladder_retargeting(client):
    """
    Test that when an in-transit destination shelter closes,
    the Salvage Ladder retargets active parcels to an open compatible shelter.
    """
    alloc_res = client.post("/api/allocations/auto")
    assert alloc_res.status_code == 200
    allocations = alloc_res.json()["allocations"]
    assert len(allocations) > 0

    first_alloc = allocations[0]
    orig_shelter_id = first_alloc["shelter_id"]

    # Ensure an alternative shelter has sufficient capacity and demand to accept the parcel
    client.patch(
        "/api/shelters/shelter-pune-303",
        json={"capacity": 150, "needed_meals": 80}
    )

    # Simulate shelter closure
    close_res = client.post(f"/api/sim/shelter/{orig_shelter_id}/close")
    assert close_res.status_code == 200
    data = close_res.json()

    assert data["shelter_id"] == orig_shelter_id
    assert data["shelter_status"] == "CLOSED"
    assert len(data["affected_allocations"]) > 0

    # Verify allocation status is REROUTED
    updated_alloc = client.get(f"/api/allocations/{first_alloc['id']}")
    assert updated_alloc.status_code == 200
    alloc_data = updated_alloc.json()
    assert alloc_data["status"] == "REROUTED"
    assert alloc_data["original_shelter_id"] == orig_shelter_id
    assert alloc_data["shelter_id"] != orig_shelter_id
    assert "Salvage Ladder" in alloc_data["recovery_reason"]


def test_shelter_demand_filled_retargeting(client):
    """
    Test that when an in-transit destination shelter is filled by walk-ins,
    active parcels are retargeted to another open shelter.
    """
    alloc_res = client.post("/api/allocations/auto")
    assert alloc_res.status_code == 200
    allocations = alloc_res.json()["allocations"]
    assert len(allocations) > 0

    first_alloc = allocations[0]
    orig_shelter_id = first_alloc["shelter_id"]

    # Ensure an alternative shelter has sufficient capacity and demand to accept the parcel
    client.patch(
        "/api/shelters/shelter-pune-303",
        json={"capacity": 150, "needed_meals": 80}
    )

    fill_res = client.post(f"/api/sim/shelter/{orig_shelter_id}/fill")
    assert fill_res.status_code == 200
    data = fill_res.json()
    assert len(data["affected_allocations"]) > 0

    updated_alloc = client.get(f"/api/allocations/{first_alloc['id']}")
    assert updated_alloc.json()["status"] == "REROUTED"


def test_no_valid_destination_results_in_unsalvageable(client):
    """
    Test that if all other shelters are closed or incompatible,
    the parcel is marked UNSALVAGEABLE and explanation is logged.
    """
    alloc_res = client.post("/api/allocations/auto")
    allocations = alloc_res.json()["allocations"]
    first_alloc = allocations[0]
    target_shelter_id = first_alloc["shelter_id"]

    # Close all OTHER shelters first
    for s in store.list_shelters():
        if s.id != target_shelter_id:
            store.update_shelter(s.id, status=ShelterStatus.CLOSED)

    # Now close the target shelter
    close_res = client.post(f"/api/sim/shelter/{target_shelter_id}/close")
    assert close_res.status_code == 200

    updated_alloc = client.get(f"/api/allocations/{first_alloc['id']}")
    alloc_data = updated_alloc.json()
    assert alloc_data["status"] == "UNSALVAGEABLE"
    assert "Salvage ladder exhausted" in alloc_data["recovery_reason"]


def test_parcel_lifecycle_transitions(client):
    """
    Test parcel lifecycle: ALLOCATED -> PICKED_UP -> IN_TRANSIT -> DELIVERED.
    Verifies shelter occupancy increments and courier load is released.
    """
    alloc_res = client.post("/api/allocations/auto")
    first_alloc = alloc_res.json()["allocations"][0]
    alloc_id = first_alloc["id"]
    rider_id = first_alloc["rider_id"]
    shelter_id = first_alloc["shelter_id"]
    qty = first_alloc["quantity"]

    initial_shelter = client.get(f"/api/shelters/{shelter_id}").json()
    initial_occ = initial_shelter["current_occupancy"]

    # 1. Pickup
    pickup_res = client.post(f"/api/allocations/{alloc_id}/pickup")
    assert pickup_res.status_code == 200
    assert pickup_res.json()["status"] == "PICKED_UP"

    # 2. In Transit
    transit_res = client.post(f"/api/allocations/{alloc_id}/in-transit")
    assert transit_res.status_code == 200
    assert transit_res.json()["status"] == "IN_TRANSIT"

    # 3. Deliver
    deliver_res = client.post(f"/api/allocations/{alloc_id}/deliver")
    assert deliver_res.status_code == 200
    assert deliver_res.json()["status"] == "DELIVERED"

    # Verify shelter occupancy increased
    updated_shelter = client.get(f"/api/shelters/{shelter_id}").json()
    assert updated_shelter["current_occupancy"] == initial_occ + qty

    # Verify rider load freed
    updated_rider = client.get(f"/api/riders/{rider_id}").json()
    assert updated_rider["current_load"] == 0


def test_invalid_lifecycle_transition_returns_error(client):
    """
    Test that invalid transitions (e.g. modifying DELIVERED parcel) return 422 error.
    """
    alloc_res = client.post("/api/allocations/auto")
    first_alloc = alloc_res.json()["allocations"][0]
    alloc_id = first_alloc["id"]

    # Deliver directly
    deliver_res = client.post(f"/api/allocations/{alloc_id}/deliver")
    assert deliver_res.status_code == 200

    # Attempting to pickup a DELIVERED parcel must fail
    invalid_res = client.post(f"/api/allocations/{alloc_id}/pickup")
    assert invalid_res.status_code == 422
    assert "terminal state" in invalid_res.json()["detail"].lower()


def test_simulation_reset_restores_seed_data(client):
    """
    Test POST /api/sim/reset restores initial demo seed data.
    """
    # Mutate state by allocating and failing a rider
    client.post("/api/allocations/auto")
    client.post("/api/sim/rider/rider-pune-201/go-silent")
    assert len(client.get("/api/allocations").json()) > 0
    assert client.get("/api/riders/rider-pune-201").json()["status"] == "SUSPECT"

    # Reset
    reset_res = client.post("/api/sim/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "success"

    # Verify allocations cleared and rider status restored
    assert len(client.get("/api/allocations").json()) == 0
    assert client.get("/api/riders/rider-pune-201").json()["status"] == "AVAILABLE"


def test_repeatable_scenario_execution(client):
    """
    Test that calling simulation scenarios repeatedly is deterministic and repeatable.
    """
    res1 = client.post("/api/sim/scenario/scenario-3-ghost-rider")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["scenario_name"] == "Scenario 3: Ghost Reservation & Courier Failure"

    # Reset and run again
    client.post("/api/sim/reset")
    res2 = client.post("/api/sim/scenario/scenario-3-ghost-rider")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["scenario_name"] == data1["scenario_name"]
    assert len(data2["recovery_results"]) == len(data1["recovery_results"])

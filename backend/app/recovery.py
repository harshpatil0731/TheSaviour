"""
Deterministic Dispatch Recovery and Salvage Ladder Engine for TheSaviour Phase 5.

Enforces zero-waste invariants during operational disruptions:
1. When a courier fails/goes silent:
   - Marks courier SUSPECT.
   - Reassigns active allocations to the most reliable available courier with spare capacity.
   - If no fleet couriers have capacity, safely releases cargo back to unallocated inventory.
2. When a shelter closes or fills mid-transit:
   - Retargets parcel to the highest-priority open compatible shelter with unmet demand.
   - Atomically migrates shelter holds to prevent overfilling.
   - If no compatible destinations exist, marks cargo UNSALVAGEABLE with human-readable audit reason.
3. Enforces strict parcel lifecycle state transitions.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from app.models import (
    ActivityEvent,
    Allocation,
    AllocationRecoveryResult,
    AllocationStatus,
    DonationStatus,
    RiderFailureResponse,
    RiderStatus,
    ShelterDisruptionResponse,
    ShelterStatus,
)
from app.store import store
from app.compatibility import evaluate_compatibility


VALID_TRANSITIONS = {
    AllocationStatus.ALLOCATED: {
        AllocationStatus.CLAIMED,
        AllocationStatus.PICKED_UP,
        AllocationStatus.IN_TRANSIT,
        AllocationStatus.DELIVERED,
        AllocationStatus.UNSALVAGEABLE,
    },
    AllocationStatus.CLAIMED: {
        AllocationStatus.PICKED_UP,
        AllocationStatus.IN_TRANSIT,
        AllocationStatus.DELIVERED,
        AllocationStatus.UNSALVAGEABLE,
    },
    AllocationStatus.PICKED_UP: {
        AllocationStatus.IN_TRANSIT,
        AllocationStatus.DELIVERED,
        AllocationStatus.REROUTED,
        AllocationStatus.UNSALVAGEABLE,
    },
    AllocationStatus.IN_TRANSIT: {
        AllocationStatus.DELIVERED,
        AllocationStatus.REROUTED,
        AllocationStatus.UNSALVAGEABLE,
    },
    AllocationStatus.REROUTED: {
        AllocationStatus.IN_TRANSIT,
        AllocationStatus.DELIVERED,
        AllocationStatus.UNSALVAGEABLE,
    },
    AllocationStatus.DELIVERED: set(),      # Terminal state
    AllocationStatus.UNSALVAGEABLE: set(),  # Terminal state
}


def transition_allocation_status(
    allocation_id: str,
    new_status: AllocationStatus,
    notes: Optional[str] = None,
) -> Allocation:
    """
    Safely transitions an allocation through its lifecycle.
    Enforces terminal states and updates shelter occupancy and rider loads on delivery.
    """
    alloc = store.get_allocation(allocation_id)
    if not alloc:
        raise ValueError(f"Allocation '{allocation_id}' not found.")

    current_status = alloc.status
    if current_status in (AllocationStatus.DELIVERED, AllocationStatus.UNSALVAGEABLE):
        raise ValueError(
            f"Cannot transition allocation '{allocation_id}' from terminal state '{current_status.value}'."
        )

    allowed = VALID_TRANSITIONS.get(current_status, set())
    if new_status not in allowed and new_status != current_status:
        raise ValueError(
            f"Invalid status transition from '{current_status.value}' to '{new_status.value}'."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    updates = {
        "status": new_status,
        "updated_at": now_iso,
    }
    if notes:
        updates["recovery_reason"] = notes

    # Side-effect on DELIVERED: Increase shelter occupancy, free rider load
    if new_status == AllocationStatus.DELIVERED:
        shelter = store.get_shelter(alloc.shelter_id)
        if shelter:
            new_occ = shelter.current_occupancy + alloc.quantity
            new_holds = max(0, shelter.active_holds - alloc.quantity)
            new_s_status = ShelterStatus.AT_CAPACITY if new_occ >= shelter.capacity else shelter.status
            store.update_shelter(
                shelter.id,
                current_occupancy=new_occ,
                active_holds=new_holds,
                status=new_s_status,
            )

        rider = store.get_rider(alloc.rider_id)
        if rider:
            new_load = max(0, rider.current_load - alloc.quantity)
            new_r_status = RiderStatus.AVAILABLE if new_load == 0 else rider.status
            store.update_rider(
                rider.id,
                current_load=new_load,
                status=new_r_status,
                completed_deliveries=rider.completed_deliveries + 1,
            )

        store.record_activity(
            ActivityEvent(
                id=f"act-deliv-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now_iso,
                event_type="PARCEL_DELIVERED",
                title=f"Delivery Completed: {alloc.donation_item_name}",
                description=(
                    f"Successfully delivered {alloc.quantity} {alloc.unit} to {alloc.shelter_name} "
                    f"via courier {alloc.rider_name}."
                ),
                severity="success",
                entity_id=alloc.id,
            )
        )

    # Side-effect on UNSALVAGEABLE: Release shelter hold and free courier load
    elif new_status == AllocationStatus.UNSALVAGEABLE:
        shelter = store.get_shelter(alloc.shelter_id)
        if shelter:
            store.update_shelter(
                shelter.id,
                active_holds=max(0, shelter.active_holds - alloc.quantity),
            )

        rider = store.get_rider(alloc.rider_id)
        if rider:
            new_load = max(0, rider.current_load - alloc.quantity)
            new_r_status = RiderStatus.AVAILABLE if new_load == 0 else rider.status
            store.update_rider(
                rider.id,
                current_load=new_load,
                status=new_r_status,
            )

        store.record_activity(
            ActivityEvent(
                id=f"act-unsalv-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now_iso,
                event_type="PARCEL_UNSALVAGEABLE",
                title=f"Parcel Unsalvageable: {alloc.donation_item_name}",
                description=notes or f"Parcel {alloc.id} declared unsalvageable.",
                severity="danger",
                entity_id=alloc.id,
            )
        )

    updated_alloc = store.update_allocation(allocation_id, updates)
    return updated_alloc or alloc


def recover_rider_failure(
    rider_id: str,
    reason: str = "Courier failed heartbeat / declared silent",
) -> RiderFailureResponse:
    """
    Marks a courier SUSPECT and recovers their active parcel allocations.
    Reassigns parcels to an available courier with sufficient capacity;
    if no fleet couriers are available, releases cargo back to unallocated inventory.
    """
    rider = store.get_rider(rider_id)
    if not rider:
        raise ValueError(f"Rider '{rider_id}' not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    store.update_rider(rider_id=rider_id, status=RiderStatus.SUSPECT)

    affected_allocations = store.list_allocations_for_rider(rider_id, active_only=True)
    recovery_results: List[AllocationRecoveryResult] = []

    for alloc in affected_allocations:
        chunk_qty = alloc.quantity

        # Look for candidate alternative riders
        candidates = [
            r for r in store.list_riders()
            if r.id != rider_id
            and r.is_active
            and r.status == RiderStatus.AVAILABLE
            and (r.capacity_units - r.current_load) >= chunk_qty
        ]
        candidates.sort(key=lambda r: (-r.reliability_score, -(r.capacity_units - r.current_load)))

        if candidates:
            new_rider = candidates[0]

            # 1. Deduct load from failed rider
            cur_failed = store.get_rider(rider_id)
            if cur_failed:
                store.update_rider(
                    rider_id,
                    current_load=max(0, cur_failed.current_load - chunk_qty),
                )

            # 2. Add load to new rider
            new_alt_load = new_rider.current_load + chunk_qty
            new_alt_status = (
                RiderStatus.EN_ROUTE_PICKUP
                if new_alt_load >= new_rider.capacity_units
                else RiderStatus.OFFERED
            )
            store.update_rider(
                new_rider.id,
                current_load=new_alt_load,
                status=new_alt_status,
            )

            # 3. Update allocation record
            explanation = (
                f"Courier handover: reassigned from suspect rider {rider.name} "
                f"to {new_rider.name} ({new_rider.vehicle_type})."
            )
            store.update_allocation(
                alloc.id,
                {
                    "original_rider_id": alloc.rider_id,
                    "original_rider_name": alloc.rider_name,
                    "rider_id": new_rider.id,
                    "rider_name": new_rider.name,
                    "rider_vehicle": new_rider.vehicle_type,
                    "status": AllocationStatus.ALLOCATED,
                    "recovery_reason": explanation,
                },
            )

            store.record_activity(
                ActivityEvent(
                    id=f"act-rhandover-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                    timestamp=now_iso,
                    event_type="RIDER_REASSIGNED",
                    title=f"Courier Handover: {alloc.donation_item_name}",
                    description=explanation,
                    severity="warning",
                    entity_id=alloc.id,
                )
            )

            recovery_results.append(
                AllocationRecoveryResult(
                    allocation_id=alloc.id,
                    action="REASSIGNED_RIDER",
                    previous_rider=rider.name,
                    new_rider=new_rider.name,
                    status=AllocationStatus.ALLOCATED,
                    explanation=explanation,
                )
            )
        else:
            # No alternative rider available with capacity
            cur_failed = store.get_rider(rider_id)
            if cur_failed:
                store.update_rider(
                    rider_id,
                    current_load=max(0, cur_failed.current_load - chunk_qty),
                )

            # Release shelter hold & demand
            shelter = store.get_shelter(alloc.shelter_id)
            if shelter:
                store.update_shelter(
                    shelter.id,
                    active_holds=max(0, shelter.active_holds - chunk_qty),
                    needed_meals=shelter.needed_meals + chunk_qty,
                )

            # Restore donation unallocated quantity
            don = store.get_donation(alloc.donation_id)
            if don:
                new_rem = (don.remaining_quantity or 0) + chunk_qty
                new_don_status = (
                    DonationStatus.PARTIALLY_ASSIGNED
                    if new_rem < don.quantity
                    else DonationStatus.AVAILABLE
                )
                store.update_donation(
                    don.id,
                    remaining_quantity=new_rem,
                    status=new_don_status,
                )

            explanation = (
                f"No available alternative riders with capacity >= {chunk_qty} units. "
                f"Released {chunk_qty} {alloc.unit} back to donation batch for reallocation."
            )
            store.update_allocation(
                alloc.id,
                {
                    "original_rider_id": alloc.rider_id,
                    "original_rider_name": alloc.rider_name,
                    "status": AllocationStatus.UNSALVAGEABLE,
                    "recovery_reason": explanation,
                },
            )

            store.record_activity(
                ActivityEvent(
                    id=f"act-rrel-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                    timestamp=now_iso,
                    event_type="PARCEL_RELEASED",
                    title=f"Parcel Reclaimed: {alloc.donation_item_name}",
                    description=explanation,
                    severity="warning",
                    entity_id=alloc.id,
                )
            )

            recovery_results.append(
                AllocationRecoveryResult(
                    allocation_id=alloc.id,
                    action="RELEASED_FOR_REALLOCATION",
                    previous_rider=rider.name,
                    status=AllocationStatus.UNSALVAGEABLE,
                    explanation=explanation,
                )
            )

    store.record_activity(
        ActivityEvent(
            id=f"act-rsuspect-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            timestamp=now_iso,
            event_type="RIDER_SUSPECT",
            title=f"Courier Marked SUSPECT: {rider.name}",
            description=f"{rider.name} marked SUSPECT. {len(recovery_results)} active parcels recovered.",
            severity="danger",
            entity_id=rider_id,
        )
    )

    msg = f"Rider {rider.name} marked SUSPECT. {len(recovery_results)} active allocations processed for recovery."
    return RiderFailureResponse(
        rider_id=rider.id,
        rider_name=rider.name,
        rider_status=RiderStatus.SUSPECT,
        affected_allocations=recovery_results,
        message=msg,
    )


def recover_shelter_disruption(
    shelter_id: str,
    is_closed: bool = True,
    reason: Optional[str] = None,
) -> ShelterDisruptionResponse:
    """
    Reroutes active parcels when a destination shelter closes or demand fills mid-transit.
    Applies the Salvage Ladder:
    1. Retargets to the best open, compatible shelter with unmet demand and capacity.
    2. Atomically migrates shelter holds to prevent overfilling.
    3. If no compatible shelter exists, marks the parcel UNSALVAGEABLE.
    """
    shelter = store.get_shelter(shelter_id)
    if not shelter:
        raise ValueError(f"Shelter '{shelter_id}' not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    if is_closed:
        store.update_shelter(shelter_id=shelter_id, status=ShelterStatus.CLOSED)
    else:
        store.update_shelter(shelter_id=shelter_id, needed_meals=0)

    affected_allocations = store.list_allocations_for_shelter(shelter_id, active_only=True)
    recovery_results: List[AllocationRecoveryResult] = []

    for alloc in affected_allocations:
        # Search for alternative open, compatible shelter
        candidates: List[Tuple[any, int]] = []
        for s in store.list_shelters():
            if s.id == shelter_id or s.status != ShelterStatus.OPEN:
                continue

            compat = evaluate_compatibility(
                shelter=s,
                category=alloc.donation_category,
                quantity=alloc.quantity,
            )
            if not compat.is_compatible:
                continue

            free_space = max(0, s.capacity - (s.current_occupancy + s.active_holds))
            s_demand = s.needed_meals
            acceptable = (
                min(s_demand, free_space)
                if (s_demand > 0 and free_space > 0)
                else (s_demand if s_demand > 0 else free_space)
            )

            if acceptable >= alloc.quantity:
                candidates.append((s, acceptable))

        # Rank candidates by acceptable room, then needed meals
        candidates.sort(key=lambda item: (-item[1], -item[0].needed_meals))

        if candidates:
            target_shelter, _ = candidates[0]

            # 1. Release hold from original shelter
            old_s = store.get_shelter(shelter_id)
            if old_s:
                store.update_shelter(
                    old_s.id,
                    active_holds=max(0, old_s.active_holds - alloc.quantity),
                )

            # 2. Add hold to new destination shelter
            new_needed = max(0, target_shelter.needed_meals - alloc.quantity)
            new_holds = target_shelter.active_holds + alloc.quantity
            new_s_status = target_shelter.status
            if target_shelter.current_occupancy + new_holds >= target_shelter.capacity:
                new_s_status = ShelterStatus.AT_CAPACITY

            store.update_shelter(
                target_shelter.id,
                needed_meals=new_needed,
                active_holds=new_holds,
                status=new_s_status,
            )

            explanation = (
                f"Salvage Ladder: Rerouted {alloc.quantity} {alloc.unit} from "
                f"'{shelter.name}' to '{target_shelter.name}' after original shelter "
                f"{'closed' if is_closed else 'filled'}."
            )
            store.update_allocation(
                alloc.id,
                {
                    "original_shelter_id": alloc.shelter_id,
                    "original_shelter_name": alloc.shelter_name,
                    "shelter_id": target_shelter.id,
                    "shelter_name": target_shelter.name,
                    "shelter_location": target_shelter.location.name,
                    "status": AllocationStatus.REROUTED,
                    "recovery_reason": explanation,
                },
            )

            store.record_activity(
                ActivityEvent(
                    id=f"act-reroute-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                    timestamp=now_iso,
                    event_type="PARCEL_REROUTED",
                    title=f"Parcel Rerouted: {alloc.donation_item_name}",
                    description=explanation,
                    severity="warning",
                    entity_id=alloc.id,
                )
            )

            recovery_results.append(
                AllocationRecoveryResult(
                    allocation_id=alloc.id,
                    action="RETARGETED_SHELTER",
                    previous_shelter=shelter.name,
                    new_shelter=target_shelter.name,
                    status=AllocationStatus.REROUTED,
                    explanation=explanation,
                )
            )
        else:
            # No compatible alternative shelter available
            old_s = store.get_shelter(shelter_id)
            if old_s:
                store.update_shelter(
                    old_s.id,
                    active_holds=max(0, old_s.active_holds - alloc.quantity),
                )

            # Free courier load
            rider = store.get_rider(alloc.rider_id)
            if rider:
                store.update_rider(
                    rider.id,
                    current_load=max(0, rider.current_load - alloc.quantity),
                )

            explanation = (
                f"Salvage ladder exhausted: no open, compatible shelters available with "
                f"capacity for {alloc.quantity} {alloc.unit} of {alloc.donation_category.value}. "
                f"Cargo marked UNSALVAGEABLE."
            )
            store.update_allocation(
                alloc.id,
                {
                    "original_rider_id": alloc.rider_id,
                    "original_rider_name": alloc.rider_name,
                    "status": AllocationStatus.UNSALVAGEABLE,
                    "recovery_reason": explanation,
                },
            )

            store.record_activity(
                ActivityEvent(
                    id=f"act-unsalv-she-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                    timestamp=now_iso,
                    event_type="PARCEL_UNSALVAGEABLE",
                    title=f"Cargo Unsalvageable: {alloc.donation_item_name}",
                    description=explanation,
                    severity="danger",
                    entity_id=alloc.id,
                )
            )

            recovery_results.append(
                AllocationRecoveryResult(
                    allocation_id=alloc.id,
                    action="MARKED_UNSALVAGEABLE",
                    previous_shelter=shelter.name,
                    status=AllocationStatus.UNSALVAGEABLE,
                    explanation=explanation,
                )
            )

    store.record_activity(
        ActivityEvent(
            id=f"act-she-disrupt-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            timestamp=now_iso,
            event_type="SHELTER_DISRUPTED",
            title=f"Shelter Disrupted: {shelter.name}",
            description=(
                f"{shelter.name} {'closed' if is_closed else 'demand filled'}. "
                f"{len(recovery_results)} parcels processed through salvage ladder."
            ),
            severity="warning" if recovery_results else "info",
            entity_id=shelter_id,
        )
    )

    msg = (
        f"Shelter '{shelter.name}' {'closed' if is_closed else 'demand filled'}. "
        f"{len(recovery_results)} active parcels evaluated for rerouting."
    )
    refreshed_s = store.get_shelter(shelter_id)
    cur_status = refreshed_s.status if refreshed_s else shelter.status
    return ShelterDisruptionResponse(
        shelter_id=shelter.id,
        shelter_name=shelter.name,
        shelter_status=cur_status,
        affected_allocations=recovery_results,
        message=msg,
    )

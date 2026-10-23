"""
Deterministic Allocation and Batch-Splitting Engine for TheSaviour Phase 3.

Prioritizes:
1. Aid safety and operational compatibility (water, fuel, cold chain, open status).
2. Donations with earliest expiry deadlines (least safe_window_minutes).
3. Shelters with highest urgent unmet demand (highest needed_meals).
4. Available riders with highest reliability score and sufficient carrying capacity.

Enforces zero-waste invariants:
- Never allocates more than donation's unallocated remaining quantity.
- Never allocates more than a shelter needs or can accommodate.
- Never assigns more cargo than a courier can carry.
- Automatically splits bulk batches across multiple shelters and riders when needed.
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional

from app.models import (
    Allocation,
    AutoAllocationResponse,
    Donation,
    DonationCategory,
    DonationStatus,
    Rider,
    RiderStatus,
    Shelter,
    ShelterStatus,
    SkippedDonation,
    ActivityEvent,
)
from app.store import store
from app.compatibility import evaluate_compatibility


def run_auto_allocation() -> AutoAllocationResponse:
    """
    Executes the deterministic allocation engine across all live in-memory entities.
    Returns structured results including created allocations, remaining unallocated
    quantities, selected targets, and explainable skip reasons.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # 1. Fetch Candidate Donations
    all_donations = store.list_donations()
    candidate_donations = [
        d for d in all_donations
        if (d.remaining_quantity if d.remaining_quantity is not None else d.quantity) > 0
        and d.status in (DonationStatus.AVAILABLE, DonationStatus.PARTIALLY_ASSIGNED)
        and d.safe_window_minutes > 0
    ]

    # Prioritize donations with earliest expiry deadlines (least safe window)
    candidate_donations.sort(key=lambda d: (d.safe_window_minutes, -d.quantity))

    # 2. Fetch Available Volunteer Riders
    all_riders = store.list_riders()
    available_riders = [
        r for r in all_riders
        if r.status == RiderStatus.AVAILABLE
        and r.is_active
        and (r.capacity_units - r.current_load) > 0
    ]
    # Prioritize couriers with highest reliability score, then highest capacity
    available_riders.sort(key=lambda r: (-r.reliability_score, -(r.capacity_units - r.current_load)))

    # 3. Fetch Candidate Shelters
    all_shelters = store.list_shelters()
    open_shelters = [
        s for s in all_shelters
        if s.status == ShelterStatus.OPEN
    ]
    # Prioritize shelters with highest unmet needed_meals demand
    open_shelters.sort(key=lambda s: (-s.needed_meals, -(s.capacity - s.current_occupancy)))

    allocations_created: List[Allocation] = []
    skipped_donations: List[SkippedDonation] = []
    total_qty_allocated = 0

    if not candidate_donations:
        return AutoAllocationResponse(
            allocations=[],
            skipped_donations=[],
            total_donations_processed=0,
            total_quantity_allocated=0,
            total_allocations_created=0,
            unallocated_donations_remaining=0,
            message="No active donations with unallocated quantities require allocation.",
        )

    # 4. Process Each Candidate Donation Deterministically
    for donation in candidate_donations:
        rem_qty = donation.remaining_quantity if donation.remaining_quantity is not None else donation.quantity
        if rem_qty <= 0:
            continue

        initial_rem = rem_qty

        # Filter and rank shelters compatible with this donation's aid category
        compatible_shelters_with_demand: List[tuple[Shelter, int]] = []
        incompatibility_reasons: List[str] = []

        for shelter in open_shelters:
            compat = evaluate_compatibility(
                shelter=shelter,
                category=donation.category,
                quantity=rem_qty,
            )

            if not compat.is_compatible:
                reason_summary = f"{shelter.name}: " + ("; ".join(compat.reasons) if compat.reasons else "Incompatible")
                incompatibility_reasons.append(reason_summary)
                continue

            # Calculate effective unmet capacity for this shelter
            free_space = max(0, shelter.capacity - (shelter.current_occupancy + shelter.active_holds))
            shelter_demand = shelter.needed_meals

            if shelter_demand > 0 and free_space > 0:
                acceptable_limit = min(shelter_demand, free_space)
            elif shelter_demand > 0:
                acceptable_limit = shelter_demand
            else:
                acceptable_limit = free_space

            if acceptable_limit > 0:
                compatible_shelters_with_demand.append((shelter, acceptable_limit))

        if not compatible_shelters_with_demand:
            reason = "No open compatible shelters with unmet demand or available capacity."
            if incompatibility_reasons:
                reason += f" ({'; '.join(incompatibility_reasons[:2])})"
            skipped_donations.append(
                SkippedDonation(
                    donation_id=donation.id,
                    item_name=donation.item_name,
                    category=donation.category,
                    unallocated_quantity=rem_qty,
                    unit=donation.unit,
                    reason=reason,
                )
            )
            continue

        if not available_riders:
            skipped_donations.append(
                SkippedDonation(
                    donation_id=donation.id,
                    item_name=donation.item_name,
                    category=donation.category,
                    unallocated_quantity=rem_qty,
                    unit=donation.unit,
                    reason="No volunteer riders currently available with transport capacity in the fleet.",
                )
            )
            continue

        # 5. Batch Splitting Across Shelters and Riders
        shelter_idx = 0
        while rem_qty > 0 and shelter_idx < len(compatible_shelters_with_demand) and available_riders:
            shelter, shelter_limit = compatible_shelters_with_demand[shelter_idx]
            if shelter_limit <= 0:
                shelter_idx += 1
                continue

            rider = available_riders[0]
            rider_avail_cap = rider.capacity_units - rider.current_load
            if rider_avail_cap <= 0:
                available_riders.pop(0)
                continue

            # Invariant: chunk cannot exceed donation remaining, shelter demand, or rider capacity
            chunk_qty = min(rem_qty, shelter_limit, rider_avail_cap)
            if chunk_qty <= 0:
                shelter_idx += 1
                continue

            # Create Parcel Allocation
            ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            alloc_id = f"alloc-{donation.id}-{ts_ms % 100000}-{len(allocations_created) + 1}"

            allocation = Allocation(
                id=alloc_id,
                donation_id=donation.id,
                donation_item_name=donation.item_name,
                donation_category=donation.category,
                donor_name=donation.donor_name,
                donor_location=donation.location.name,
                shelter_id=shelter.id,
                shelter_name=shelter.name,
                shelter_location=shelter.location.name,
                rider_id=rider.id,
                rider_name=rider.name,
                rider_vehicle=rider.vehicle_type,
                quantity=chunk_qty,
                unit=donation.unit,
                status="ALLOCATED",
                reason=(
                    f"Matched {chunk_qty} {donation.unit} from {donation.donor_name} to {shelter.name} "
                    f"via rider {rider.name} ({rider.vehicle_type}). Expiry window: {donation.safe_window_minutes}m."
                ),
                created_at=now_iso,
            )

            # Deduct quantities
            rem_qty -= chunk_qty
            total_qty_allocated += chunk_qty
            shelter_limit -= chunk_qty
            compatible_shelters_with_demand[shelter_idx] = (shelter, shelter_limit)

            # Update live entities in store
            # 1. Shelter updates
            new_needed = max(0, shelter.needed_meals - chunk_qty) if shelter.needed_meals > 0 else 0
            new_holds = shelter.active_holds + chunk_qty
            new_status = shelter.status
            if shelter.current_occupancy + new_holds >= shelter.capacity and shelter.status == ShelterStatus.OPEN:
                new_status = ShelterStatus.AT_CAPACITY
            store.update_shelter(
                shelter_id=shelter.id,
                needed_meals=new_needed,
                status=new_status,
            )
            # Update local shelter object
            shelter.needed_meals = new_needed
            shelter.active_holds = new_holds
            shelter.status = new_status

            # 2. Rider updates
            new_load = rider.current_load + chunk_qty
            new_rider_status = RiderStatus.EN_ROUTE_PICKUP if new_load >= rider.capacity_units else RiderStatus.OFFERED
            store.update_rider(
                rider_id=rider.id,
                current_load=new_load,
                status=new_rider_status,
            )
            # Courier is committed for this leg; remove from available unassigned list
            available_riders.pop(0)

            # 3. Donation updates
            new_don_status = DonationStatus.FULLY_ASSIGNED if rem_qty == 0 else DonationStatus.PARTIALLY_ASSIGNED
            store.update_donation(
                donation_id=donation.id,
                remaining_quantity=rem_qty,
                status=new_don_status,
            )
            donation.remaining_quantity = rem_qty
            donation.status = new_don_status

            # Persist allocation record
            store.record_allocation(allocation)
            allocations_created.append(allocation)

        # If after attempting allocations, part or all could not be placed
        if rem_qty > 0:
            if rem_qty == initial_rem:
                skipped_donations.append(
                    SkippedDonation(
                        donation_id=donation.id,
                        item_name=donation.item_name,
                        category=donation.category,
                        unallocated_quantity=rem_qty,
                        unit=donation.unit,
                        reason="No further available riders with sufficient carrying capacity.",
                    )
                )
            else:
                skipped_donations.append(
                    SkippedDonation(
                        donation_id=donation.id,
                        item_name=donation.item_name,
                        category=donation.category,
                        unallocated_quantity=rem_qty,
                        unit=donation.unit,
                        reason=f"Partially allocated ({initial_rem - rem_qty} {donation.unit} dispatched). {rem_qty} {donation.unit} remain unallocated due to fleet/shelter limits.",
                    )
                )

    # 6. Audit Logging
    if allocations_created:
        store.record_activity(
            ActivityEvent(
                id=f"act-auto-{int(now.timestamp() * 1000)}",
                timestamp=now_iso,
                event_type="AUTO_ALLOCATION_CYCLE",
                title=f"Intelligent Allocation Cycle Completed",
                description=(
                    f"Generated {len(allocations_created)} parcel allocations dispatching {total_qty_allocated} aid units. "
                    f"Urgency-first, zero-waste invariant enforced."
                ),
                severity="success",
            )
        )

    # Count remaining unallocated donations
    remaining_unallocated_count = len([
        d for d in store.list_donations()
        if (d.remaining_quantity if d.remaining_quantity is not None else d.quantity) > 0
    ])

    summary_msg = (
        f"Auto-allocation cycle completed: {len(allocations_created)} allocations created, "
        f"{total_qty_allocated} units allocated across {len(candidate_donations)} batches."
    )

    return AutoAllocationResponse(
        allocations=allocations_created,
        skipped_donations=skipped_donations,
        total_donations_processed=len(candidate_donations),
        total_quantity_allocated=total_qty_allocated,
        total_allocations_created=len(allocations_created),
        unallocated_donations_remaining=remaining_unallocated_count,
        message=summary_msg,
    )

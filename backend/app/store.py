"""
In-memory repository and state management for TheSaviour Phase 1.
Provides clean abstracted interfaces for later database persistence.
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone

from app.models import (
    Donation,
    DonationCategory,
    Location,
    Rider,
    Shelter,
    ShelterCapabilities,
    ActivityEvent,
    DashboardSummary,
    DashboardResponse,
    HealthResponse,
    UrgencyLevel,
    DonationStatus,
    RiderStatus,
    ShelterStatus,
)
from app.seed_data import (
    get_demo_donations,
    get_demo_riders,
    get_demo_shelters,
    get_demo_activities,
)


class InMemoryStore:
    def __init__(self):
        self._donations: Dict[str, Donation] = {}
        self._riders: Dict[str, Rider] = {}
        self._shelters: Dict[str, Shelter] = {}
        self._activities: List[ActivityEvent] = []
        self.reset_to_demo_data()

    def reset_to_demo_data(self) -> None:
        """Seed or reset store to initial demo state."""
        self._donations = {d.id: d for d in get_demo_donations()}
        self._riders = {r.id: r for r in get_demo_riders()}
        self._shelters = {s.id: s for s in get_demo_shelters()}
        self._activities = list(get_demo_activities())

    # --- Donations ---
    def list_donations(self, urgency: Optional[str] = None, status: Optional[str] = None) -> List[Donation]:
        items = list(self._donations.values())
        if urgency:
            items = [d for d in items if d.urgency_level.value == urgency.upper()]
        if status:
            items = [d for d in items if d.status.value == status.upper()]
        return items

    def get_donation(self, donation_id: str) -> Optional[Donation]:
        return self._donations.get(donation_id)

    def create_donation(self, donation: Donation) -> Donation:
        self._donations[donation.id] = donation
        self.record_activity(
            ActivityEvent(
                id=f"act-don-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=datetime.now(timezone.utc).isoformat(),
                event_type="BATCH_CREATED",
                title=f"New Donation: {donation.item_name}",
                description=f"{donation.quantity} {donation.unit} registered by {donation.donor_name} ({donation.location.name}). Safe window: {donation.safe_window_minutes}m.",
                severity="success" if donation.urgency_level != UrgencyLevel.CRITICAL else "warning",
                entity_id=donation.id,
            )
        )
        return donation

    def update_donation(
        self,
        donation_id: str,
        status: Optional[DonationStatus] = None,
        remaining_quantity: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> Optional[Donation]:
        donation = self._donations.get(donation_id)
        if not donation:
            return None

        if remaining_quantity is not None:
            if remaining_quantity < 0:
                raise ValueError("Remaining quantity cannot be negative.")
            if remaining_quantity > donation.quantity:
                raise ValueError(f"Remaining quantity ({remaining_quantity}) cannot exceed initial donation quantity ({donation.quantity}).")

        updates = {}
        if status is not None:
            updates["status"] = status
        if remaining_quantity is not None:
            updates["remaining_quantity"] = remaining_quantity
            if remaining_quantity == 0:
                updates["status"] = DonationStatus.FULLY_ASSIGNED
            elif remaining_quantity < donation.quantity and (status is None or status == DonationStatus.AVAILABLE):
                updates["status"] = DonationStatus.PARTIALLY_ASSIGNED
        if notes is not None:
            updates["notes"] = notes

        updated_donation = donation.model_copy(update=updates)
        self._donations[donation_id] = updated_donation
        return updated_donation

    def allocate_donation(
        self,
        donation_id: str,
        quantity: int,
        shelter_id: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[Donation]:
        donation = self._donations.get(donation_id)
        if not donation:
            return None

        if quantity <= 0:
            raise ValueError("Allocated quantity must be greater than zero.")

        current_rem = donation.remaining_quantity if donation.remaining_quantity is not None else donation.quantity
        if quantity > current_rem:
            raise ValueError(f"Cannot allocate {quantity} units. Only {current_rem} unallocated units remain.")

        new_remaining = current_rem - quantity
        new_status = DonationStatus.FULLY_ASSIGNED if new_remaining == 0 else DonationStatus.PARTIALLY_ASSIGNED

        updated_donation = donation.model_copy(update={
            "remaining_quantity": new_remaining,
            "status": new_status,
        })
        self._donations[donation_id] = updated_donation

        target_str = f" to shelter '{shelter_id}'" if shelter_id else ""
        self.record_activity(
            ActivityEvent(
                id=f"act-alloc-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=datetime.now(timezone.utc).isoformat(),
                event_type="PARCEL_ALLOCATED",
                title=f"Aid Allocated: {donation.item_name}",
                description=f"Allocated {quantity} {donation.unit}{target_str}. Remaining unallocated: {new_remaining}.",
                severity="info",
                entity_id=donation_id,
            )
        )
        return updated_donation

    # --- Riders ---
    def list_riders(self, status: Optional[str] = None) -> List[Rider]:
        items = list(self._riders.values())
        if status:
            items = [r for r in items if r.status.value == status.upper()]
        return items

    def get_rider(self, rider_id: str) -> Optional[Rider]:
        return self._riders.get(rider_id)

    def update_rider(
        self,
        rider_id: str,
        status: Optional[RiderStatus] = None,
        capacity_units: Optional[int] = None,
        current_load: Optional[int] = None,
        is_active: Optional[bool] = None,
        reliability_score: Optional[float] = None,
        location: Optional[Location] = None,
    ) -> Optional[Rider]:
        rider = self._riders.get(rider_id)
        if not rider:
            return None

        eff_capacity = capacity_units if capacity_units is not None else rider.capacity_units
        eff_load = current_load if current_load is not None else rider.current_load

        if eff_capacity <= 0:
            raise ValueError("Rider carrying capacity must be greater than zero.")
        if eff_load < 0:
            raise ValueError("Rider current load cannot be negative.")
        if eff_load > eff_capacity:
            raise ValueError(f"Current load ({eff_load}) cannot exceed rider carrying capacity ({eff_capacity}).")

        updates = {}
        if status is not None:
            updates["status"] = status
        if capacity_units is not None:
            updates["capacity_units"] = capacity_units
        if current_load is not None:
            updates["current_load"] = current_load
        if is_active is not None:
            updates["is_active"] = is_active
        if reliability_score is not None:
            updates["reliability_score"] = reliability_score
        if location is not None:
            updates["location"] = location

        updated_rider = rider.model_copy(update=updates)
        self._riders[rider_id] = updated_rider

        self.record_activity(
            ActivityEvent(
                id=f"act-rid-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=datetime.now(timezone.utc).isoformat(),
                event_type="RIDER_UPDATED",
                title=f"Rider Updated: {rider.name}",
                description=f"Status: {updated_rider.status.value}, Capacity: {updated_rider.capacity_units} units (load: {updated_rider.current_load}).",
                severity="info",
                entity_id=rider_id,
            )
        )
        return updated_rider

    # --- Shelters ---
    def list_shelters(self, status: Optional[str] = None) -> List[Shelter]:
        items = list(self._shelters.values())
        if status:
            items = [s for s in items if s.status.value == status.upper()]
        return items

    def get_shelter(self, shelter_id: str) -> Optional[Shelter]:
        return self._shelters.get(shelter_id)

    def update_shelter(
        self,
        shelter_id: str,
        needed_meals: Optional[int] = None,
        capacity: Optional[int] = None,
        current_occupancy: Optional[int] = None,
        status: Optional[ShelterStatus] = None,
        capabilities: Optional[ShelterCapabilities] = None,
        needed_categories: Optional[List[DonationCategory]] = None,
    ) -> Optional[Shelter]:
        shelter = self._shelters.get(shelter_id)
        if not shelter:
            return None

        eff_capacity = capacity if capacity is not None else shelter.capacity
        eff_occupancy = current_occupancy if current_occupancy is not None else shelter.current_occupancy
        eff_needed = needed_meals if needed_meals is not None else shelter.needed_meals

        if eff_needed < 0:
            raise ValueError("Shelter needed meals demand cannot be negative.")
        if eff_capacity <= 0:
            raise ValueError("Shelter total capacity must be greater than zero.")
        if eff_occupancy < 0:
            raise ValueError("Shelter current occupancy cannot be negative.")
        if eff_occupancy > eff_capacity:
            raise ValueError(f"Current occupancy ({eff_occupancy}) cannot exceed shelter capacity ({eff_capacity}).")

        updates = {}
        if needed_meals is not None:
            updates["needed_meals"] = needed_meals
        if capacity is not None:
            updates["capacity"] = capacity
        if current_occupancy is not None:
            updates["current_occupancy"] = current_occupancy
            if eff_occupancy >= eff_capacity and status is None and shelter.status == ShelterStatus.OPEN:
                updates["status"] = ShelterStatus.AT_CAPACITY
        if status is not None:
            updates["status"] = status
        if capabilities is not None:
            updates["capabilities"] = capabilities
        if needed_categories is not None:
            updates["needed_categories"] = needed_categories

        updated_shelter = shelter.model_copy(update=updates)
        self._shelters[shelter_id] = updated_shelter

        self.record_activity(
            ActivityEvent(
                id=f"act-she-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=datetime.now(timezone.utc).isoformat(),
                event_type="SHELTER_UPDATED",
                title=f"Shelter Updated: {shelter.name}",
                description=f"Status: {updated_shelter.status.value}, Demand: {updated_shelter.needed_meals} meals, Occ: {updated_shelter.current_occupancy}/{updated_shelter.capacity}.",
                severity="info",
                entity_id=shelter_id,
            )
        )
        return updated_shelter

    # --- Activities ---
    def list_activities(self, limit: int = 10) -> List[ActivityEvent]:
        return self._activities[:limit]

    def record_activity(self, event: ActivityEvent) -> None:
        self._activities.insert(0, event)
        if len(self._activities) > 50:
            self._activities = self._activities[:50]

    # --- Dashboard Summary ---
    def get_dashboard_data(self) -> DashboardResponse:
        donations = list(self._donations.values())
        riders = list(self._riders.values())
        shelters = list(self._shelters.values())

        available_donations = [d for d in donations if d.status in (DonationStatus.AVAILABLE, DonationStatus.PARTIALLY_ASSIGNED)]
        urgent_donations = [d for d in donations if d.urgency_level in (UrgencyLevel.CRITICAL, UrgencyLevel.HIGH)]
        active_deliveries = [d for d in donations if d.status in (DonationStatus.IN_TRANSIT, DonationStatus.PARTIALLY_ASSIGNED)]
        available_riders = [r for r in riders if r.status == RiderStatus.AVAILABLE]

        total_meals = sum((d.remaining_quantity if d.remaining_quantity is not None else d.quantity) for d in available_donations if d.unit == "meals")
        total_shelter_capacity = sum(s.capacity for s in shelters)
        current_shelter_occupancy = sum(s.current_occupancy for s in shelters)

        summary = DashboardSummary(
            available_donations_count=len(available_donations),
            total_meals_available=total_meals,
            active_deliveries_count=len(active_deliveries),
            urgent_batches_count=len(urgent_donations),
            available_riders_count=len(available_riders),
            total_riders_count=len(riders),
            active_shelters_count=len([s for s in shelters if s.status == ShelterStatus.OPEN]),
            total_shelter_capacity=total_shelter_capacity,
            current_shelter_occupancy=current_shelter_occupancy,
        )

        return DashboardResponse(
            summary=summary,
            urgent_donations=urgent_donations,
            recent_activities=self.list_activities(6),
            top_riders=riders[:4],
            open_shelters=[s for s in shelters if s.status == ShelterStatus.OPEN][:4],
        )

    # --- Health ---
    def get_health(self) -> HealthResponse:
        return HealthResponse(
            status="healthy",
            service="TheSaviour Civic Aid Dispatch API",
            version="1.0.0-phase1",
            timestamp=datetime.now(timezone.utc).isoformat(),
            counts={
                "donations": len(self._donations),
                "riders": len(self._riders),
                "shelters": len(self._shelters),
                "activities": len(self._activities),
            },
        )


# Global singleton store instance for in-memory Phase 1
store = InMemoryStore()

"""
In-memory repository and state management for TheSaviour Phase 1.
Provides clean abstracted interfaces for later database persistence.
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone

from app.models import (
    Donation,
    Rider,
    Shelter,
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

    # --- Riders ---
    def list_riders(self, status: Optional[str] = None) -> List[Rider]:
        items = list(self._riders.values())
        if status:
            items = [r for r in items if r.status.value == status.upper()]
        return items

    def get_rider(self, rider_id: str) -> Optional[Rider]:
        return self._riders.get(rider_id)

    # --- Shelters ---
    def list_shelters(self, status: Optional[str] = None) -> List[Shelter]:
        items = list(self._shelters.values())
        if status:
            items = [s for s in items if s.status.value == status.upper()]
        return items

    def get_shelter(self, shelter_id: str) -> Optional[Shelter]:
        return self._shelters.get(shelter_id)

    # --- Activities ---
    def list_activities(self, limit: int = 10) -> List[ActivityEvent]:
        return self._activities[:limit]

    # --- Dashboard Summary ---
    def get_dashboard_data(self) -> DashboardResponse:
        donations = list(self._donations.values())
        riders = list(self._riders.values())
        shelters = list(self._shelters.values())

        available_donations = [d for d in donations if d.status in (DonationStatus.AVAILABLE, DonationStatus.PARTIALLY_ASSIGNED)]
        urgent_donations = [d for d in donations if d.urgency_level in (UrgencyLevel.CRITICAL, UrgencyLevel.HIGH)]
        active_deliveries = [d for d in donations if d.status in (DonationStatus.IN_TRANSIT, DonationStatus.PARTIALLY_ASSIGNED)]
        available_riders = [r for r in riders if r.status == RiderStatus.AVAILABLE]

        total_meals = sum(d.quantity for d in available_donations if d.unit == "meals")
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

"""
Domain models for TheSaviour - Civic Aid Coordination & Redistribution Platform.
Phase 1: In-memory schema definitions matching README domain model.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class UrgencyLevel(str, Enum):
    CRITICAL = "CRITICAL"  # < 60 mins remaining
    HIGH = "HIGH"          # 60-120 mins remaining
    MODERATE = "MODERATE"  # 120-240 mins remaining
    STABLE = "STABLE"      # > 240 mins remaining / non-perishable


class DonationCategory(str, Enum):
    COOKED_MEAL = "cooked_meal"
    RAW_RATION_KIT = "raw_ration_kit"
    INFANT_FORMULA = "infant_formula"
    REFRIGERATED_MEDICINE = "refrigerated_medicine"
    BAKERY_PRODUCE = "bakery_produce"


class DonationStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    PARTIALLY_ASSIGNED = "PARTIALLY_ASSIGNED"
    FULLY_ASSIGNED = "FULLY_ASSIGNED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class RiderStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    OFFERED = "OFFERED"
    EN_ROUTE_PICKUP = "EN_ROUTE_PICKUP"
    EN_ROUTE_DROP = "EN_ROUTE_DROP"
    OFFLINE = "OFFLINE"
    SUSPECT = "SUSPECT"


class ShelterStatus(str, Enum):
    OPEN = "OPEN"
    AT_CAPACITY = "AT_CAPACITY"
    CLOSED = "CLOSED"


class Location(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float


class ShelterCapabilities(BaseModel):
    has_water: bool = True
    has_fuel: bool = True
    has_refrigeration: bool = False


# --- Core Entities ---

class Donation(BaseModel):
    id: str
    donor_id: str
    donor_name: str
    donor_type: str  # "Banquet Hall", "Restaurant", "Pharmacy", "Mess", etc.
    location: Location
    item_name: str
    category: DonationCategory
    quantity: int
    unit: str  # "meals", "kits", "vials", "boxes"
    ready_at: str
    expires_at: str
    safe_window_minutes: int
    urgency_level: UrgencyLevel
    status: DonationStatus
    requirements: List[str] = Field(default_factory=list)
    suggested_parcels: int = 1
    notes: Optional[str] = None
    created_at: str


class Rider(BaseModel):
    id: str
    name: str
    phone: str
    vehicle_type: str  # "Electric Two-Wheeler", "Motorcycle", "Cargo Scooter"
    capacity_units: int
    current_load: int = 0
    status: RiderStatus
    location: Location
    reliability_score: float = Field(ge=0.0, le=1.0)
    completed_deliveries: int = 0
    last_heartbeat_at: str
    is_active: bool = True


class Shelter(BaseModel):
    id: str
    name: str
    contact_person: str
    phone: str
    location: Location
    status: ShelterStatus
    capacity: int
    current_occupancy: int
    needed_meals: int
    capabilities: ShelterCapabilities
    needed_categories: List[DonationCategory] = Field(default_factory=list)
    active_holds: int = 0


class ActivityEvent(BaseModel):
    id: str
    timestamp: str
    event_type: str  # "BATCH_CREATED", "PARCEL_OFFERED", "HEARTBEAT_ACK", etc.
    title: str
    description: str
    severity: str = "info"  # "info", "warning", "success", "danger"
    entity_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


# --- Dashboard API Models ---

class DashboardSummary(BaseModel):
    available_donations_count: int
    total_meals_available: int
    active_deliveries_count: int
    urgent_batches_count: int
    available_riders_count: int
    total_riders_count: int
    active_shelters_count: int
    total_shelter_capacity: int
    current_shelter_occupancy: int


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    urgent_donations: List[Donation]
    recent_activities: List[ActivityEvent]
    top_riders: List[Rider]
    open_shelters: List[Shelter]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    counts: Dict[str, int]

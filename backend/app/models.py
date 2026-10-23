"""
Domain models for TheSaviour - Civic Aid Coordination & Redistribution Platform.
Phase 1: In-memory schema definitions matching README domain model.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


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
    remaining_quantity: Optional[int] = None
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

    @model_validator(mode="after")
    def populate_remaining_quantity(self) -> "Donation":
        if self.remaining_quantity is None:
            self.remaining_quantity = self.quantity
        return self


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


# --- Phase 2: Operations and Management Models ---

class DonationCreate(BaseModel):
    donor_name: str = Field(..., min_length=2, max_length=120)
    donor_type: str = Field(default="Community Partner", min_length=2, max_length=60)
    donor_id: Optional[str] = None
    item_name: str = Field(..., min_length=2, max_length=120)
    category: DonationCategory
    quantity: int = Field(..., gt=0, description="Donation quantity must be greater than zero.")
    unit: str = Field(default="meals", min_length=1, max_length=30)
    location: Location
    ready_at: Optional[str] = None
    expires_at: str = Field(..., description="ISO 8601 expiry timestamp.")
    requirements: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class DonationUpdate(BaseModel):
    status: Optional[DonationStatus] = None
    remaining_quantity: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None


class DonationAllocateRequest(BaseModel):
    quantity: int = Field(..., gt=0, description="Quantity to allocate must be greater than zero.")
    shelter_id: Optional[str] = None
    notes: Optional[str] = None


class ShelterUpdate(BaseModel):
    needed_meals: Optional[int] = Field(None, ge=0, description="Needed meals cannot be negative.")
    capacity: Optional[int] = Field(None, gt=0, description="Capacity must be positive.")
    current_occupancy: Optional[int] = Field(None, ge=0, description="Occupancy cannot be negative.")
    status: Optional[ShelterStatus] = None
    capabilities: Optional[ShelterCapabilities] = None
    needed_categories: Optional[List[DonationCategory]] = None


class ShelterNeedsUpdate(BaseModel):
    needed_meals: int = Field(..., ge=0, description="Needed meals cannot be negative.")
    capabilities: Optional[ShelterCapabilities] = None
    needed_categories: Optional[List[DonationCategory]] = None


class RiderUpdate(BaseModel):
    status: Optional[RiderStatus] = None
    capacity_units: Optional[int] = Field(None, gt=0, description="Capacity must be greater than zero.")
    current_load: Optional[int] = Field(None, ge=0, description="Current load cannot be negative.")
    is_active: Optional[bool] = None
    reliability_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    location: Optional[Location] = None


class RiderStatusUpdate(BaseModel):
    status: RiderStatus


class CompatibilityCheckRequest(BaseModel):
    category: DonationCategory
    shelter_id: str
    quantity: Optional[int] = Field(None, gt=0)
    donation_id: Optional[str] = None


class CompatibilityCheckResult(BaseModel):
    is_compatible: bool
    shelter_id: str
    shelter_name: str
    category: DonationCategory
    missing_capabilities: List[str] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    max_acceptable_quantity: int


# --- Phase 3: Automatic Allocation and Batch Splitting Models ---

class Allocation(BaseModel):
    id: str
    donation_id: str
    donation_item_name: str
    donation_category: DonationCategory
    donor_name: str
    donor_location: str
    shelter_id: str
    shelter_name: str
    shelter_location: str
    rider_id: str
    rider_name: str
    rider_vehicle: str
    quantity: int
    unit: str
    status: str = "ALLOCATED"
    reason: str
    created_at: str


class SkippedDonation(BaseModel):
    donation_id: str
    item_name: str
    category: DonationCategory
    unallocated_quantity: int
    unit: str
    reason: str


class AutoAllocationResponse(BaseModel):
    allocations: List[Allocation]
    skipped_donations: List[SkippedDonation]
    total_donations_processed: int
    total_quantity_allocated: int
    total_allocations_created: int
    unallocated_donations_remaining: int
    message: str


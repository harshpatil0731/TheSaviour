export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'STABLE';

export type DonationCategory = 
  | 'cooked_meal' 
  | 'raw_ration_kit' 
  | 'infant_formula' 
  | 'refrigerated_medicine' 
  | 'bakery_produce';

export type DonationStatus = 
  | 'AVAILABLE' 
  | 'PARTIALLY_ASSIGNED' 
  | 'FULLY_ASSIGNED' 
  | 'IN_TRANSIT' 
  | 'DELIVERED' 
  | 'CANCELLED';

export type RiderStatus = 
  | 'AVAILABLE' 
  | 'OFFERED' 
  | 'EN_ROUTE_PICKUP' 
  | 'EN_ROUTE_DROP' 
  | 'OFFLINE' 
  | 'SUSPECT';

export type ShelterStatus = 'OPEN' | 'AT_CAPACITY' | 'CLOSED';

export interface Location {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface ShelterCapabilities {
  has_water: boolean;
  has_fuel: boolean;
  has_refrigeration: boolean;
}

export interface Donation {
  id: string;
  donor_id: string;
  donor_name: string;
  donor_type: string;
  location: Location;
  item_name: string;
  category: DonationCategory;
  quantity: number;
  remaining_quantity?: number;
  unit: string;
  ready_at: string;
  expires_at: string;
  safe_window_minutes: number;
  urgency_level: UrgencyLevel;
  status: DonationStatus;
  requirements: string[];
  suggested_parcels: number;
  notes?: string;
  created_at: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  capacity_units: number;
  current_load: number;
  status: RiderStatus;
  location: Location;
  reliability_score: number;
  completed_deliveries: number;
  last_heartbeat_at: string;
  is_active: boolean;
}

export interface Shelter {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  location: Location;
  status: ShelterStatus;
  capacity: number;
  current_occupancy: number;
  needed_meals: number;
  capabilities: ShelterCapabilities;
  needed_categories: DonationCategory[];
  active_holds: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  entity_id?: string;
  metadata?: Record<string, string>;
}

export interface DashboardSummary {
  available_donations_count: number;
  total_meals_available: number;
  active_deliveries_count: number;
  urgent_batches_count: number;
  available_riders_count: number;
  total_riders_count: number;
  active_shelters_count: number;
  total_shelter_capacity: number;
  current_shelter_occupancy: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  urgent_donations: Donation[];
  recent_activities: ActivityEvent[];
  top_riders: Rider[];
  open_shelters: Shelter[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  counts: Record<string, number>;
}

export type NavTab = 
  | 'overview' 
  | 'donations' 
  | 'riders' 
  | 'shelters' 
  | 'dispatch' 
  | 'simulation';

// --- Phase 2 Types ---

export interface DonationCreateInput {
  donor_name: string;
  donor_type?: string;
  item_name: string;
  category: DonationCategory;
  quantity: number;
  unit?: string;
  location: Location;
  expires_at: string;
  notes?: string;
  requirements?: string[];
}

export interface DonationAllocateInput {
  quantity: number;
  shelter_id?: string;
  notes?: string;
}

export interface ShelterUpdateInput {
  needed_meals?: number;
  capacity?: number;
  current_occupancy?: number;
  status?: ShelterStatus;
  capabilities?: ShelterCapabilities;
  needed_categories?: DonationCategory[];
}

export interface RiderUpdateInput {
  status?: RiderStatus;
  capacity_units?: number;
  current_load?: number;
  is_active?: boolean;
}

export interface CompatibilityResult {
  is_compatible: boolean;
  shelter_id: string;
  shelter_name: string;
  category: DonationCategory;
  missing_capabilities: string[];
  reasons: string[];
  warnings: string[];
  max_acceptable_quantity: number;
}

// --- Phase 3: Automatic Allocation Types ---

export interface Allocation {
  id: string;
  donation_id: string;
  donation_item_name: string;
  donation_category: DonationCategory;
  donor_name: string;
  donor_location: string;
  shelter_id: string;
  shelter_name: string;
  shelter_location: string;
  rider_id: string;
  rider_name: string;
  rider_vehicle: string;
  quantity: number;
  unit: string;
  status: string;
  reason: string;
  created_at: string;
}

export interface SkippedDonation {
  donation_id: string;
  item_name: string;
  category: DonationCategory;
  unallocated_quantity: number;
  unit: string;
  reason: string;
}

export interface AutoAllocationResponse {
  allocations: Allocation[];
  skipped_donations: SkippedDonation[];
  total_donations_processed: number;
  total_quantity_allocated: number;
  total_allocations_created: number;
  unallocated_donations_remaining: number;
  message: string;
}

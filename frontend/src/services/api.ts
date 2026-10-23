import { 
  DashboardResponse, 
  Donation, 
  Rider, 
  Shelter, 
  HealthResponse,
  DonationCreateInput,
  DonationAllocateInput,
  ShelterUpdateInput,
  RiderUpdateInput,
  RiderStatus,
  CompatibilityResult,
  Allocation,
  AllocationStatus,
  AutoAllocationResponse,
  RouteCalculationResponse,
  MapConfigResponse,
  RiderFailureResponse,
  ShelterDisruptionResponse,
  ScenarioExecutionResponse,
  SimulationResetResponse,
} from '../types';

// Supports relative path (Vite proxy) or direct backend endpoint
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.detail) {
        if (Array.isArray(parsed.detail)) {
          errorMessage = parsed.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        } else {
          errorMessage = parsed.detail;
        }
      }
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export const api = {
  // --- Core Health & Dashboard ---
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse<HealthResponse>(res);
  },

  async getDashboard(): Promise<DashboardResponse> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard`);
    return handleResponse<DashboardResponse>(res);
  },

  // --- Donations ---
  async getDonations(urgency?: string, status?: string): Promise<Donation[]> {
    const params = new URLSearchParams();
    if (urgency && urgency !== 'ALL') params.append('urgency', urgency);
    if (status && status !== 'ALL') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/donations${query}`);
    return handleResponse<Donation[]>(res);
  },

  async getDonationById(id: string): Promise<Donation> {
    const res = await fetch(`${API_BASE_URL}/api/donations/${id}`);
    return handleResponse<Donation>(res);
  },

  async createDonation(payload: DonationCreateInput): Promise<Donation> {
    const res = await fetch(`${API_BASE_URL}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Donation>(res);
  },

  async updateDonation(id: string, payload: Partial<Donation>): Promise<Donation> {
    const res = await fetch(`${API_BASE_URL}/api/donations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Donation>(res);
  },

  async allocateDonation(id: string, payload: DonationAllocateInput): Promise<Donation> {
    const res = await fetch(`${API_BASE_URL}/api/donations/${id}/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Donation>(res);
  },

  async getCompatibleShelters(donationId: string): Promise<CompatibilityResult[]> {
    const res = await fetch(`${API_BASE_URL}/api/donations/${donationId}/compatible-shelters`);
    return handleResponse<CompatibilityResult[]>(res);
  },

  // --- Riders ---
  async getRiders(status?: string): Promise<Rider[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/riders${query}`);
    return handleResponse<Rider[]>(res);
  },

  async updateRider(id: string, payload: RiderUpdateInput): Promise<Rider> {
    const res = await fetch(`${API_BASE_URL}/api/riders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Rider>(res);
  },

  async updateRiderStatus(id: string, status: RiderStatus): Promise<Rider> {
    const res = await fetch(`${API_BASE_URL}/api/riders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse<Rider>(res);
  },

  // --- Shelters ---
  async getShelters(status?: string): Promise<Shelter[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/shelters${query}`);
    return handleResponse<Shelter[]>(res);
  },

  async updateShelter(id: string, payload: ShelterUpdateInput): Promise<Shelter> {
    const res = await fetch(`${API_BASE_URL}/api/shelters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Shelter>(res);
  },

  async closeShelter(id: string): Promise<Shelter> {
    const res = await fetch(`${API_BASE_URL}/api/shelters/${id}/close`, {
      method: 'POST',
    });
    return handleResponse<Shelter>(res);
  },

  async openShelter(id: string): Promise<Shelter> {
    const res = await fetch(`${API_BASE_URL}/api/shelters/${id}/open`, {
      method: 'POST',
    });
    return handleResponse<Shelter>(res);
  },

  // --- Deterministic Compatibility ---
  async checkCompatibility(payload: { category: string; shelter_id: string; quantity?: number }): Promise<CompatibilityResult> {
    const res = await fetch(`${API_BASE_URL}/api/compatibility/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<CompatibilityResult>(res);
  },

  // --- Phase 3: Auto-Allocation and Batch Splitting ---
  async triggerAutoAllocation(): Promise<AutoAllocationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/allocations/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<AutoAllocationResponse>(res);
  },

  async getAllocations(): Promise<Allocation[]> {
    const res = await fetch(`${API_BASE_URL}/api/allocations`);
    return handleResponse<Allocation[]>(res);
  },

  // --- Phase 5: Dispatch Lifecycle Transitions ---
  async pickupParcel(id: string): Promise<Allocation> {
    const res = await fetch(`${API_BASE_URL}/api/allocations/${id}/pickup`, {
      method: 'POST',
    });
    return handleResponse<Allocation>(res);
  },

  async inTransitParcel(id: string): Promise<Allocation> {
    const res = await fetch(`${API_BASE_URL}/api/allocations/${id}/in-transit`, {
      method: 'POST',
    });
    return handleResponse<Allocation>(res);
  },

  async deliverParcel(id: string): Promise<Allocation> {
    const res = await fetch(`${API_BASE_URL}/api/allocations/${id}/deliver`, {
      method: 'POST',
    });
    return handleResponse<Allocation>(res);
  },

  async releaseParcel(id: string): Promise<Allocation> {
    const res = await fetch(`${API_BASE_URL}/api/allocations/${id}/release`, {
      method: 'POST',
    });
    return handleResponse<Allocation>(res);
  },

  async updateParcelStatus(id: string, status: AllocationStatus, notes?: string): Promise<Allocation> {
    const res = await fetch(`${API_BASE_URL}/api/allocations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse<Allocation>(res);
  },

  // --- Phase 5: Chaos Simulation & Recovery Endpoints ---
  async simulateRiderGoSilent(riderId: string): Promise<RiderFailureResponse> {
    const res = await fetch(`${API_BASE_URL}/api/sim/rider/${riderId}/go-silent`, {
      method: 'POST',
    });
    return handleResponse<RiderFailureResponse>(res);
  },

  async simulateShelterFill(shelterId: string): Promise<ShelterDisruptionResponse> {
    const res = await fetch(`${API_BASE_URL}/api/sim/shelter/${shelterId}/fill`, {
      method: 'POST',
    });
    return handleResponse<ShelterDisruptionResponse>(res);
  },

  async simulateShelterClose(shelterId: string): Promise<ShelterDisruptionResponse> {
    const res = await fetch(`${API_BASE_URL}/api/sim/shelter/${shelterId}/close`, {
      method: 'POST',
    });
    return handleResponse<ShelterDisruptionResponse>(res);
  },

  async runSimulationScenario(scenarioName: string): Promise<ScenarioExecutionResponse> {
    const res = await fetch(`${API_BASE_URL}/api/sim/scenario/${scenarioName}`, {
      method: 'POST',
    });
    return handleResponse<ScenarioExecutionResponse>(res);
  },

  async resetSimulation(): Promise<SimulationResetResponse> {
    const res = await fetch(`${API_BASE_URL}/api/sim/reset`, {
      method: 'POST',
    });
    return handleResponse<SimulationResetResponse>(res);
  },

  // --- Routes & Map Configuration ---
  async calculateRoute(payload: {
    origin_lat: number;
    origin_lng: number;
    dest_lat: number;
    dest_lng: number;
    donor_name?: string;
    shelter_name?: string;
  }): Promise<RouteCalculationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<RouteCalculationResponse>(res);
  },

  async getMapConfig(): Promise<MapConfigResponse> {
    const res = await fetch(`${API_BASE_URL}/api/routes/config`);
    return handleResponse<MapConfigResponse>(res);
  },
};

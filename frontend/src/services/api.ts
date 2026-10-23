import { 
  DashboardResponse, 
  Donation, 
  Rider, 
  Shelter, 
  HealthResponse 
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
        errorMessage = parsed.detail;
      }
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse<HealthResponse>(res);
  },

  async getDashboard(): Promise<DashboardResponse> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard`);
    return handleResponse<DashboardResponse>(res);
  },

  async getDonations(urgency?: string, status?: string): Promise<Donation[]> {
    const params = new URLSearchParams();
    if (urgency && urgency !== 'ALL') params.append('urgency', urgency);
    if (status && status !== 'ALL') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/donations${query}`);
    return handleResponse<Donation[]>(res);
  },

  async getRiders(status?: string): Promise<Rider[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/riders${query}`);
    return handleResponse<Rider[]>(res);
  },

  async getShelters(status?: string): Promise<Shelter[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/shelters${query}`);
    return handleResponse<Shelter[]>(res);
  },
};

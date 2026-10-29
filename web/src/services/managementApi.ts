import { API_BASE_URL, getAuthHeaders } from './apiConfig';
import { GarageBackendResponse } from './garageApi';
import { RegisterPayload, User } from '../types/auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: getAuthHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok || !json.success) throw new ApiError(json.message || 'Thao tác thất bại', response.status);
  return json.data;
}

export interface Branch {
  id: number;
  branchName: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  rescueVehicles: string;
  operatingStatus: 'OPEN' | 'CLOSED_MAINTENANCE';
  mechanicsCount: number;
}

export interface Mechanic {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  speciality?: string;
  ratingAvg?: number;
  hasCrossingCapability?: boolean;
  avatarUrl?: string;
  branchId: number | null;
  branchName: string;
  shiftName: string;
  workingStatus: string;
  active: boolean;
}

export interface Invitation {
  code: string;
  email: string;
  expiresAt: string;
}

export const managementApi = {
  garage: () => request<GarageBackendResponse>('/garages/me'),
  branches: () => request<Branch[]>('/garages/branches'),
  mechanics: () => request<Mechanic[]>('/garages/mechanics'),
  staff: () => request<User[]>('/admin/staff'),
  invite: (staff: boolean, email: string, branchId?: number) =>
    request<Invitation>(staff ? '/admin/staff/invitations' : '/garages/mechanics/invitations', 'POST', {
      email,
      branchId
    }),
  activate: (code: string, account: Omit<RegisterPayload, 'application'>) =>
    request('/onboarding/activate', 'POST', { code, account })
};

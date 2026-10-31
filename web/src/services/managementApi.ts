import { API_BASE_URL, getAuthHeaders } from './apiConfig';
import { GarageBackendResponse } from './garageApi';
import { RegisterPayload, User } from '../types/auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public validationErrors?: Record<string, string>
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
  let json: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }
  if (!response.ok || (json && json.success === false)) {
    const message = json?.message || `Lỗi hệ thống (${response.status})`;
    throw new ApiError(message, response.status, json?.validationErrors);
  }
  return json?.data !== undefined ? json.data : json;
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
  userId?: number;
  username?: string;
  fullName: string;
  email: string;
  phone?: string;
  speciality?: string;
  ratingAvg?: number;
  hasCrossingCapability?: boolean;
  avatarUrl?: string;
  branchId: number | null;
  branchName: string;
  branchAddress?: string;
  shiftName: string;
  workingStatus: string;
  active: boolean;
}

export interface CreateMechanicPayload {
  username: string;
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  branchId?: number;
  shiftName?: string;
  speciality?: string;
  hasCrossingCapability?: boolean;
}

export interface UpdateMechanicPayload {
  fullName?: string;
  phone?: string;
  branchId?: number;
  shiftName?: string;
  speciality?: string;
  hasCrossingCapability?: boolean;
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
  createMechanic: (payload: CreateMechanicPayload) =>
    request<Mechanic>('/garages/mechanics', 'POST', payload),
  updateMechanic: (id: number, payload: UpdateMechanicPayload) =>
    request<Mechanic>(`/garages/mechanics/${id}`, 'PUT', payload),
  resetMechanicPassword: (id: number) =>
    request<string>(`/garages/mechanics/${id}/reset-password`, 'POST'),
  removeMechanic: (id: number) =>
    request<void>(`/garages/mechanics/${id}`, 'DELETE'),
  allocateMechanic: (id: number, branchId: number, shiftName?: string) =>
    request<Mechanic>(`/garages/mechanics/${id}/allocate`, 'PATCH', { branchId, shiftName }),
  toggleMechanicStatus: (id: number, active: boolean) =>
    request<Mechanic>(`/garages/mechanics/${id}/status`, 'PATCH', { active }),
  staff: () => request<User[]>('/admin/staff'),
  invite: (staff: boolean, email: string, branchId?: number) =>
    request<Invitation>(staff ? '/admin/staff/invitations' : '/garages/mechanics/invitations', 'POST', {
      email,
      branchId
    }),
  activate: (code: string, account: Omit<RegisterPayload, 'application'>) =>
    request('/onboarding/activate', 'POST', { code, account })
};

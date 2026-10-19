import { API_BASE_URL, getAuthHeaders } from './apiConfig';

export interface GarageBackendResponse {
  id: number;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  garageName: string;
  phone: string;
  businessLicenseUrl: string | null;
  idCardUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  walletBalance: number;
  rejectionReason?: string;
  createdAt: string;
  branchCount: number;
  mechanicCount: number;
  address?: string;
}

export interface GarageBranchBackend {
  id: number;
  garageId: number;
  garageName: string;
  branchName: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber?: string;
  rescueVehicles?: string;
  operatingStatus: string;
  createdAt?: string;
  mechanicsCount: number;
}

export interface GarageMechanicBackend {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  garageId: number;
  garageName: string;
  branchId?: number;
  branchName?: string;
  branchAddress?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  workingStatus: string;
  shiftName?: string;
  ratingAvg?: number;
  speciality?: string;
  createdAt?: string;
}

export interface ServiceItemBackend {
  id: number;
  serviceName: string;
  category: string;
  serviceType: string;
  standardPrice: number;
  minPrice: number;
  maxPrice: number;
  unit: string;
  estimatedTimeMin: number;
  description: string;
  active: boolean;
  warrantyDays: number;
}

export const garageApi = {
  // Staff methods (UC-03)
  getPendingGarages: async (): Promise<GarageBackendResponse[]> => {
    const res = await fetch(`${API_BASE_URL}/staff/garages/pending`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  getAllGarages: async (): Promise<GarageBackendResponse[]> => {
    const res = await fetch(`${API_BASE_URL}/staff/garages`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  getGarageById: async (id: number): Promise<GarageBackendResponse | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/garages/${id}`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  },

  getGarageBranches: async (id: number): Promise<GarageBranchBackend[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/garages/${id}/branches`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      return json.success ? json.data : [];
    } catch {
      return [];
    }
  },

  getGarageMechanics: async (id: number): Promise<GarageMechanicBackend[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/garages/${id}/mechanics`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      return json.success ? json.data : [];
    } catch {
      return [];
    }
  },

  moderateGarage: async (id: number, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', note?: string): Promise<GarageBackendResponse> => {
    const res = await fetch(`${API_BASE_URL}/staff/garages/${id}/moderate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, note })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Thao tác duyệt thất bại');
    return json.data;
  },

  // Owner methods (UC-06)
  getMyServices: async (): Promise<ServiceItemBackend[]> => {
    const res = await fetch(`${API_BASE_URL}/garages/services`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  createService: async (service: Partial<ServiceItemBackend>): Promise<ServiceItemBackend> => {
    const res = await fetch(`${API_BASE_URL}/garages/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(service)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Thêm dịch vụ thất bại');
    return json.data;
  },

  updateService: async (id: number, service: Partial<ServiceItemBackend>): Promise<ServiceItemBackend> => {
    const res = await fetch(`${API_BASE_URL}/garages/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(service)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Cập nhật dịch vụ thất bại');
    return json.data;
  },

  deleteService: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/garages/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Xóa dịch vụ thất bại');
  }
};

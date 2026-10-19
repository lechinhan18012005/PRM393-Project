import { API_BASE_URL, getAuthHeaders } from './apiConfig';

export interface GarageBackendResponse {
  id: number;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  garageName: string;
  phone: string;
  businessLicenseUrl: string;
  idCardUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  walletBalance: number;
  rejectionReason?: string;
  createdAt: string;
  branchCount: number;
  mechanicCount: number;
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

  moderateGarage: async (id: number, status: 'APPROVED' | 'REJECTED', note?: string): Promise<GarageBackendResponse> => {
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

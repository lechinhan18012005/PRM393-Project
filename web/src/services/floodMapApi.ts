import { API_BASE_URL, getAuthHeaders } from './apiConfig';

export interface FloodReportBackendResponse {
  id: number;
  reportedById: number;
  reportedByName: string;
  latitude: number;
  longitude: number;
  address: string;
  waterDepthLevel: 'ANKLE_20CM' | 'HALF_WHEEL_40CM' | 'SEAT_60CM_PLUS';
  imageUrls: string;
  description: string;
  confidenceScore: number;
  clusterCount: number;
  moderationStatus: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'REJECTED';
  moderatedById?: number;
  moderatedByName?: string;
  moderatorNote?: string;
  nearbyStations?: string;
  createdAt: string;
}

export const floodMapApi = {
  // Staff methods (UC-21)
  getAllFloodReports: async (): Promise<FloodReportBackendResponse[]> => {
    const res = await fetch(`${API_BASE_URL}/staff/flood-reports`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  moderateFloodReport: async (
    id: number,
    status: 'APPROVED' | 'REJECTED' | 'EXPIRED',
    moderatorNote?: string,
    nearbyStations?: string
  ): Promise<FloodReportBackendResponse> => {
    const res = await fetch(`${API_BASE_URL}/staff/flood-reports/${id}/moderate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, moderatorNote, nearbyStations })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Kiểm duyệt điểm ngập thất bại');
    return json.data;
  },

  resolveWaterReceded: async (id: number): Promise<FloodReportBackendResponse> => {
    const res = await fetch(`${API_BASE_URL}/staff/flood-reports/${id}/resolve`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Cập nhật nước rút thất bại');
    return json.data;
  },

  // Public active flood points (UC-22)
  getActiveFloodPoints: async (): Promise<FloodReportBackendResponse[]> => {
    const res = await fetch(`${API_BASE_URL}/flood-reports/active`);
    const json = await res.json();
    return json.success ? json.data : [];
  }
};

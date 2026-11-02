import { BatchTrip } from '../types';
import { API_BASE_URL, getAuthHeaders } from './apiConfig';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function getBatchTripsForStaff(): Promise<BatchTrip[]> {
  const response = await fetch(`${API_BASE_URL}/batch-trips/monitor`, {
    headers: getAuthHeaders(),
  });
  const payload = (await response.json()) as ApiResponse<BatchTrip[]>;
  if (!response.ok || payload.success !== true) {
    throw new Error(payload.message || 'Không thể tải danh sách chuyến gom');
  }
  return payload.data;
}

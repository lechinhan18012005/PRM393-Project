import { request } from './managementApi';

export interface RescueOrderWebResponse {
  id: number;
  orderCode: string;
  orderType: string;
  status: string;
  transportStage: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  garageId: number;
  garageName: string;
  garagePhone?: string;
  branchId?: number;
  branchName?: string;
  branchAddress?: string;
  mechanicStaffId: number | null;
  mechanicUserId: number | null;
  mechanicName: string | null;
  mechanicPhone: string | null;
  mechanicAvatar?: string;
  mechanicRating?: number;
  mechanicSpeciality?: string;
  vehicleId: number;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleType?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  waterLevel: string;
  customerNotes?: string;
  serviceBasePrice: number;
  bookingFee: number;
  totalAmount: number;
  currency?: string;
  completionPhotoUrl: string | null;
  handoverPhotoUrl: string | null;
  completionNotes: string | null;
  cancelReason: string | null;
  requestedAt: string;
  acceptedAt?: string | null;
  arrivedAt?: string | null;
  serviceStartedAt?: string | null;
  serviceCompletedAt?: string | null;
  cancelledAt?: string | null;
  supportHotline?: string | null;
}

export const rescueApi = {
  getStaffOrders: () => request<RescueOrderWebResponse[]>('/staff/rescue/orders'),
  getGarageOrders: () => request<RescueOrderWebResponse[]>('/garage/rescue/orders'),
  getOrderById: (orderId: number) => request<RescueOrderWebResponse>(`/rescue/orders/${orderId}`),
};

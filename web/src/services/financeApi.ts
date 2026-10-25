import { API_BASE_URL, getAuthHeaders } from './apiConfig';

export interface CommissionConfigBackend {
  id: number;
  globalRate: number;
  singleCrossingRate: number;
  batchCrossingRate: number;
  waterloggedRepairRate: number;
  surgeHoursRate: number;
  subsidyRate: number;
  baseFee: number;
  perKmFee: number;
  versionCode: string;
  changeSummary: string;
  approvalReason: string;
  active: boolean;
  updatedByUserId?: number;
  updatedByName: string;
  updatedByRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCommissionRequest {
  globalRate: number;
  singleCrossingRate: number;
  batchCrossingRate: number;
  waterloggedRepairRate: number;
  surgeHoursRate: number;
  subsidyRate: number;
  baseFee: number;
  perKmFee: number;
  versionCode?: string;
  changeSummary?: string;
  approvalReason?: string;
}

export interface PayoutRequestBackend {
  id: number;
  requestCode: string;
  garageId: number;
  garageName: string;
  garageOwnerName: string;
  garagePhone: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  requestedAmount: number;
  walletBalance: number;
  availableBalance: number;
  status: 'PENDING' | 'APPROVED' | 'TRANSFERRED' | 'REJECTED';
  adminReviewerId?: number;
  adminReviewerName?: string;
  adminNote?: string;
  transactionReference?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PaymentTransactionBackend {
  id: number;
  rescueOrderId: number;
  rescueCode: string;
  orderType: string;
  garageId: number;
  garageName: string;
  customerId?: number;
  customerName: string;
  customerPhone: string;
  payosOrderCode: number;
  amount: number;
  commissionRate: number;
  platformFee: number;
  netGarageAmount: number;
  paymentMethod: 'PAYOS_VIETQR' | 'CASH';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  reconciled: boolean;
  checksumValid: boolean;
  webhookSignature?: string;
  qrCode?: string;
  checkoutUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  paymentContent?: string;
  rawWebhookPayload?: string;
  createdAt: string;
  paidAt?: string;
  reconciledAt?: string;
}

export const financeApi = {
  // UC-24: Commission configuration & history
  getActiveCommission: async (): Promise<CommissionConfigBackend> => {
    const res = await fetch(`${API_BASE_URL}/finance/commission`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Không thể tải cấu hình hoa hồng');
    return json.data;
  },

  getCommissionHistory: async (): Promise<CommissionConfigBackend[]> => {
    const res = await fetch(`${API_BASE_URL}/finance/commission/history`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  updateCommission: async (payload: UpdateCommissionRequest): Promise<CommissionConfigBackend> => {
    const res = await fetch(`${API_BASE_URL}/finance/commission`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Cập nhật cấu hình hoa hồng thất bại');
    return json.data;
  },

  // UC-26: Admin Payout management
  getAllPayouts: async (status?: string): Promise<PayoutRequestBackend[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE_URL}/finance/payouts${query}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  processPayout: async (
    id: number,
    status: 'APPROVED' | 'TRANSFERRED' | 'REJECTED',
    adminNote?: string,
    transactionReference?: string
  ): Promise<PayoutRequestBackend> => {
    const res = await fetch(`${API_BASE_URL}/finance/payouts/${id}/process`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, adminNote, transactionReference })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Xử lý lệnh rút tiền thất bại');
    return json.data;
  },

  // UC-25: PayOS Cash Flow Monitoring & Reconciliation
  getPaymentTransactions: async (status?: string, method?: string): Promise<PaymentTransactionBackend[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (method) params.append('method', method);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/finance/transactions${qs}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  reconcileAllTransactions: async (): Promise<PaymentTransactionBackend[]> => {
    const res = await fetch(`${API_BASE_URL}/finance/transactions/reconcile`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Đối soát giao dịch thất bại');
    return json.data;
  }
};

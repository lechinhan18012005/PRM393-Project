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

export interface DisputeBackendResponse {
  id: number;
  disputeCode: string;
  rescueOrderId: number;
  rescueCode: string;
  paymentTransactionId?: number;
  payosOrderCode?: number;
  customerId?: number;
  customerName: string;
  customerPhone?: string;
  garageId?: number;
  garageName?: string;
  garageWalletBalance: number;
  disputeType: 'OVERCHARGE' | 'POOR_QUALITY' | 'DAMAGE' | 'FAKE_RESCUE';
  originalAmount: number;
  requestedRefundAmount: number;
  proposedRefundAmount?: number;
  approvedRefundAmount?: number;
  customerReason: string;
  evidenceImageUrls?: string;
  status: 'STAFF_REVIEW' | 'ADMIN_APPROVAL' | 'REFUNDED' | 'REJECTED';
  staffReviewerId?: number;
  staffReviewerName?: string;
  staffFindingNote?: string;
  staffReviewedAt?: string;
  adminApproverId?: number;
  adminApproverName?: string;
  refundSource?: 'GARAGE_WALLET' | 'PLATFORM_FUND';
  adminResolutionNote?: string;
  refundReferenceCode?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ServiceRatingBackendResponse {
  id: number;
  rescueOrderId: number;
  rescueCode: string;
  customerId?: number;
  customerName: string;
  garageId?: number;
  garageName?: string;
  mechanicStaffId?: number;
  mechanicName?: string;
  mechanicRatingAvg?: number;
  stars: number;
  tags?: string;
  comment?: string;
  createdAt: string;
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
  },

  // UC-23: Staff Dispute Investigation & Refund Proposal
  getStaffDisputes: async (status?: string): Promise<DisputeBackendResponse[]> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE_URL}/staff/disputes${qs}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  reviewDisputeByStaff: async (
    id: number,
    decision: 'ADMIN_APPROVAL' | 'REJECTED',
    proposedRefundAmount: number,
    staffFindingNote: string
  ): Promise<DisputeBackendResponse> => {
    const res = await fetch(`${API_BASE_URL}/staff/disputes/${id}/review`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        decision,
        proposedRefundAmount,
        staffFindingNote
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Cập nhật biên bản khiếu nại thất bại');
    return json.data;
  },

  // UC-27: Admin Refund Decision & Execution
  getAdminRefundCases: async (status?: string): Promise<DisputeBackendResponse[]> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE_URL}/finance/refunds${qs}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  processRefundByAdmin: async (
    id: number,
    decision: 'REFUNDED' | 'REJECTED' | 'STAFF_REVIEW',
    approvedRefundAmount?: number,
    refundSource?: 'GARAGE_WALLET' | 'PLATFORM_FUND',
    adminResolutionNote?: string,
    refundReferenceCode?: string
  ): Promise<DisputeBackendResponse> => {
    const res = await fetch(`${API_BASE_URL}/finance/refunds/${id}/process`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        decision,
        approvedRefundAmount,
        refundSource,
        adminResolutionNote,
        refundReferenceCode
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Thực thi quyết định hoàn tiền thất bại');
    return json.data;
  },

  // UC-19: Service Ratings & Reviews (CSAT / SLA Monitoring)
  getAllRatings: async (): Promise<ServiceRatingBackendResponse[]> => {
    const res = await fetch(`${API_BASE_URL}/ratings`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  },

  getGarageRatings: async (garageId: number): Promise<ServiceRatingBackendResponse[]> => {
    const res = await fetch(`${API_BASE_URL}/ratings/garage/${garageId}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success ? json.data : [];
  }
};

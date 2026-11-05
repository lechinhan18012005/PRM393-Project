// ============================================================================
// DỊCH VỤ GỌI API QUẢN TRỊ TÀI CHÍNH, CHIẾT KHẤU GARA, ĐỐI SOÁT PAYOS, RÚT TIỀN & HOÀN TIỀN
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích: Định nghĩa đầy đủ các kiểu dữ liệu TypeScript (DTO Interfaces) và các hàm gọi
// RESTful API kết nối trực tiếp tới cơ sở dữ liệu Backend (`/api/v1/finance/...`, `/api/v1/staff/disputes/...`, `/api/v1/ratings/...`).
// Bao gồm các nghiệp vụ cốt lõi:
// - UC-24: Quản lý phí chiết khấu theo từng Gara đối tác và cấu hình hoa hồng mặc định hệ thống.
// - UC-25: Giám sát dòng tiền, đối soát giao dịch thanh toán PayOS / VietQR và thống kê doanh thu.
// - UC-26: Thẩm định và phê duyệt / từ chối yêu cầu rút tiền (giải ngân) về ngân hàng của Gara.
// - UC-23 & UC-27: Điều tra khiếu nại dịch vụ (Staff) và phán quyết hoàn tiền cho khách hàng (Admin).
// - UC-19: Đồng bộ đánh giá sao và nhận xét chất lượng dịch vụ sau cứu hộ (CSAT / SLA).
// ============================================================================

import { API_BASE_URL, getAuthHeaders } from './apiConfig';

/**
 * Giao diện mô tả bản ghi Cấu hình tỷ lệ hoa hồng mặc định của nền tảng (CommissionConfigBackend)
 * cũng như từng dòng trong bảng Lịch sử thay đổi chiết khấu (Audit Trail).
 */
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

/**
 * Payload gửi lên khi Admin cập nhật tỷ lệ chiết khấu mặc định cho toàn hệ thống (`PUT /api/v1/finance/commission`).
 */
export interface UpdateCommissionRequest {
  globalRate: number;
  singleCrossingRate?: number;
  batchCrossingRate?: number;
  waterloggedRepairRate?: number;
  surgeHoursRate?: number;
  subsidyRate?: number;
  baseFee?: number;
  perKmFee?: number;
  versionCode?: string;
  changeSummary?: string;
  approvalReason?: string;
}

/**
 * Giao diện tóm tắt một Dịch vụ cứu hộ / sửa chữa mà Gara đang cung cấp (`GarageServiceSummaryDto`).
 * Được trả về kèm theo thông tin chiết khấu của từng Gara từ Database (Yêu cầu #2 & #4).
 */
export interface GarageServiceSummaryDto {
  // Mã định danh dịch vụ trong bảng garage_services
  id: number;
  // Tên dịch vụ cứu hộ hoặc sửa chữa (ví dụ: Kích bình, Thay bugi ngập nước, Chở xe vượt ngập)
  serviceName: string;
  // Đơn giá cơ bản niêm yết của Gara cho dịch vụ này (VNĐ)
  basePrice: number;
  // Trạng thái dịch vụ đang bật hay tạm ngưng cung cấp
  isActive: boolean;
}

/**
 * Giao diện mô tả thông tin Chiết khấu, Số dư ví và Danh mục dịch vụ của từng Gara đối tác (`GarageCommissionDto`).
 * Dữ liệu lấy 100% từ Database thông qua API `GET /api/v1/finance/garages/commissions` (Yêu cầu #2 & #4).
 */
export interface GarageCommissionDto {
  // Mã định danh Gara trong Database
  garageId: number;
  // Tên thương mại của Gara đối tác
  garageName: string;
  // Số điện thoại đường dây nóng của Gara
  phone: string;
  // Địa chỉ trụ sở chính của Gara
  address: string;
  // Trạng thái phê duyệt của Gara (APPROVED, PENDING, SUSPENDED...)
  status: string;
  // Cờ xác nhận Gara đã hoàn tất xác thực pháp lý eKYC
  isVerified: boolean;
  // Cờ trạng thái Gara đang mở cửa trực tuyến nhận đơn cứu hộ
  isOnline: boolean;
  // Tỷ lệ phí chiết khấu nền tảng áp dụng riêng cho Gara này (ví dụ: 12.5 tương ứng 12.5%)
  commissionRate: number;
  // Số dư hiện tại trong ví điện tử của Gara trên hệ thống (VNĐ)
  walletBalance: number;
  // Tổng số dịch vụ mà Gara này đã đăng ký cung cấp
  serviceCount: number;
  // Danh sách chi tiết các dịch vụ của Gara kèm giá gốc
  services: GarageServiceSummaryDto[];
  // Thời điểm cập nhật cấu hình chiết khấu gần nhất
  updatedAt?: string;
}

/**
 * Giao diện mô tả Yêu cầu rút tiền / giải ngân của Gara đối tác (`PayoutRequestBackend`).
 * Hỗ trợ đầy đủ các trường trả về từ Backend cho cả chuẩn tên trường mới và cũ để tương thích tuyệt đối.
 */
export interface PayoutRequestBackend {
  id: number;
  requestCode?: string;
  garageId: number;
  garageName: string;
  garageOwnerName?: string;
  garagePhone?: string;
  bankCode?: string;
  bankName: string;
  accountNumber?: string;
  bankAccount?: string;
  accountHolderName: string;
  requestedAmount?: number;
  amount?: number;
  walletBalance?: number;
  availableBalance?: number;
  // Trạng thái yêu cầu rút tiền: PENDING, PROCESSING, APPROVED, TRANSFERRED, COMPLETED, REJECTED
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'TRANSFERRED' | 'COMPLETED' | 'REJECTED' | string;
  adminReviewerId?: number;
  adminReviewerName?: string;
  adminNote?: string;
  adminNotes?: string;
  transactionReference?: string;
  createdAt: string;
  processedAt?: string;
}

/**
 * Giao diện mô tả Giao dịch thanh toán đơn cứu hộ qua cổng PayOS / VietQR / Tiền mặt (`PaymentTransactionBackend`).
 * Tương thích với cả DTO `PaymentTransactionResponse` hiện hành và các trường mở rộng.
 */
export interface PaymentTransactionBackend {
  id: number;
  rescueOrderId?: number;
  rescueRequestId?: number;
  rescueCode?: string;
  orderType?: string;
  garageId?: number;
  garageName: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  payosOrderCode?: number | string;
  // Tổng số tiền khách hàng thanh toán cho đơn cứu hộ (VNĐ)
  amount?: number;
  totalAmount?: number;
  // Tỷ lệ phần trăm hoa hồng nền tảng áp dụng cho giao dịch
  commissionRate: number;
  // Số tiền phí chiết khấu nền tảng thu được từ giao dịch (VNĐ)
  platformFee?: number;
  platformCommission?: number;
  // Số tiền thực nhận cộng vào ví của Gara sau khi trừ phí chiết khấu (VNĐ)
  netGarageAmount?: number;
  garageNetAmount?: number;
  // Phương thức thanh toán: PAYOS, VIETQR, PAYOS_VIETQR, hoặc CASH
  paymentMethod: 'PAYOS' | 'VIETQR' | 'PAYOS_VIETQR' | 'CASH' | string;
  // Trạng thái thanh toán: PAID, SUCCESS, PENDING, REFUNDED, FAILED
  status?: 'PAID' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | string;
  paymentStatus?: 'PAID' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | string;
  reconciled?: boolean;
  checksumValid?: boolean;
  webhookReceived?: boolean;
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

/**
 * Giao diện mô tả Hồ sơ khiếu nại & yêu cầu hoàn tiền (`DisputeBackendResponse`).
 * Phục vụ cả màn hình Staff xác minh khiếu nại (UC-23) và màn hình Admin quyết định hoàn tiền (UC-27).
 */
export interface DisputeBackendResponse {
  id: number;
  disputeCode?: string;
  rescueOrderId?: number;
  rescueRequestId?: number;
  rescueCode?: string;
  paymentTransactionId?: number;
  payosOrderCode?: number;
  customerId?: number;
  customerName: string;
  customerPhone?: string;
  garageId?: number;
  garageName?: string;
  garageWalletBalance?: number;
  // Phân loại khiếu nại: OVERCHARGE (Thu quá giá), POOR_QUALITY (Chất lượng kém), DAMAGE (Hư hỏng xe), FAKE_RESCUE (Báo cáo sai)
  disputeType: 'OVERCHARGE' | 'POOR_QUALITY' | 'DAMAGE' | 'FAKE_RESCUE' | string;
  originalAmount?: number;
  requestedRefundAmount: number;
  proposedRefundAmount?: number;
  approvedRefundAmount?: number;
  refundAmount?: number;
  // Lý do và mô tả chi tiết từ phía khách hàng
  customerReason?: string;
  reason?: string;
  description?: string;
  evidenceImageUrls?: string;
  // Trạng thái xử lý khiếu nại trong quy trình 2 cấp (Staff -> Admin)
  status:
    | 'OPEN'
    | 'UNDER_REVIEW'
    | 'STAFF_REVIEW'
    | 'ESCALATED_TO_ADMIN'
    | 'ADMIN_APPROVAL'
    | 'RESOLVED_REFUND'
    | 'REFUNDED'
    | 'REJECTED'
    | string;
  staffReviewerId?: number;
  staffReviewerName?: string;
  staffFindingNote?: string;
  staffResolutionNotes?: string;
  staffReviewedAt?: string;
  adminApproverId?: number;
  adminApproverName?: string;
  // Nguồn tiền trích hoàn trả cho khách: Ví Gara (GARAGE_WALLET) hoặc Quỹ dự phòng sàn (PLATFORM_RESERVE / PLATFORM_FUND)
  refundSource?: 'GARAGE_WALLET' | 'PLATFORM_FUND' | 'PLATFORM_RESERVE' | string;
  adminResolutionNote?: string;
  resolutionNotes?: string;
  refundReferenceCode?: string;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * Giao diện mô tả Đánh giá sao & Nhận xét của khách hàng sau ca cứu hộ (`ServiceRatingBackendResponse` - UC-19).
 */
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

export interface GarageWalletBackend {
  garageId: number;
  garageName: string;
  walletBalance: number;
  pendingPayoutAmount: number;
  availableBalance: number;
  totalWithdrawnAmount: number;
  recentTransactions: {
    id: number;
    amount: number;
    balanceAfter: number;
    transactionType: string;
    referenceCode?: string;
    description?: string;
    createdAt: string;
  }[];
  payoutRequests: PayoutRequestBackend[];
  revenue?: {
    month: string;
    paidOrderCount: number;
    netRevenue: number;
    platformFee: number;
    revenueByService: Record<string, number>;
  } | null;
}

export interface CreateGaragePayoutRequest {
  requestedAmount: number;
  bankCode: string;
  bankName?: string;
  accountNumber: string;
  accountHolderName: string;
}

async function readWalletResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Không thể kết nối ví gara. Vui lòng thử lại.');
  }
  return json.data;
}

/**
 * Giao diện thống kê tổng quan doanh thu, dòng tiền và nghĩa vụ tài chính toàn nền tảng (`PlatformRevenueStats`).
 * Bao gồm đầy đủ các trường từ `PlatformRevenueStatsDto` của Backend và các trường mở rộng theo Yêu cầu #2.
 */
export interface PlatformRevenueStats {
  activeCommissionRate: number;
  totalPaidTransactionCount: number;
  reconciledTransactionCount: number;
  totalGrossRevenueGmv: number;
  totalPlatformFeeEarned: number;
  totalNetGarageSettlement: number;
  pendingPayoutCount: number;
  pendingPayoutTotalAmount: number;
  transferredPayoutCount: number;
  transferredPayoutTotalAmount: number;
  totalGarageWalletBalances: number;
  // Các trường thống kê mở rộng trả về từ Backend (Yêu cầu #2)
  totalRefundedAmount?: number;
  refundedTransactionsCount?: number;
  failedTransactionsCount?: number;
  pendingTransactionsCount?: number;
  completedPayoutsCount?: number;
  completedPayoutAmount?: number;
  openDisputesCount?: number;
}

/**
 * Payload linh hoạt cho thao tác xử lý yêu cầu rút tiền của Admin (`processPayout`).
 */
export interface ProcessPayoutPayload {
  // Cờ phê duyệt (true = Duyệt đã chuyển khoản, false = Từ chối & hoàn tiền lại ví Gara)
  approve?: boolean;
  // Trạng thái tường minh gửi xuống Backend ('TRANSFERRED' | 'APPROVED' | 'REJECTED')
  status?: 'APPROVED' | 'TRANSFERRED' | 'COMPLETED' | 'REJECTED';
  // Ghi chú thẩm định của Admin
  adminNotes?: string;
  adminNote?: string;
  // Mã tham chiếu giao dịch ngân hàng (UNC / FT / Napas247 Reference)
  transactionReference?: string;
}

/**
 * Payload linh hoạt cho thao tác phán quyết hoàn tiền của Admin (`processRefund`).
 */
export interface ProcessRefundPayload {
  // Quyết định của Admin: APPROVE_REFUND / REFUNDED hoặc REJECT_REFUND / REJECTED hoặc STAFF_REVIEW
  decision: 'APPROVE_REFUND' | 'REJECT_REFUND' | 'REFUNDED' | 'REJECTED' | 'STAFF_REVIEW';
  // Số tiền duyệt hoàn trả cho khách hàng (VNĐ)
  refundAmount?: number;
  approvedRefundAmount?: number;
  // Nguồn trích tiền hoàn: GARAGE_WALLET (Ví Gara) hoặc PLATFORM_RESERVE / PLATFORM_FUND (Quỹ dự phòng nền tảng)
  refundSource?: 'GARAGE_WALLET' | 'PLATFORM_RESERVE' | 'PLATFORM_FUND';
  // Nội dung phán quyết / biên bản kết luận của Admin
  resolutionNotes?: string;
  adminResolutionNote?: string;
  // Mã tham chiếu bút toán hoàn tiền
  refundReferenceCode?: string;
}

/**
 * Đối tượng `financeApi` cung cấp toàn bộ các phương thức giao tiếp với phân hệ Tài chính ở Backend.
 */
export const financeApi = {
  getGarageWallet: async (signal?: AbortSignal): Promise<GarageWalletBackend> => {
    const response = await fetch(`${API_BASE_URL}/garages/wallet`, { headers: getAuthHeaders(), signal });
    return readWalletResponse<GarageWalletBackend>(response);
  },

  createGaragePayout: async (payload: CreateGaragePayoutRequest): Promise<PayoutRequestBackend> => {
    const response = await fetch(`${API_BASE_URL}/garages/wallet/payouts`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
    });
    return readWalletResponse<PayoutRequestBackend>(response);
  },
  // ==========================================================================
  // 1. THỐNG KÊ TỔNG QUAN DOANH THU & DÒNG TIỀN NỀN TẢNG (UC-25)
  // ==========================================================================

  /**
   * Lấy số liệu thống kê tổng quan tài chính toàn hệ thống từ Database (`GET /api/v1/finance/stats`).
   */
  getStats: async (): Promise<PlatformRevenueStats> => {
    const res = await fetch(`${API_BASE_URL}/finance/stats`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Không thể tải số liệu thống kê tài chính từ máy chủ');
    }
    return json.data;
  },

  // ==========================================================================
  // 2. QUẢN LÝ PHÍ CHIẾT KHẤU THEO TỪNG GARA & CẤU HÌNH MẶC ĐỊNH (UC-24)
  // ==========================================================================

  /**
   * Lấy cấu hình tỷ lệ hoa hồng mặc định đang có hiệu lực trên toàn hệ thống (`GET /api/v1/finance/commission`).
   */
  getActiveCommission: async (): Promise<CommissionConfigBackend> => {
    const res = await fetch(`${API_BASE_URL}/finance/commission`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Không thể tải cấu hình hoa hồng mặc định');
    }
    return json.data;
  },

  /**
   * Lấy lịch sử thay đổi cấu hình chiết khấu (Audit Log) từ Database (`GET /api/v1/finance/commission/history`).
   */
  getCommissionHistory: async (): Promise<CommissionConfigBackend[]> => {
    const res = await fetch(`${API_BASE_URL}/finance/commission/history`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  /**
   * Cập nhật cấu hình tỷ lệ chiết khấu mặc định cho Gara mới (`PUT /api/v1/finance/commission`).
   * Chỉ tài khoản có vai trò ADMIN mới có quyền thực thi API này.
   */
  updateCommission: async (payload: UpdateCommissionRequest): Promise<CommissionConfigBackend> => {
    // Chuẩn hóa payload để luôn đáp ứng các trường bắt buộc (@NotNull) ở DTO Backend
    const normalizedPayload = {
      globalRate: payload.globalRate,
      singleCrossingRate: payload.singleCrossingRate ?? payload.globalRate,
      batchCrossingRate: payload.batchCrossingRate ?? payload.globalRate,
      waterloggedRepairRate: payload.waterloggedRepairRate ?? payload.globalRate,
      surgeHoursRate: payload.surgeHoursRate ?? payload.globalRate,
      subsidyRate: payload.subsidyRate ?? 0,
      baseFee: payload.baseFee ?? 25000,
      perKmFee: payload.perKmFee ?? 10000,
      versionCode: payload.versionCode,
      changeSummary: payload.changeSummary,
      approvalReason: payload.approvalReason
    };
    const res = await fetch(`${API_BASE_URL}/finance/commission`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(normalizedPayload)
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Cập nhật cấu hình hoa hồng mặc định thất bại');
    }
    return json.data;
  },

  /**
   * Lấy danh sách toàn bộ các Gara đối tác kèm theo tỷ lệ chiết khấu hiện hành, số dư ví và danh mục dịch vụ
   * từ Database (`GET /api/v1/finance/garages/commissions` - Yêu cầu #2 & #4).
   */
  getGarageCommissions: async (): Promise<GarageCommissionDto[]> => {
    const res = await fetch(`${API_BASE_URL}/finance/garages/commissions`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json?.message || 'Không thể tải danh sách chiết khấu của các Gara đối tác');
    }
    return Array.isArray(json.data) ? json.data : [];
  },

  /**
   * Cập nhật trực tiếp tỷ lệ phí chiết khấu (`commissionRate`%) cho một Gara đối tác cụ thể
   * (`PATCH /api/v1/finance/garages/${garageId}/commission` - Yêu cầu #2 & #4).
   * Chỉ Quản trị viên (ROLE_ADMIN) mới được phép gọi endpoint này.
   */
  updateGarageCommission: async (
    garageId: number,
    payload: { commissionRate: number; notes?: string }
  ): Promise<GarageCommissionDto> => {
    const res = await fetch(`${API_BASE_URL}/finance/garages/${garageId}/commission`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json?.message || 'Cập nhật tỷ lệ chiết khấu cho Gara thất bại');
    }
    return json.data;
  },

  // ==========================================================================
  // 3. ĐỐI SOÁT GIAO DỊCH THANH TOÁN PAYOS & VIETQR (UC-25)
  // ==========================================================================

  /**
   * Lấy danh sách toàn bộ các giao dịch thanh toán từ Database (`GET /api/v1/finance/transactions`).
   * Hỗ trợ lọc tùy chọn theo trạng thái thanh toán (`status`) và phương thức thanh toán (`method`).
   */
  getTransactions: async (status?: string, method?: string): Promise<PaymentTransactionBackend[]> => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (method && method !== 'ALL') params.append('method', method);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/finance/transactions${qs}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  // Bí danh tương thích ngược với các component gọi tên cũ `getPaymentTransactions`
  getPaymentTransactions: async (status?: string, method?: string): Promise<PaymentTransactionBackend[]> => {
    return financeApi.getTransactions(status, method);
  },

  /**
   * Kích hoạt tiến trình đối soát tự động toàn bộ giao dịch PayOS hợp lệ (`POST /api/v1/finance/transactions/reconcile`).
   */
  reconcileAllTransactions: async (): Promise<PaymentTransactionBackend[]> => {
    const res = await fetch(`${API_BASE_URL}/finance/transactions/reconcile`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Đối soát giao dịch tự động thất bại');
    }
    return Array.isArray(json.data) ? json.data : [];
  },

  // ==========================================================================
  // 4. QUẢN LÝ YÊU CẦU RÚT TIỀN / GIẢI NGÂN VÍ GARA (UC-26)
  // ==========================================================================

  /**
   * Lấy danh sách toàn bộ yêu cầu rút tiền của các Gara đối tác từ Database (`GET /api/v1/finance/payouts`).
   */
  getPayouts: async (status?: string): Promise<PayoutRequestBackend[]> => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE_URL}/finance/payouts${query}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  // Bí danh tương thích ngược với tên hàm `getAllPayouts`
  getAllPayouts: async (status?: string): Promise<PayoutRequestBackend[]> => {
    return financeApi.getPayouts(status);
  },

  /**
   * Xử lý phê duyệt giải ngân hoặc từ chối yêu cầu rút tiền của Gara (`PATCH /api/v1/finance/payouts/${id}/process`).
   * Hỗ trợ truyền tham số theo cả dạng đối tượng `ProcessPayoutPayload` (`{ approve, adminNotes, transactionReference }`)
   * lẫn dạng tham số rời `(id, status, adminNote, transactionReference)` để tương thích hoàn toàn.
   */
  processPayout: async (
    id: number,
    statusOrPayload: 'APPROVED' | 'TRANSFERRED' | 'REJECTED' | ProcessPayoutPayload,
    adminNoteArg?: string,
    transactionReferenceArg?: string
  ): Promise<PayoutRequestBackend> => {
    let bodyPayload: Record<string, unknown>;

    if (typeof statusOrPayload === 'object' && statusOrPayload !== null) {
      // Khi gọi theo chuẩn mới: financeApi.processPayout(id, { approve, adminNotes, transactionReference })
      const isApproved =
        statusOrPayload.approve !== undefined
          ? statusOrPayload.approve
          : statusOrPayload.status !== 'REJECTED';
      const mappedStatus = isApproved ? 'TRANSFERRED' : 'REJECTED';
      const note = statusOrPayload.adminNotes ?? statusOrPayload.adminNote ?? '';
      bodyPayload = {
        approve: isApproved,
        status: mappedStatus,
        adminNote: note,
        adminNotes: note,
        transactionReference: statusOrPayload.transactionReference || undefined
      };
    } else {
      // Khi gọi theo chuẩn tham số rời
      const isApproved = statusOrPayload !== 'REJECTED';
      bodyPayload = {
        approve: isApproved,
        status: statusOrPayload,
        adminNote: adminNoteArg,
        adminNotes: adminNoteArg,
        transactionReference: transactionReferenceArg
      };
    }

    const res = await fetch(`${API_BASE_URL}/finance/payouts/${id}/process`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(bodyPayload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json?.message || 'Xử lý yêu cầu rút tiền thất bại');
    }
    return json.data;
  },

  // ==========================================================================
  // 5. QUẢN LÝ KHIẾU NẠI & PHÁN QUYẾT HOÀN TIỀN (UC-23 STAFF & UC-27 ADMIN)
  // ==========================================================================

  /**
   * Lấy danh sách hồ sơ khiếu nại dành cho nhân viên điều phối Staff (`GET /api/v1/staff/disputes`).
   */
  getStaffDisputes: async (status?: string): Promise<DisputeBackendResponse[]> => {
    const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE_URL}/staff/disputes${qs}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  /**
   * Staff gửi biên bản xác minh hiện trường và đề xuất mức hoàn tiền lên Admin (`PATCH /api/v1/staff/disputes/${id}/review`).
   */
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
    if (!res.ok || !json.success) {
      throw new Error(json?.message || 'Cập nhật biên bản xác minh khiếu nại thất bại');
    }
    return json.data;
  },

  /**
   * Lấy danh sách toàn bộ hồ sơ khiếu nại & yêu cầu hoàn tiền từ Database dành cho Admin (`GET /api/v1/finance/refunds`).
   */
  getRefunds: async (status?: string): Promise<DisputeBackendResponse[]> => {
    const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE_URL}/finance/refunds${qs}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  // Bí danh tương thích ngược với tên hàm `getAdminRefundCases`
  getAdminRefundCases: async (status?: string): Promise<DisputeBackendResponse[]> => {
    return financeApi.getRefunds(status);
  },

  /**
   * Admin phán quyết và thực thi hoàn tiền hoặc từ chối hoàn tiền (`PATCH /api/v1/finance/refunds/${id}/process`).
   * Hỗ trợ truyền đối tượng `ProcessRefundPayload` hoặc truyền danh sách tham số rời.
   */
  processRefund: async (
    id: number,
    payloadOrDecision: ProcessRefundPayload | 'REFUNDED' | 'REJECTED' | 'STAFF_REVIEW',
    approvedRefundAmountArg?: number,
    refundSourceArg?: 'GARAGE_WALLET' | 'PLATFORM_FUND' | 'PLATFORM_RESERVE',
    adminResolutionNoteArg?: string,
    refundReferenceCodeArg?: string
  ): Promise<DisputeBackendResponse> => {
    let bodyPayload: Record<string, unknown>;

    if (typeof payloadOrDecision === 'object' && payloadOrDecision !== null) {
      // Ánh xạ giá trị decision từ giao diện ('APPROVE_REFUND' / 'REJECT_REFUND') sang enum DisputeStatus ở Backend ('REFUNDED' / 'REJECTED')
      const backendDecision =
        payloadOrDecision.decision === 'APPROVE_REFUND' || payloadOrDecision.decision === 'REFUNDED'
          ? 'REFUNDED'
          : payloadOrDecision.decision === 'STAFF_REVIEW'
          ? 'STAFF_REVIEW'
          : 'REJECTED';

      // Ánh xạ nguồn tiền từ 'PLATFORM_RESERVE' sang 'PLATFORM_FUND' để tương thích với enum RefundSource ở Backend
      const backendSource =
        payloadOrDecision.refundSource === 'PLATFORM_RESERVE' || payloadOrDecision.refundSource === 'PLATFORM_FUND'
          ? 'PLATFORM_FUND'
          : 'GARAGE_WALLET';

      const amount = payloadOrDecision.refundAmount ?? payloadOrDecision.approvedRefundAmount ?? 0;
      const notes = payloadOrDecision.resolutionNotes ?? payloadOrDecision.adminResolutionNote ?? '';

      bodyPayload = {
        decision: backendDecision,
        approvedRefundAmount: amount,
        refundAmount: amount,
        refundSource: backendSource,
        adminResolutionNote: notes,
        resolutionNotes: notes,
        refundReferenceCode: payloadOrDecision.refundReferenceCode
      };
    } else {
      const backendSource =
        refundSourceArg === 'PLATFORM_RESERVE' || refundSourceArg === 'PLATFORM_FUND'
          ? 'PLATFORM_FUND'
          : 'GARAGE_WALLET';
      bodyPayload = {
        decision: payloadOrDecision,
        approvedRefundAmount: approvedRefundAmountArg,
        refundAmount: approvedRefundAmountArg,
        refundSource: backendSource,
        adminResolutionNote: adminResolutionNoteArg,
        resolutionNotes: adminResolutionNoteArg,
        refundReferenceCode: refundReferenceCodeArg
      };
    }

    const res = await fetch(`${API_BASE_URL}/finance/refunds/${id}/process`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(bodyPayload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json?.message || 'Thực thi quyết định hoàn tiền thất bại');
    }
    return json.data;
  },

  // Bí danh tương thích ngược với tên hàm `processRefundByAdmin`
  processRefundByAdmin: async (
    id: number,
    decision: 'REFUNDED' | 'REJECTED' | 'STAFF_REVIEW',
    approvedRefundAmount?: number,
    refundSource?: 'GARAGE_WALLET' | 'PLATFORM_FUND',
    adminResolutionNote?: string,
    refundReferenceCode?: string
  ): Promise<DisputeBackendResponse> => {
    return financeApi.processRefund(
      id,
      decision,
      approvedRefundAmount,
      refundSource,
      adminResolutionNote,
      refundReferenceCode
    );
  },

  // ==========================================================================
  // 6. GIÁM SÁT ĐÁNH GIÁ DỊCH VỤ & CHỈ SỐ HÀI LÒNG CSAT (UC-19)
  // ==========================================================================

  /**
   * Lấy toàn bộ danh sách đánh giá sao và nhận xét của khách hàng sau cứu hộ (GET /api/v1/ratings).
   * Hỗ trợ phân trang tùy chọn (page, size) hoặc lấy tất cả nếu không truyền tham số.
   */
  getAllRatings: async (page?: number, size?: number): Promise<ServiceRatingBackendResponse[]> => {
    const qs = page !== undefined && size !== undefined ? `?page=${page}&size=${size}` : '';
    const res = await fetch(`${API_BASE_URL}/ratings${qs}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  },

  /**
   * Lấy danh sách đánh giá sao của một Gara đối tác cụ thể theo `garageId` (`GET /api/v1/ratings/garage/${garageId}`).
   */
  getGarageRatings: async (garageId: number): Promise<ServiceRatingBackendResponse[]> => {
    const res = await fetch(`${API_BASE_URL}/ratings/garage/${garageId}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  }
,

  /**
   * Lấy danh sách toàn bộ hồ sơ khiếu nại (bí danh tương thích với App.tsx).
   */
  getAllDisputes: async (status?: string): Promise<DisputeBackendResponse[]> => {
    return financeApi.getRefunds(status);
  }
};

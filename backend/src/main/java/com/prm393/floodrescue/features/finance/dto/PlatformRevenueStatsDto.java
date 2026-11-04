package com.prm393.floodrescue.features.finance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * =================================================================================================
 * TÀI LIỆU KỸ THUẬT & GIẢI THÍCH MÃ NGUỒN (TECHNICAL DOCUMENTATION)
 * =================================================================================================
 * Phân hệ (Module): Quản trị Tài chính, Đối soát Dòng tiền & Thống kê Doanh thu Nền tảng (Finance Admin)
 * Use Case liên quan:
 *   - UC-24: Configure Platform Commission Rate (Tỷ lệ hoa hồng nền tảng đang áp dụng)
 *   - UC-25: Monitor Cash Flow & PayOS Reconciliation (Giám sát tổng dòng tiền GMV, doanh thu phí sàn, đối soát PayOS)
 *   - UC-26: Approve Garage Payout Requests (Tổng hợp số dư ví các Gara, lệnh rút tiền đang chờ và đã giải ngân)
 *   - UC-27: Approve & Execute Customer Refunds (Thống kê tổng số tiền đã hoàn trả và số lượng khiếu nại đang mở)
 * Luồng nghiệp vụ: Luồng 5 (Thanh toán, Đối soát PayOS & Quản trị Tài chính) & Luồng 6 (Khiếu nại & Hoàn tiền)
 *
 * Mục đích của lớp DTO này:
 *   - Cung cấp bức tranh toàn cảnh về sức khỏe tài chính của nền tảng Cứu hộ Xe máy Ngập nước thông qua
 *     endpoint `GET /api/v1/finance/stats`.
 *   - Duy trì tính tương thích ngược (100% Backward Compatibility) với toàn bộ các trường thống kê ban đầu
 *     đồng thời bổ sung các chỉ số chuyên sâu về giao dịch hoàn tiền (`totalRefundedAmount`), giao dịch lỗi/chờ
 *     thanh toán, và số lượng hồ sơ tranh chấp/khiếu nại đang mở (`openDisputesCount`).
 * =================================================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformRevenueStatsDto {

    /**
     * Tỷ lệ phần trăm (%) hoa hồng nền tảng mặc định đang kích hoạt (ví dụ: 12.50%).
     */
    private BigDecimal activeCommissionRate;

    /**
     * Tổng số lượng giao dịch thanh toán đã thành công (`PaymentStatus.SUCCESS`).
     */
    private long totalPaidTransactionCount;

    /**
     * Trường tương đương (Alias) biểu diễn số lượng giao dịch thanh toán thành công phục vụ đồng bộ Dashboard.
     */
    private long paidTransactionsCount;

    /**
     * Tổng số lượng giao dịch thanh toán thành công đã được đối soát tự động hoặc thủ công (`reconciled = true`).
     */
    private long reconciledTransactionCount;

    /**
     * Tổng giá trị giao dịch gộp toàn sàn - Gross Merchandise Value (GMV) tính từ các giao dịch thành công (VNĐ).
     * Công thức: `SUM(PaymentTransaction.amount)` với `status == SUCCESS`.
     */
    private BigDecimal totalGrossRevenueGmv;

    /**
     * Trường tương đương (Alias) của `totalGrossRevenueGmv` phục vụ hiển thị chỉ số GMV trên giao diện Web Admin.
     */
    private BigDecimal totalGmv;

    /**
     * Tổng doanh thu phí hoa hồng nền tảng thực thu được từ các đơn cứu hộ thành công (VNĐ).
     * Công thức: `SUM(PaymentTransaction.platformFee)` với `status == SUCCESS`.
     */
    private BigDecimal totalPlatformFeeEarned;

    /**
     * Trường tương đương (Alias) của `totalPlatformFeeEarned` biểu diễn tổng hoa hồng sàn thu được.
     */
    private BigDecimal totalPlatformCommission;

    /**
     * Tổng doanh thu ròng kết chuyển cho các đối tác Gara cứu hộ sau khi trừ phí hoa hồng sàn (VNĐ).
     * Công thức: `SUM(PaymentTransaction.netGarageAmount) = totalGrossRevenueGmv - totalPlatformFeeEarned`.
     */
    private BigDecimal totalNetGarageSettlement;

    /**
     * Trường tương đương (Alias) của `totalNetGarageSettlement` biểu diễn tổng doanh thu thực nhận của Gara.
     */
    private BigDecimal totalGarageNet;

    /**
     * Số lượng yêu cầu rút tiền của Gara đang chờ xử lý (`PayoutStatus.PENDING` hoặc `PayoutStatus.APPROVED`).
     */
    private long pendingPayoutCount;

    /**
     * Tổng số tiền đang nằm trong các lệnh rút tiền chờ giải ngân (`PENDING` + `APPROVED`) (VNĐ).
     */
    private BigDecimal pendingPayoutTotalAmount;

    /**
     * Trường tương đương (Alias) của `pendingPayoutTotalAmount` biểu diễn tổng tiền chờ giải ngân.
     */
    private BigDecimal pendingPayoutAmount;

    /**
     * Tổng số lượng lệnh rút tiền của Gara đã được giải ngân chuyển khoản thành công (`PayoutStatus.TRANSFERRED`).
     */
    private long transferredPayoutCount;

    /**
     * Trường tương đương (Alias) của `transferredPayoutCount` biểu diễn số lệnh rút tiền đã hoàn tất.
     */
    private long completedPayoutsCount;

    /**
     * Tổng số tiền đã thực tế giải ngân qua ngân hàng (Napas247) về tài khoản của các Gara đối tác (VNĐ).
     */
    private BigDecimal transferredPayoutTotalAmount;

    /**
     * Trường tương đương (Alias) của `transferredPayoutTotalAmount` biểu diễn tổng tiền đã giải ngân.
     */
    private BigDecimal completedPayoutAmount;

    /**
     * Tổng số dư ví điện tử hiện đang lưu giữ của toàn bộ các Gara đối tác trên hệ thống (VNĐ).
     * Công thức: `SUM(Garage.walletBalance)`.
     */
    private BigDecimal totalGarageWalletBalances;

    /**
     * Tổng số tiền đã hoàn trả cho khách hàng thông qua các giao dịch `REFUNDED` hoặc hồ sơ khiếu nại đã giải quyết (VNĐ).
     */
    private BigDecimal totalRefundedAmount;

    /**
     * Tổng số lượng giao dịch đã hoàn tiền (`PaymentStatus.REFUNDED`).
     */
    private long refundedTransactionsCount;

    /**
     * Tổng số lượng giao dịch thanh toán bị lỗi, hủy hoặc hết hạn (`FAILED`, `CANCELLED`, `EXPIRED`).
     */
    private long failedTransactionsCount;

    /**
     * Tổng số lượng giao dịch đang ở trạng thái chờ khách hàng quét mã thanh toán (`PaymentStatus.PENDING`).
     */
    private long pendingTransactionsCount;

    /**
     * Tổng số lượng hồ sơ khiếu nại dịch vụ đang mở chờ Staff xác minh hoặc chờ Admin phê duyệt hoàn tiền
     * (`DisputeStatus.STAFF_REVIEW` hoặc `DisputeStatus.ADMIN_APPROVAL`).
     */
    private long openDisputesCount;
}

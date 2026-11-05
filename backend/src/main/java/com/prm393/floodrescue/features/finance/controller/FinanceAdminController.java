package com.prm393.floodrescue.features.finance.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.*;
import com.prm393.floodrescue.features.finance.entity.DisputeStatus;
import com.prm393.floodrescue.features.finance.entity.PayoutStatus;
import com.prm393.floodrescue.features.finance.service.DisputeRefundService;
import com.prm393.floodrescue.features.finance.service.FinanceAdminService;
import com.prm393.floodrescue.features.payment.dto.PaymentTransactionResponse;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.service.PayOSPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * =================================================================================================
 * TÀI LIỆU KỸ THUẬT & GIẢI THÍCH MÃ NGUỒN (TECHNICAL DOCUMENTATION)
 * =================================================================================================
 * Phân hệ (Module): REST Controller Quản trị Tài chính, Đối soát PayOS, Giải ngân Ví Gara & Hoàn tiền
 * Tác giả phụ trách: Nguyễn Hoàng Long
 * Đường dẫn gốc (Base Endpoint): `/api/v1/finance`
 *
 * Bảo mật & Phân quyền (Security & Authorization):
 *   - Toàn bộ Controller được bảo vệ bởi annotation `@PreAuthorize("hasRole('ADMIN')")` ở cả cấp lớp
 *     và cấp phương thức trọng yếu, đảm bảo CHỈ Quản trị viên (`Role.ADMIN`) mới có quyền truy cập,
 *     cấu hình tỷ lệ hoa hồng, đối soát giao dịch PayOS, phê duyệt giải ngân rút tiền hoặc thực thi hoàn tiền.
 *   - Các vai trò khác (`CUSTOMER`, `GARAGE_OWNER`, `FIELD_MECHANIC`, `STAFF`) khi cố tình gọi vào các
 *     endpoint này sẽ bị Spring Security chặn ngay tại tầng Filter/Method Security với mã lỗi `403 Forbidden`.
 *
 * Danh sách Use Case được phục vụ bởi Controller này:
 *   - UC-24: Configure Platform Commission Rate (`/commission`, `/commission/history`, `/garages/commissions`, `/garages/{garageId}/commission`)
 *   - UC-25: Monitor Cash Flow & PayOS Reconciliation (`/transactions`, `/transactions/reconcile`, `/stats`)
 *   - UC-26: Approve Garage Payout Requests (`/payouts`, `/payouts/{id}/process`)
 *   - UC-27: Approve & Execute Customer Refunds (`/refunds`, `/refunds/{id}/process`)
 * =================================================================================================
 */
@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FinanceAdminController {

    /**
     * Service xử lý nghiệp vụ cấu hình hoa hồng, ví Gara, giải ngân rút tiền và thống kê doanh thu.
     */
    private final FinanceAdminService financeAdminService;

    /**
     * Service xử lý nghiệp vụ truy vấn giao dịch thanh toán và đối soát tự động với cổng PayOS.
     */
    private final PayOSPaymentService payOSPaymentService;

    /**
     * Service xử lý nghiệp vụ thẩm định cuối cùng và thực thi hoàn tiền khiếu nại cho khách hàng.
     */
    private final DisputeRefundService disputeRefundService;

    /**
     * [UC-24] Lấy cấu hình tỷ lệ hoa hồng nền tảng đang kích hoạt (`active = true`).
     * Endpoint: `GET /api/v1/finance/commission`
     *
     * @return Cấu hình hoa hồng hiện hành (Global Rate, Single Crossing, Batch Crossing, Waterlogged Repair...).
     */
    @GetMapping("/commission")
    public ResponseEntity<ApiResponse<CommissionConfigDto>> getActiveCommissionConfig() {
        CommissionConfigDto config = financeAdminService.getActiveCommissionConfig();
        return ResponseEntity.ok(ApiResponse.success(config));
    }

    /**
     * [UC-24] Lấy danh sách lịch sử thay đổi cấu hình tỷ lệ hoa hồng nền tảng (Audit Trail).
     * Endpoint: `GET /api/v1/finance/commission/history`
     *
     * @return Danh sách các phiên bản cấu hình hoa hồng sắp xếp theo thời gian mới nhất.
     */
    @GetMapping("/commission/history")
    public ResponseEntity<ApiResponse<List<CommissionConfigDto>>> getCommissionHistory() {
        List<CommissionConfigDto> history = financeAdminService.getCommissionHistory();
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    /**
     * [UC-24] Cập nhật cấu hình tỷ lệ hoa hồng nền tảng mới (Chỉ Admin được phép chỉnh sửa).
     * Endpoint: `PUT /api/v1/finance/commission`
     *
     * @param admin   Tài khoản Quản trị viên đang đăng nhập (trích xuất từ JWT SecurityContext).
     * @param request Thông số tỷ lệ hoa hồng mới và lý do phê duyệt.
     * @return Phiên bản cấu hình hoa hồng mới vừa được lưu và kích hoạt.
     */
    @PutMapping("/commission")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CommissionConfigDto>> updateCommissionConfig(
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody UpdateCommissionConfigRequest request
    ) {
        CommissionConfigDto updated = financeAdminService.updateCommissionConfig(admin, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Lưu cấu hình tỷ lệ hoa hồng nền tảng thành công!",
                updated
        ));
    }

    /**
     * [UC-24 Mở rộng] Lấy danh sách toàn bộ Gara đối tác kèm tỷ lệ chiết khấu hoa hồng, số dư ví và danh mục dịch vụ.
     * Endpoint: `GET /api/v1/finance/garages/commissions`
     *
     * @return Danh sách `List<GarageCommissionDto>` của tất cả Gara trên hệ thống.
     */
    @GetMapping("/garages/commissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<GarageCommissionDto>>> getGarageCommissions() {
        List<GarageCommissionDto> garages = financeAdminService.getGarageCommissions();
        return ResponseEntity.ok(ApiResponse.success(garages));
    }

    /**
     * [UC-24 Mở rộng] Điều chỉnh tỷ lệ phần trăm (%) chiết khấu hoa hồng áp dụng riêng cho một Gara đối tác.
     * Endpoint: `PATCH /api/v1/finance/garages/{garageId}/commission`
     *
     * @param admin    Tài khoản Quản trị viên đang đăng nhập thực hiện điều chỉnh.
     * @param garageId Mã định danh của Gara cần cập nhật tỷ lệ chiết khấu.
     * @param request  Mức tỷ lệ chiết khấu hoa hồng mới (0% - 100%) và ghi chú kiểm toán.
     * @return Thông tin chiết khấu của Gara sau khi cập nhật thành công.
     */
    @PatchMapping("/garages/{garageId}/commission")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<GarageCommissionDto>> updateGarageCommission(
            @AuthenticationPrincipal User admin,
            @PathVariable("garageId") Long garageId,
            @Valid @RequestBody UpdateGarageCommissionRequest request
    ) {
        GarageCommissionDto updated = financeAdminService.updateGarageCommission(garageId, request, admin);
        return ResponseEntity.ok(ApiResponse.success(
                "Cập nhật tỷ lệ chiết khấu hoa hồng cho Gara thành công!",
                updated
        ));
    }

    /**
     * [UC-25] Giám sát dòng tiền & danh sách giao dịch thanh toán toàn hệ thống (PayOS VietQR & Tiền mặt).
     * Endpoint: `GET /api/v1/finance/transactions`
     *
     * @param status Bộ lọc trạng thái giao dịch tùy chọn (`PENDING`, `SUCCESS`, `REFUNDED`, `FAILED`...).
     * @return Danh sách toàn bộ giao dịch thanh toán kèm thông tin tách phí hoa hồng sàn và thực nhận Gara.
     */
    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getAllTransactions(
            @RequestParam(value = "status", required = false) PaymentStatus status
    ) {
        List<PaymentTransactionResponse> transactions = payOSPaymentService.getAllTransactions(status);
        return ResponseEntity.ok(ApiResponse.success(transactions));
    }

    /**
     * [UC-25] Kích hoạt tiến trình đối soát tự động (Automated Reconciliation) cho toàn bộ giao dịch thành công.
     * Endpoint: `POST /api/v1/finance/transactions/reconcile`
     *
     * @return Danh sách giao dịch sau khi đã được đánh dấu đối soát (`reconciled = true`) và ghi nhận `reconciledAt`.
     */
    @PostMapping("/transactions/reconcile")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> reconcileAllTransactions() {
        List<PaymentTransactionResponse> reconciled = payOSPaymentService.reconcileAllTransactions();
        return ResponseEntity.ok(ApiResponse.success("Đối soát tự động toàn bộ giao dịch PayOS thành công!", reconciled));
    }

    /**
     * [UC-26] Lấy danh sách tất cả yêu cầu rút tiền từ Ví Gara đối tác.
     * Endpoint: `GET /api/v1/finance/payouts`
     *
     * @param status Bộ lọc trạng thái lệnh rút tùy chọn (`PENDING`, `APPROVED`, `TRANSFERRED`, `REJECTED`).
     * @return Danh sách các yêu cầu rút tiền kèm thông tin ngân hàng thụ hưởng và số dư ví Gara.
     */
    @GetMapping("/payouts")
    public ResponseEntity<ApiResponse<List<PayoutRequestResponse>>> getAllPayoutRequests(
            @RequestParam(value = "status", required = false) PayoutStatus status
    ) {
        List<PayoutRequestResponse> payouts = financeAdminService.getAllPayoutRequests(status);
        return ResponseEntity.ok(ApiResponse.success(payouts));
    }

    /**
     * [UC-26] Phê duyệt lệnh rút (`APPROVED`), xác nhận giải ngân chuyển khoản (`TRANSFERRED`) hoặc từ chối (`REJECTED`).
     * Endpoint: `PATCH /api/v1/finance/payouts/{id}/process`
     *
     * @param admin   Tài khoản Quản trị viên Tài chính thực hiện phê duyệt.
     * @param id      Mã định danh của yêu cầu rút tiền cần xử lý.
     * @param request Trạng thái đích, mã tham chiếu giao dịch ngân hàng (Napas247) và ghi chú của Admin.
     * @return Thông tin yêu cầu rút tiền sau khi đã xử lý và cập nhật số dư ví Gara.
     */
    @PatchMapping("/payouts/{id}/process")
    public ResponseEntity<ApiResponse<PayoutRequestResponse>> processPayoutRequest(
            @AuthenticationPrincipal User admin,
            @PathVariable("id") Long id,
            @Valid @RequestBody ApprovePayoutDto request
    ) {
        PayoutRequestResponse response = financeAdminService.processPayoutRequest(admin, id, request);
        return ResponseEntity.ok(ApiResponse.success("Xử lý yêu cầu rút tiền thành công!", response));
    }

    /**
     * [UC-27] Lấy danh sách toàn bộ hồ sơ khiếu nại & yêu cầu hoàn tiền phục vụ quyết định cuối cùng của Admin.
     * Endpoint: `GET /api/v1/finance/refunds`
     *
     * @param status Bộ lọc trạng thái hồ sơ khiếu nại tùy chọn (`STAFF_REVIEW`, `ADMIN_APPROVAL`, `REFUNDED`, `REJECTED`).
     * @return Danh sách các hồ sơ khiếu nại kèm biên bản xác minh của Staff và mức tiền đề xuất hoàn trả.
     */
    @GetMapping("/refunds")
    public ResponseEntity<ApiResponse<List<DisputeResponse>>> getAllRefundDisputes(
            @RequestParam(value = "status", required = false) DisputeStatus status
    ) {
        List<DisputeResponse> disputes = disputeRefundService.getAllDisputes(status);
        return ResponseEntity.ok(ApiResponse.success(disputes));
    }

    /**
     * [UC-27] Admin phê duyệt và thực thi hoàn tiền (100% hoặc một phần), yêu cầu Staff xác minh lại hoặc bác bỏ.
     * Endpoint: `PATCH /api/v1/finance/refunds/{id}/process`
     *
     * @param admin   Tài khoản Quản trị viên thực hiện phê duyệt hoàn tiền.
     * @param id      Mã định danh của hồ sơ khiếu nại.
     * @param request Quyết định của Admin (`REFUNDED`, `REJECTED`, `STAFF_REVIEW`), số tiền duyệt hoàn và nguồn tiền.
     * @return Hồ sơ khiếu nại sau khi đã thực thi hoàn tiền, trừ ví Gara và cập nhật trạng thái giao dịch.
     */
    @PatchMapping("/refunds/{id}/process")
    public ResponseEntity<ApiResponse<DisputeResponse>> processRefundDecision(
            @AuthenticationPrincipal User admin,
            @PathVariable("id") Long id,
            @Valid @RequestBody AdminProcessRefundRequest request
    ) {
        DisputeResponse response = disputeRefundService.processRefundByAdmin(admin, id, request);
        return ResponseEntity.ok(ApiResponse.success("Đã thực thi quyết định hoàn tiền / xử lý khiếu nại thành công!", response));
    }

    /**
     * [UC-25] Lấy báo cáo thống kê tổng quan dòng tiền, doanh thu phí sàn, số dư ví Gara và đối soát toàn nền tảng.
     * Endpoint: `GET /api/v1/finance/stats`
     *
     * @return Đối tượng `PlatformRevenueStatsDto` chứa toàn bộ chỉ số KPI tài chính của hệ thống.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<PlatformRevenueStatsDto>> getPlatformRevenueStats() {
        PlatformRevenueStatsDto stats = financeAdminService.getPlatformRevenueStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}

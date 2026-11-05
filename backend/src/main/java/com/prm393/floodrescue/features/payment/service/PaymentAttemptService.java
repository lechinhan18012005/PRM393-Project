package com.prm393.floodrescue.features.payment.service;

import com.prm393.floodrescue.common.exception.*;
import com.prm393.floodrescue.config.PayOSConfig;
import com.prm393.floodrescue.features.auth.entity.*;
import com.prm393.floodrescue.features.finance.service.FinanceAdminService;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.payment.dto.*;
import com.prm393.floodrescue.features.payment.entity.*;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rescue.entity.*;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;

/**
 * =================================================================================================
 * TÀI LIỆU KỸ THUẬT & GIẢI THÍCH MÃ NGUỒN (TECHNICAL DOCUMENTATION)
 * =================================================================================================
 * Phân hệ (Module): Khởi tạo Giao dịch Thanh toán, Tính toán Tách phí Hoa hồng & Lưu trữ Link PayOS
 * Tác giả phụ trách: Nguyễn Hoàng Long
 * Use Case liên quan:
 *   - UC-18: Pay Rescue Fee via VietQR PayOS / Cash & View Electronic Invoice
 *   - UC-24: Configure Platform Commission Rate (Tích hợp tỷ lệ chiết khấu hoa hồng riêng theo Gara hoặc toàn sàn)
 * Luồng nghiệp vụ: Luồng 5 (Thanh toán VietQR PayOS / Tiền mặt & Đối soát Tài chính)
 *
 * Cơ chế kiến trúc cốt lõi (Core Architectural Mechanisms):
 *   1. Tách biệt Giao dịch Cơ sở dữ liệu khỏi I/O Mạng (DB Transaction & Network I/O Decoupling):
 *      - `PaymentAttemptService` quản lý các pha giao dịch ngắn hạn (`@Transactional`) trong cơ sở dữ liệu:
 *        (a) `prepare`: Khóa đơn cứu hộ (`findByIdWithLock`), kiểm tra phân quyền, tính phí hoa hồng và
 *            khởi tạo bản ghi `PaymentTransaction` ở trạng thái `PENDING`.
 *        (b) `claimGatewayRequest`: Đánh dấu cờ `gatewayRequested = true` trước khi gọi HTTP sang PayOS.
 *        (c) `storeGatewayLink`: Lưu thông tin mã QR, `checkoutUrl`, `paymentLinkId` trả về từ PayOS.
 *      - Nhờ tách rời thành các transaction ngắn, khóa `PESSIMISTIC_WRITE` trên `RescueOrder` không bao giờ
 *        bị giữ trong suốt thời gian chờ phản hồi mạng HTTP tới máy chủ PayOS.
 *   2. Đảm bảo Tính Lũy đẳng (Idempotency) & Chống Tạo Trùng Link Thanh toán:
 *      - Nếu đơn cứu hộ đã có một giao dịch đang ở trạng thái `PENDING` hoặc `FAILED` cùng phương thức thanh toán,
 *        hệ thống sẽ tái sử dụng ngay `payosOrderCode` hiện có thay vì cấp mã mới, giúp tránh thất thoát hoặc
 *        thanh toán trùng lặp khi mạng chập chờn.
 *   3. Thuật toán Tính Tỷ lệ Hoa hồng Ưu tiên (Hierarchical Commission Rate Resolution):
 *      - Ưu tiên 1 (Per-Garage Override): Nếu đối tác Gara phụ trách đơn đã được Admin cấu hình mức chiết khấu
 *        riêng (`garage.getCommissionRate() != null`), hệ thống sử dụng trực tiếp mức tỷ lệ riêng này.
 *      - Ưu tiên 2 (Order-Type Specific Rate): Nếu Gara chưa có mức riêng (`null`), hệ thống lấy cấu hình
 *        hoa hồng toàn sàn đang active từ `FinanceAdminService.getActiveCommissionConfig()` theo loại đơn
 *        (`SINGLE_CROSSING` -> `singleCrossingRate`, `ONSITE_REPAIR` -> `waterloggedRepairRate`, mặc định `globalRate`).
 * =================================================================================================
 */
@Service
@lombok.extern.slf4j.Slf4j
@RequiredArgsConstructor
public class PaymentAttemptService {

    /**
     * Repository truy vấn và lưu trữ bản ghi giao dịch thanh toán trong bảng `payment_transactions`.
     */
    private final PaymentTransactionRepository paymentTransactionRepository;

    /**
     * Repository truy vấn đơn cứu hộ kèm cơ chế khóa bi quan `findByIdWithLock` (`PESSIMISTIC_WRITE`).
     */
    private final RescueOrderRepository rescueOrderRepository;

    /**
     * Service quản trị tài chính dùng để lấy cấu hình tỷ lệ hoa hồng nền tảng đang có hiệu lực (UC-24).
     */
    private final FinanceAdminService financeAdminService;

    /**
     * Cấu hình kết nối và thuật toán ký số HMAC-SHA256 của cổng thanh toán PayOS.
     */
    private final PayOSConfig payOSConfig;

    /**
     * Khởi tạo hoặc tái sử dụng phiên giao dịch thanh toán (`PaymentTransaction`) cho một đơn cứu hộ.
     * Quy trình kiểm tra & tính toán từng bước:
     *   - Bước 1: Kiểm tra xác thực người dùng (`currentUser != null`) và mã đơn cứu hộ (`rescueOrderId != null`).
     *   - Bước 2: Khóa dòng đơn cứu hộ (`rescueOrderRepository.findByIdWithLock`) bằng `PESSIMISTIC_WRITE`
     *     để ngăn chặn hai yêu cầu khởi tạo thanh toán chạy song song trên cùng một đơn.
     *   - Bước 3: Kiểm tra phân quyền sở hữu đơn: Chỉ khách hàng (`CUSTOMER`) đứng tên đơn hoặc `ADMIN` mới được phép tạo.
     *   - Bước 4: Kiểm tra trạng thái đơn:
     *       + Nếu đơn đã `COMPLETED`, trả về ngay giao dịch `SUCCESS` trước đó (đảm bảo tính lũy đẳng).
     *       + Nếu đơn chưa ở trạng thái `PAYMENT_PENDING`, từ chối khởi tạo thanh toán.
     *   - Bước 5: Chống giả mạo tham số từ phía Client (Anti-Tampering Validation): Đối chiếu `garageId` và
     *     `amount` do Client gửi lên với dữ liệu gốc của `RescueOrder` trên Server.
     *   - Bước 6: Kiểm tra cấu hình môi trường cổng PayOS (Real Gateway vs Simulation Mode).
     *   - Bước 7: Kiểm tra và tái sử dụng giao dịch `PENDING`/`FAILED` hiện có nếu trùng phương thức thanh toán.
     *   - Bước 8: Xác định tỷ lệ hoa hồng (`commissionRate`), tính phí sàn (`platformFee`) và số tiền thực nhận
     *     của Gara (`netGarageAmount = amount - platformFee`) với độ chính xác 2 chữ số thập phân (`HALF_UP`).
     *   - Bước 9: Sinh mã `payosOrderCode` duy nhất, tạo chữ ký HMAC-SHA256 cho yêu cầu thanh toán và lưu bản ghi.
     *
     * @param currentUser Người dùng đang đăng nhập yêu cầu tạo thanh toán.
     * @param request     Thông tin yêu cầu khởi tạo thanh toán.
     * @return Đối tượng `CreatePaymentLinkResponse` chứa mã QR VietQR, link thanh toán và chi tiết tách phí.
     */
    @Transactional
    public CreatePaymentLinkResponse prepare(User currentUser, CreatePaymentRequest request) {
        // Bước 1: Kiểm tra thông tin đăng nhập và tham số mã đơn cứu hộ bắt buộc
        if (currentUser == null) {
            throw new BadRequestException("Yêu cầu đăng nhập để khởi tạo thanh toán");
        }

        if (request.getRescueOrderId() == null) {
            throw new BadRequestException("Thiếu thông tin mã đơn cứu hộ (rescueOrderId)");
        }

        // Bước 2: Tải đơn cứu hộ kèm khóa bi quan PESSIMISTIC_WRITE để tuần tự hóa mọi thao tác thanh toán trên đơn này
        RescueOrder order = rescueOrderRepository.findByIdWithLock(request.getRescueOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + request.getRescueOrderId()));

        // Bước 3: Phân quyền: Chỉ CUSTOMER sở hữu đơn hoặc ADMIN mới được tạo link thanh toán
        if (currentUser.getRole() != Role.ADMIN && !order.getCustomer().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Chỉ khách hàng sở hữu đơn cứu hộ mới có quyền khởi tạo thanh toán!");
        }

        // Bước 4a: Nếu đơn đã COMPLETED, trả về giao dịch thành công hiện có (Idempotent Response)
        if (order.getStatus() == RescueOrderStatus.COMPLETED) {
            PaymentTransaction existingSuccess = paymentTransactionRepository
                    .findFirstByRescueOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), PaymentStatus.SUCCESS)
                    .orElse(null);
            if (existingSuccess != null) {
                return PayOSPaymentService.mapToCreatePaymentResponse(existingSuccess);
            }
            throw new BadRequestException("Đơn cứu hộ đã hoàn tất thanh toán.");
        }

        // Bước 4b: Chỉ cho phép thanh toán khi đơn cứu hộ đã hoàn thành nghiệm thu và chuyển sang chờ thanh toán (PAYMENT_PENDING)
        if (order.getStatus() != RescueOrderStatus.PAYMENT_PENDING) {
            throw new BadRequestException("Chỉ có thể thanh toán khi đơn ở trạng thái chờ thanh toán (PAYMENT_PENDING). Trạng thái hiện tại: " + order.getStatus());
        }

        // Bước 5: Validate không chấp nhận client làm sai lệch gara hoặc số tiền so với RescueOrder trên Server
        if (request.getGarageId() != null && !request.getGarageId().equals(order.getGarage().getId())) {
            throw new BadRequestException(String.format("Garage ID không khớp với đơn cứu hộ (Đơn: %s, Gửi lên: %s)!",
                    order.getGarage().getId(), request.getGarageId()));
        }
        if (request.getAmount() != null && request.getAmount().compareTo(order.getTotalAmount()) != 0) {
            throw new BadRequestException(String.format("Số tiền thanh toán (%s) không khớp với tổng tiền đơn cứu hộ (%s)!",
                    request.getAmount(), order.getTotalAmount()));
        }

        // Bước 6: Kiểm tra chế độ cổng thanh toán (Real Gateway vs Simulation Mode)
        // Nếu không cấu hình gateway thật và simulation cũng tắt -> Từ chối rõ ràng, không trả tài khoản mẫu!
        boolean isRealGateway = payOSConfig.isRealGatewayConfigured();
        boolean isSimulation = payOSConfig.isSimulationEnabled();

        PaymentMethod method = request.getPaymentMethod() != null
                ? request.getPaymentMethod()
                : PaymentMethod.PAYOS_VIETQR;

        if (method == PaymentMethod.PAYOS_VIETQR && !isRealGateway && !isSimulation) {
            log.error("PayOS real gateway is not configured and simulationEnabled is false!");
            throw new BadRequestException("Cổng thanh toán PayOS chưa được cấu hình thông tin xác thực trên hệ thống và chế độ giả lập đang tắt. Vui lòng liên hệ quản trị viên!");
        }

        // Bước 7: Kiểm tra giao dịch PENDING hoặc FAILED hiện có của đơn để tái sử dụng (giữ nguyên mã payosOrderCode)
        var pending = paymentTransactionRepository.findByRescueOrderIdOrderByCreatedAtDesc(order.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.PENDING || p.getStatus() == PaymentStatus.FAILED).toList();
        if (!pending.isEmpty()) {
            if (pending.get(0).getPaymentMethod() != method) {
                throw new BadRequestException("Đơn đang có giao dịch ở phương thức khác. Cần xác minh hoặc hủy giao dịch cũ trước khi đổi phương thức.");
            }
            return PayOSPaymentService.mapToCreatePaymentResponse(pending.get(0));
        }

        // Kiểm tra đơn cứu hộ đã có Gara phụ trách hợp lệ
        Garage garage = order.getGarage();
        if (garage == null) {
            throw new BadRequestException("Đơn cứu hộ chưa được gán Garage phụ trách!");
        }

        String orderType = order.getOrderType().name();
        BigDecimal amount = order.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(new BigDecimal("1000")) < 0) {
            throw new BadRequestException("Số tiền thanh toán tối thiểu là 1.000 VNĐ");
        }

        // Bước 8: Tích hợp UC-24: Xác định tỷ lệ hoa hồng áp dụng cho giao dịch
        // Ưu tiên 1: Nếu Gara có tỷ lệ chiết khấu riêng do Admin thiết lập (garage.getCommissionRate() != null) thì ưu tiên áp dụng
        // Ưu tiên 2: Nếu Gara chưa có mức riêng (null), lấy từ cấu hình CommissionConfig toàn sàn theo loại hình cứu hộ
        BigDecimal commissionRate;
        if (garage.getCommissionRate() != null) {
            commissionRate = garage.getCommissionRate();
        } else {
            var cfg = financeAdminService.getActiveCommissionConfig();
            if (cfg != null && (cfg.getGlobalRate() != null || cfg.getSingleCrossingRate() != null)) {
                commissionRate = order.getOrderType() == OrderType.SINGLE_CROSSING
                        ? (cfg.getSingleCrossingRate() != null ? cfg.getSingleCrossingRate() : cfg.getGlobalRate())
                        : (cfg.getWaterloggedRepairRate() != null ? cfg.getWaterloggedRepairRate() : cfg.getGlobalRate());
            } else {
                commissionRate = BigDecimal.ZERO;
            }
        }

        // Công thức tính phí hoa hồng nền tảng: platformFee = ROUND(amount * commissionRate / 100, 2)
        BigDecimal platformFee = amount.multiply(commissionRate)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        // Số tiền thực nhận của Gara sau khi trừ phí sàn: netGarageAmount = amount - platformFee
        BigDecimal netGarageAmount = amount.subtract(platformFee);

        // Bước 9: Sinh mã đơn hàng PayOS duy nhất và khởi tạo chữ ký yêu cầu thanh toán HMAC-SHA256
        long payosOrderCode = PayOSPaymentService.generateUniqueOrderCode();
        String rescueCode = (order.getOrderCode() != null && !order.getOrderCode().isBlank())
                ? order.getOrderCode().trim()
                : "#RC-" + order.getId();
        String paymentContent = "RESCUE " + payosOrderCode;

        String signature = payOSConfig.createPaymentRequestSignature(
                payosOrderCode,
                amount.longValue(),
                paymentContent
        );

        // Khởi tạo thông tin mã VietQR giả lập khi chạy ở chế độ Simulation (sẽ được xóa nếu gọi Real PayOS Gateway)
        String qrCode = "https://img.vietqr.io/image/MB-038299482910-compact2.png?amount="
                + amount.longValue() + "&addInfo=" + paymentContent.replace(" ", "%20");
        String checkoutUrl = payOSConfig.getReturnUrl() + "?orderCode=" + payosOrderCode;
        String bankName = "MB Bank (Ngân hàng Quân Đội)";
        String accountNumber = "038299482910";
        String accountHolder = "HE THONG CUU HO HYDRORESCUE";

        if (isRealGateway) {
            qrCode = null;
            checkoutUrl = null;
            bankName = null;
            accountNumber = null;
            accountHolder = null;
        }

        // Xây dựng thực thể PaymentTransaction ở trạng thái PENDING
        PaymentTransaction tx = PaymentTransaction.builder()
                .rescueOrderId(order.getId())
                .rescueCode(rescueCode)
                .orderType(orderType)
                .garage(garage)
                .customer(order.getCustomer())
                .payosOrderCode(payosOrderCode)
                .amount(amount)
                .commissionRate(commissionRate)
                .platformFee(platformFee)
                .netGarageAmount(netGarageAmount)
                .paymentMethod(method)
                .status(PaymentStatus.PENDING)
                .simulation(method == PaymentMethod.PAYOS_VIETQR && !isRealGateway)
                .reconciled(false)
                .checksumValid(true)
                .webhookSignature(signature)
                .qrCode(qrCode)
                .checkoutUrl(checkoutUrl)
                .bankName(bankName)
                .accountNumber(accountNumber)
                .accountHolder(accountHolder)
                .paymentContent(paymentContent)
                .build();

        // Lưu bản ghi giao dịch xuống cơ sở dữ liệu và ánh xạ sang DTO phản hồi
        PaymentTransaction saved = paymentTransactionRepository.save(tx);
        return PayOSPaymentService.mapToCreatePaymentResponse(saved);
    }

    /**
     * Đánh dấu rằng hệ thống chuẩn bị gửi yêu cầu HTTP tạo link thanh toán sang máy chủ PayOS thật.
     * Tuân thủ thứ tự khóa toàn cục: `RescueOrder` -> `PaymentTransaction` để tránh Deadlock.
     *
     * @param code Mã giao dịch `payosOrderCode`.
     * @return `true` nếu đây là lần đầu tiên gọi sang cổng PayOS cho mã giao dịch này; `false` nếu là lần thử lại (retry).
     */
    @Transactional
    public boolean claimGatewayRequest(Long code) {
        Long orderId = paymentTransactionRepository.findRescueOrderIdByCode(code).orElseThrow();
        rescueOrderRepository.findByIdWithLock(orderId).orElseThrow();
        var tx = paymentTransactionRepository.findByCodeWithLock(code).orElseThrow();
        boolean first = !tx.isGatewayRequested();
        tx.setGatewayRequested(true);
        paymentTransactionRepository.save(tx);
        return first;
    }

    /**
     * Chụp trạng thái hiện tại của giao dịch thanh toán dưới dạng `CreatePaymentLinkResponse` (chỉ đọc).
     *
     * @param code Mã giao dịch `payosOrderCode`.
     * @return Thông tin link thanh toán hiện tại trong DB.
     */
    @Transactional(readOnly = true)
    public CreatePaymentLinkResponse snapshot(Long code) {
        return PayOSPaymentService.mapToCreatePaymentResponse(paymentTransactionRepository.findByPayosOrderCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch")));
    }

    /**
     * Chụp trạng thái chi tiết của giao dịch thanh toán dưới dạng `PaymentTransactionResponse` (chỉ đọc).
     *
     * @param code Mã giao dịch `payosOrderCode`.
     * @return Thông tin chi tiết giao dịch thanh toán hiện tại trong DB.
     */
    @Transactional(readOnly = true)
    public PaymentTransactionResponse paymentSnapshot(Long code) {
        return PayOSPaymentService.mapToResponse(paymentTransactionRepository.findByPayosOrderCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch")));
    }

    /**
     * Lưu trữ dữ liệu link thanh toán (`paymentLinkId`, `checkoutUrl`, `qrCode`, số tài khoản thụ hưởng và trạng thái)
     * nhận được từ phản hồi JSON của máy chủ PayOS vào bản ghi `PaymentTransaction`.
     *
     * @param code Mã giao dịch `payosOrderCode`.
     * @param data Đối tượng `JsonNode` chứa trường `data` từ API PayOS (`/v2/payment-requests`).
     * @return Đối tượng `CreatePaymentLinkResponse` đã cập nhật đầy đủ thông tin từ cổng PayOS.
     */
    @Transactional
    public CreatePaymentLinkResponse storeGatewayLink(Long code, com.fasterxml.jackson.databind.JsonNode data) {
        // Khóa đơn cứu hộ và bản ghi giao dịch theo đúng thứ tự chuẩn
        Long orderId = paymentTransactionRepository.findRescueOrderIdByCode(code).orElseThrow();
        rescueOrderRepository.findByIdWithLock(orderId).orElseThrow();
        var tx = paymentTransactionRepository.findByCodeWithLock(code).orElseThrow();

        // Trích xuất và lưu mã định danh link thanh toán của PayOS
        String linkId = data.path("paymentLinkId").asText(data.path("id").asText(""));
        if (!linkId.isBlank()) tx.setGatewayLinkId(linkId);

        // Lưu đường dẫn trang thanh toán Hosted Checkout của PayOS (khôi phục URL chuẩn nếu API GET chỉ trả về linkId)
        String checkout = data.path("checkoutUrl").asText("");
        if (!checkout.isBlank()) tx.setCheckoutUrl(checkout);
        else if (tx.getCheckoutUrl() == null && linkId.matches("[a-zA-Z0-9_-]+")) {
            tx.setCheckoutUrl("https://pay.payos.vn/web/" + linkId);
        }

        // Lưu chuỗi VietQR EMVCo, số tài khoản, tên chủ tài khoản và mã BIN ngân hàng
        if (!data.path("qrCode").asText("").isBlank()) tx.setQrCode(data.path("qrCode").asText());
        if (!data.path("accountNumber").asText("").isBlank()) tx.setAccountNumber(data.path("accountNumber").asText());
        if (!data.path("accountName").asText("").isBlank()) tx.setAccountHolder(data.path("accountName").asText());
        if (!data.path("bin").asText("").isBlank()) tx.setBankName(data.path("bin").asText());

        // Đồng bộ trạng thái link nếu giao dịch đang ở trạng thái chưa hoàn tất (PENDING hoặc FAILED)
        String state = data.path("status").asText("");
        if (tx.getStatus() == PaymentStatus.PENDING || tx.getStatus() == PaymentStatus.FAILED) {
            if ("CANCELLED".equals(state)) tx.setStatus(PaymentStatus.CANCELLED);
            else if ("EXPIRED".equals(state)) tx.setStatus(PaymentStatus.EXPIRED);
            else if ("PENDING".equals(state)) tx.setStatus(PaymentStatus.PENDING);
        }

        paymentTransactionRepository.save(tx);
        return PayOSPaymentService.mapToCreatePaymentResponse(tx);
    }
}

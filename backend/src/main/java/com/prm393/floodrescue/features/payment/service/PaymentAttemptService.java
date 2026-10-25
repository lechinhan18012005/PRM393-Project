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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import java.math.*;

@Service
@lombok.extern.slf4j.Slf4j
@RequiredArgsConstructor
public class PaymentAttemptService {
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final RescueOrderRepository rescueOrderRepository;
    private final FinanceAdminService financeAdminService;
    private final PayOSConfig payOSConfig;
    @Transactional
    public CreatePaymentLinkResponse prepare(User currentUser, CreatePaymentRequest request) {
        if (currentUser == null) {
            throw new BadRequestException("Yêu cầu đăng nhập để khởi tạo thanh toán");
        }

        if (request.getRescueOrderId() == null) {
            throw new BadRequestException("Thiếu thông tin mã đơn cứu hộ (rescueOrderId)");
        }

        RescueOrder order = rescueOrderRepository.findByIdWithLock(request.getRescueOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + request.getRescueOrderId()));

        // Phân quyền: Chỉ CUSTOMER sở hữu đơn hoặc ADMIN mới được tạo link thanh toán
        if (currentUser.getRole() != Role.ADMIN && !order.getCustomer().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Chỉ khách hàng sở hữu đơn cứu hộ mới có quyền khởi tạo thanh toán!");
        }

        if (order.getOrderType() != OrderType.SINGLE_CROSSING) {
            throw new BadRequestException("Chỉ hỗ trợ thanh toán cho đơn cứu hộ chở xe đơn lẻ (SINGLE_CROSSING)!");
        }

        // Nếu đơn đã COMPLETED, trả về giao dịch thành công hiện có
        if (order.getStatus() == RescueOrderStatus.COMPLETED) {
            PaymentTransaction existingSuccess = paymentTransactionRepository
                    .findFirstByRescueOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), PaymentStatus.SUCCESS)
                    .orElse(null);
            if (existingSuccess != null) {
                return PayOSPaymentService.mapToCreatePaymentResponse(existingSuccess);
            }
            throw new BadRequestException("Đơn cứu hộ đã hoàn tất thanh toán.");
        }

        if (order.getStatus() != RescueOrderStatus.PAYMENT_PENDING) {
            throw new BadRequestException("Chỉ có thể thanh toán khi đơn ở trạng thái chờ thanh toán (PAYMENT_PENDING). Trạng thái hiện tại: " + order.getStatus());
        }

        // Validate không chấp nhận client làm sai lệch gara hoặc số tiền so với RescueOrder
        if (request.getGarageId() != null && !request.getGarageId().equals(order.getGarage().getId())) {
            throw new BadRequestException(String.format("Garage ID không khớp với đơn cứu hộ (Đơn: %s, Gửi lên: %s)!",
                    order.getGarage().getId(), request.getGarageId()));
        }
        if (request.getAmount() != null && request.getAmount().compareTo(order.getTotalAmount()) != 0) {
            throw new BadRequestException(String.format("Số tiền thanh toán (%s) không khớp với tổng tiền đơn cứu hộ (%s)!",
                    request.getAmount(), order.getTotalAmount()));
        }

        // Mode & Environment validation (Issue 3):
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

        // An existing provider link is not expired by a local wall-clock deadline.
        var pending = paymentTransactionRepository.findByRescueOrderIdOrderByCreatedAtDesc(order.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.PENDING || p.getStatus() == PaymentStatus.FAILED).toList();
        if (!pending.isEmpty()) {
            if (pending.get(0).getPaymentMethod() != method) {
                throw new BadRequestException("Đơn đang có giao dịch ở phương thức khác. Cần xác minh hoặc hủy giao dịch cũ trước khi đổi phương thức.");
            }
            return PayOSPaymentService.mapToCreatePaymentResponse(pending.get(0));
        }
        Garage garage = order.getGarage();
        if (garage == null) {
            throw new BadRequestException("Đơn cứu hộ chưa được gán Garage phụ trách!");
        }

        String orderType = order.getOrderType().name();
        BigDecimal amount = order.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(new BigDecimal("1000")) < 0) {
            throw new BadRequestException("Số tiền thanh toán tối thiểu là 1.000 VNĐ");
        }

        // Tích hợp Giai đoạn 1 (UC-24): Lấy tỷ lệ hoa hồng hiện hành từ cấu hình của Admin
        var cfg = financeAdminService.getActiveCommissionConfig();
        BigDecimal commissionRate = cfg.getSingleCrossingRate() != null ? cfg.getSingleCrossingRate() : cfg.getGlobalRate();
        BigDecimal platformFee = amount.multiply(commissionRate)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal netGarageAmount = amount.subtract(platformFee);

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

        String qrCode = "https://img.vietqr.io/image/MB-038299482910-compact2.png?amount="
                + amount.longValue() + "&addInfo=" + paymentContent.replace(" ", "%20");
        String checkoutUrl = payOSConfig.getReturnUrl() + "?orderCode=" + payosOrderCode;
        String bankName = "MB Bank (Ngân hàng Quân Đội)";
        String accountNumber = "038299482910";
        String accountHolder = "HE THONG CUU HO HYDRORESCUE";

        if (isRealGateway) { qrCode = null; checkoutUrl = null; bankName = null; accountNumber = null; accountHolder = null; }

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

        PaymentTransaction saved = paymentTransactionRepository.save(tx);
        return PayOSPaymentService.mapToCreatePaymentResponse(saved);
    }


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

    @Transactional(readOnly = true)
    public CreatePaymentLinkResponse snapshot(Long code) {
        return PayOSPaymentService.mapToCreatePaymentResponse(paymentTransactionRepository.findByPayosOrderCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch")));
    }

    @Transactional(readOnly = true)
    public PaymentTransactionResponse paymentSnapshot(Long code) {
        return PayOSPaymentService.mapToResponse(paymentTransactionRepository.findByPayosOrderCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch")));
    }

    @Transactional
    public CreatePaymentLinkResponse storeGatewayLink(Long code, com.fasterxml.jackson.databind.JsonNode data) {
        Long orderId = paymentTransactionRepository.findRescueOrderIdByCode(code).orElseThrow();
        rescueOrderRepository.findByIdWithLock(orderId).orElseThrow();
        var tx = paymentTransactionRepository.findByCodeWithLock(code).orElseThrow();
        String linkId = data.path("paymentLinkId").asText(data.path("id").asText(""));
        if (!linkId.isBlank()) tx.setGatewayLinkId(linkId);
        String checkout = data.path("checkoutUrl").asText("");
        if (!checkout.isBlank()) tx.setCheckoutUrl(checkout);
        else if (tx.getCheckoutUrl() == null && linkId.matches("[a-zA-Z0-9_-]+")) {
            // The GET API returns the link id, not its QR. Recover the documented hosted checkout.
            tx.setCheckoutUrl("https://pay.payos.vn/web/" + linkId);
        }
        if (!data.path("qrCode").asText("").isBlank()) tx.setQrCode(data.path("qrCode").asText());
        if (!data.path("accountNumber").asText("").isBlank()) tx.setAccountNumber(data.path("accountNumber").asText());
        if (!data.path("accountName").asText("").isBlank()) tx.setAccountHolder(data.path("accountName").asText());
        if (!data.path("bin").asText("").isBlank()) tx.setBankName(data.path("bin").asText());
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

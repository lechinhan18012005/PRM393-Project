package com.prm393.floodrescue.features.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.config.PayOSConfig;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.CommissionConfigDto;
import com.prm393.floodrescue.features.finance.entity.WalletTransaction;
import com.prm393.floodrescue.features.finance.entity.WalletTransactionType;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.finance.service.FinanceAdminService;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.payment.dto.CreatePaymentLinkResponse;
import com.prm393.floodrescue.features.payment.dto.CreatePaymentRequest;
import com.prm393.floodrescue.features.payment.dto.PayOSWebhookPayload;
import com.prm393.floodrescue.features.payment.dto.PaymentTransactionResponse;
import com.prm393.floodrescue.features.payment.entity.PaymentMethod;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import com.prm393.floodrescue.features.rescue.service.RescueExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayOSPaymentService {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final GarageRepository garageRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final FinanceAdminService financeAdminService;
    private final PayOSConfig payOSConfig;
    private final ObjectMapper objectMapper;
    private final RescueOrderRepository rescueOrderRepository;
    private final RescueExecutionService rescueExecutionService;
    private final RescueDispatchService rescueDispatchService;
    private final PaymentAttemptService paymentAttemptService;
    private final GatewayProvisionService gatewayProvisionService;
    private final PaymentSettlementService settlementService;

    // =========================================================================
    // UC-18: Create Payment Link (PayOS VietQR or Cash) & Split Calculation
    // =========================================================================

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.SUPPORTS)
    public CreatePaymentLinkResponse createPayment(User currentUser, CreatePaymentRequest request) {
        if (payOSConfig.isRealGatewayConfigured()) return gatewayProvisionService.create(currentUser, request);
        return paymentAttemptService.prepare(currentUser, request);
    }
    // =========================================================================
    // UC-18 & UC-25: Handle PayOS Webhook, Verify HMAC & Settle Garage Wallet
    // =========================================================================

    @Transactional
    public PaymentTransactionResponse handlePayOSWebhook(PayOSWebhookPayload payload) {
        if (payload == null || payload.getData() == null || payload.getData().getOrderCode() == null) {
            throw new BadRequestException("Dữ liệu Webhook PayOS không hợp lệ hoặc thiếu orderCode");
        }

        PayOSWebhookPayload.WebhookData data = payload.getData();

        Map<String, Object> dataMap = convertWebhookDataToMap(data);
        String expectedSignature = payOSConfig.createWebhookDataSignature(dataMap);

        if (payload.getSignature() == null || !expectedSignature.equalsIgnoreCase(payload.getSignature().trim())) {
            throw new BadRequestException("Chữ ký bảo mật Webhook PayOS (HMAC-SHA256) không hợp lệ");
        }

        Long orderCode = data.getOrderCode();
        PaymentTransaction tx = paymentTransactionRepository.findByPayosOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch với mã PayOS orderCode: " + orderCode));

        if (tx.getGatewayLinkId() != null && !tx.getGatewayLinkId().equals(data.getPaymentLinkId())) {
            throw new BadRequestException("Mã link PayOS không khớp giao dịch đã lưu");
        }

        // 1. Kiểm tra đơn vị tiền tệ VND (Issue 4)
        if (data.getCurrency() != null && !"VND".equalsIgnoreCase(data.getCurrency().trim())) {
            throw new BadRequestException("Đơn vị tiền tệ trong Webhook không hợp lệ (yêu cầu VND, nhận: " + data.getCurrency() + ")");
        }

        // 2. Kiểm tra số tiền trong webhook khớp với transaction
        long webhookAmount = data.getAmount() != null ? data.getAmount() : 0L;
        if (webhookAmount != tx.getAmount().longValue()) {
            throw new BadRequestException(String.format("Số tiền thanh toán trong webhook (%s) không khớp với giao dịch (%s)!",
                    webhookAmount, tx.getAmount().longValue()));
        }

        boolean paid = "00".equals(data.getCode()) && "00".equals(payload.getCode())
                && Boolean.TRUE.equals(payload.getSuccess());
        try {
            return settlementService.apply(orderCode, paid, payload.getSignature(), objectMapper.writeValueAsString(payload));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new BadRequestException("Không thể ghi nhận chứng từ thanh toán");
        }
    }
    /**
     * Giả lập bắn Webhook chuẩn chữ ký HMAC-SHA256 từ PayOS để phục vụ test tích hợp & demo local.
     */
    @Transactional
    public PaymentTransactionResponse simulatePayOSWebhook(User currentUser, Long payosOrderCode) {
        if (currentUser == null) throw new AccessDeniedException("Yêu cầu đăng nhập để giả lập thanh toán");
        if (!payOSConfig.isSimulationEnabled()) {
            throw new BadRequestException("Tính năng giả lập webhook bị vô hiệu hóa trên môi trường này!");
        }

        PaymentTransaction tx = paymentTransactionRepository.findByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch với mã PayOS orderCode: " + payosOrderCode));

        if (currentUser != null && tx.getRescueOrderId() != null) {
            RescueOrder order = rescueOrderRepository.findById(tx.getRescueOrderId()).orElse(null);
            if (order != null) {
                rescueDispatchService.validateOrderAccess(currentUser, order);
            }
        }

        if (!tx.isSimulation()) throw new BadRequestException("Không được giả lập xác nhận cho giao dịch PayOS thật");

        PayOSWebhookPayload.WebhookData data = PayOSWebhookPayload.WebhookData.builder()
                .orderCode(tx.getPayosOrderCode())
                .amount(tx.getAmount().longValue())
                .description(tx.getPaymentContent())
                .accountNumber(tx.getAccountNumber() != null ? tx.getAccountNumber() : "038299482910")
                .reference("FT" + System.currentTimeMillis())
                .transactionDateTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .currency("VND")
                .paymentLinkId("plink_" + tx.getPayosOrderCode())
                .code("00")
                .desc("Thành công")
                .build();

        Map<String, Object> dataMap = convertWebhookDataToMap(data);
        String validSignature = payOSConfig.createWebhookDataSignature(dataMap);

        PayOSWebhookPayload payload = PayOSWebhookPayload.builder()
                .code("00")
                .desc("success")
                .success(true)
                .data(data)
                .signature(validSignature)
                .build();

        return handlePayOSWebhook(payload);
    }

    // =========================================================================
    // UC-18: Cash Payment Confirmation & Commission Deduction
    // =========================================================================

    @Transactional
    public PaymentTransactionResponse confirmCashPayment(User currentUser, Long payosOrderCode) {
        if (currentUser == null) {
            throw new BadRequestException("Yêu cầu đăng nhập");
        }

        PaymentTransaction tx = paymentTransactionRepository.findByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch với mã orderCode: " + payosOrderCode));

        Long cashOrderId = tx.getRescueOrderId();
        RescueOrder order = rescueOrderRepository.findByIdWithLock(cashOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ liên kết"));
        tx = paymentTransactionRepository.findByCodeWithLock(payosOrderCode).orElseThrow();

        // Phân quyền tiền mặt: Khách hàng KHÔNG được tự xác nhận nộp tiền mặt.
        // Chỉ thợ được phân công phụ trách đơn, chủ garage, hoặc Admin mới có quyền xác nhận!
        if (currentUser.getRole() == Role.CUSTOMER) {
            throw new AccessDeniedException("Khách hàng không được tự xác nhận đã nộp tiền mặt!");
        }

        boolean isAssignedMechanic = order.getMechanicStaff() != null
                && order.getMechanicStaff().getUser().getId().equals(currentUser.getId());
        boolean isGarageOwner = order.getGarage() != null
                && order.getGarage().getOwner() != null
                && order.getGarage().getOwner().getId().equals(currentUser.getId());
        boolean isAdminOrStaff = currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.STAFF;

        if (!isAssignedMechanic && !isGarageOwner && !isAdminOrStaff) {
            throw new AccessDeniedException("Bạn không có quyền xác nhận thanh toán tiền mặt cho đơn này!");
        }

        if (order.getStatus() == RescueOrderStatus.COMPLETED) {
            if (tx.getId().equals(order.getPaymentTransactionId())) {
                return mapToResponse(tx);
            }
            throw new BadRequestException("Đơn cứu hộ đã được hoàn tất bởi giao dịch khác (Mã GD: " + order.getPaymentTransactionId() + "). Không thể xác nhận tiền mặt trùng lặp!");
        }

        if (tx.getStatus() == PaymentStatus.SUCCESS) {
            return mapToResponse(tx);
        }

        if (!tx.isSimulation() && tx.getPaymentMethod() != PaymentMethod.CASH) {
            throw new BadRequestException("Link PayOS thật chưa được kết thúc; không thể chuyển trực tiếp sang xác nhận tiền mặt.");
        }

        LocalDateTime paidAt = LocalDateTime.now();
        tx.setPaymentMethod(PaymentMethod.CASH);
        tx.setStatus(PaymentStatus.SUCCESS);
        tx.setReconciled(true);
        tx.setChecksumValid(true);
        tx.setPaidAt(paidAt);
        tx.setReconciledAt(paidAt);

        // Với đơn thu tiền mặt trực tiếp tại hiện trường, thợ đã cầm đủ amount -> Khấu trừ phí hoa hồng nền tảng từ Ví Gara
        Garage garage = tx.getGarage();
        BigDecimal currentBalance = garageRepository.lockWalletBalance(garage.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví gara"));
        BigDecimal newBalance = currentBalance.subtract(tx.getPlatformFee());
        garage.setWalletBalance(newBalance);
        garageRepository.save(garage);

        WalletTransaction walletTx = WalletTransaction.builder()
                .garage(garage)
                .amount(tx.getPlatformFee().negate())
                .balanceAfter(newBalance)
                .transactionType(WalletTransactionType.COMMISSION_DEDUCT)
                .referenceCode("CASH-" + tx.getPayosOrderCode())
                .description(String.format(
                        "Khấu trừ hoa hồng sàn (%s%%) cho đơn thu tiền mặt %s (Tổng thu khách: %s đ)",
                        tx.getCommissionRate().toPlainString(),
                        tx.getRescueCode(),
                        tx.getAmount().toPlainString()
                ))
                .build();
        walletTransactionRepository.save(walletTx);

        PaymentTransaction saved = paymentTransactionRepository.save(tx);

        // Cập nhật trạng thái RescueOrder sang COMPLETED qua domain service
        if (saved.getRescueOrderId() != null) {
            rescueExecutionService.markPaymentSuccessful(
                    saved.getRescueOrderId(),
                    saved.getId(),
                    saved.getPayosOrderCode(),
                    "CASH",
                    saved.getAmount(),
                    paidAt
            );

            // Hủy các pending attempt khác của cùng rescueOrderId
            List<PaymentTransaction> otherPending = paymentTransactionRepository
                    .findByRescueOrderIdAndStatus(order.getId(), PaymentStatus.PENDING);
            for (PaymentTransaction pendingOther : otherPending) {
                if (!pendingOther.getId().equals(saved.getId())) {
                    pendingOther.setStatus(PaymentStatus.CANCELLED);
                    paymentTransactionRepository.save(pendingOther);
                }
            }
        }

        log.info("Cash payment confirmed for orderCode {}: deducted platform fee {} from garage {}, marked rescue order #{} COMPLETED",
                payosOrderCode, tx.getPlatformFee(), garage.getId(), saved.getRescueOrderId());
        return mapToResponse(saved);
    }

    // =========================================================================
    // UC-25: Query & Reconcile Transactions
    // =========================================================================

    @Transactional(readOnly = true)
    public PaymentTransactionResponse getTransactionByOrderCode(User currentUser, Long payosOrderCode) {
        return getTransactionByOrderCode(currentUser, payosOrderCode, false);
    }

    @Transactional(readOnly = true)
    public PaymentTransactionResponse getTransactionByOrderCode(User currentUser, Long payosOrderCode, boolean refresh) {
        if (currentUser == null) throw new AccessDeniedException("Yêu cầu đăng nhập để kiểm tra thanh toán");
        PaymentTransaction tx = paymentTransactionRepository.findByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch #" + payosOrderCode));
        RescueOrder order = rescueOrderRepository.findById(tx.getRescueOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ của giao dịch"));
        rescueDispatchService.validateOrderAccess(currentUser, order);
        if (!tx.isSimulation() && tx.getPaymentMethod() == PaymentMethod.PAYOS_VIETQR
                && (tx.getStatus() == PaymentStatus.PENDING || tx.getStatus() == PaymentStatus.FAILED)) {
            return gatewayProvisionService.synchronize(payosOrderCode, refresh);
        }
        return mapToResponse(tx);
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getTransactionsByRescueOrder(User currentUser, Long rescueOrderId) {
        if (currentUser != null) {
            RescueOrder order = rescueOrderRepository.findById(rescueOrderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + rescueOrderId));
            rescueDispatchService.validateOrderAccess(currentUser, order);
        }
        return paymentTransactionRepository.findByRescueOrderIdOrderByCreatedAtDesc(rescueOrderId)
                .stream()
                .map(PayOSPaymentService::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getAllTransactions(PaymentStatus status) {
        List<PaymentTransaction> list = (status != null)
                ? paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(status)
                : paymentTransactionRepository.findAllByOrderByCreatedAtDesc();
        return list.stream()
                .map(PayOSPaymentService::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<PaymentTransactionResponse> reconcileAllTransactions() {
        List<PaymentTransaction> all = paymentTransactionRepository.findAllByOrderByCreatedAtDesc();
        for (PaymentTransaction tx : all) {
            if (tx.getStatus() == PaymentStatus.SUCCESS && !tx.isReconciled()) {
                tx.setReconciled(true);
                tx.setReconciledAt(LocalDateTime.now());
                paymentTransactionRepository.save(tx);
            }
        }
        return all.stream()
                .map(PayOSPaymentService::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private BigDecimal resolveCommissionRate(String orderType) {
        CommissionConfigDto cfg = financeAdminService.getActiveCommissionConfig();
        if ("BATCH_CROSSING".equalsIgnoreCase(orderType) && cfg.getBatchCrossingRate() != null) {
            return cfg.getBatchCrossingRate();
        }
        if ("WATERLOGGED_REPAIR".equalsIgnoreCase(orderType) && cfg.getWaterloggedRepairRate() != null) {
            return cfg.getWaterloggedRepairRate();
        }
        if ("SURGE".equalsIgnoreCase(orderType) && cfg.getSurgeHoursRate() != null) {
            return cfg.getSurgeHoursRate();
        }
        if (cfg.getSingleCrossingRate() != null) {
            return cfg.getSingleCrossingRate();
        }
        return cfg.getGlobalRate() != null ? cfg.getGlobalRate() : new BigDecimal("12.50");
    }

    public static long generateUniqueOrderCode() {
        long timestampPart = System.currentTimeMillis() % 1000000000L;
        int randomPart = ThreadLocalRandom.current().nextInt(10, 99);
        return timestampPart * 100 + randomPart;
    }

    private Map<String, Object> convertWebhookDataToMap(PayOSWebhookPayload.WebhookData d) {
        Map<String, Object> map = new HashMap<>();
        map.put("orderCode", d.getOrderCode());
        map.put("amount", d.getAmount());
        map.put("description", d.getDescription() != null ? d.getDescription() : "");
        map.put("accountNumber", d.getAccountNumber() != null ? d.getAccountNumber() : "");
        map.put("reference", d.getReference() != null ? d.getReference() : "");
        map.put("transactionDateTime", d.getTransactionDateTime() != null ? d.getTransactionDateTime() : "");
        map.put("currency", d.getCurrency() != null ? d.getCurrency() : "VND");
        map.put("paymentLinkId", d.getPaymentLinkId() != null ? d.getPaymentLinkId() : "");
        map.put("code", d.getCode() != null ? d.getCode() : "00");
        map.put("desc", d.getDesc() != null ? d.getDesc() : "");
        if (d.getCounterAccountBankId() != null) map.put("counterAccountBankId", d.getCounterAccountBankId());
        if (d.getCounterAccountBankName() != null) map.put("counterAccountBankName", d.getCounterAccountBankName());
        if (d.getCounterAccountName() != null) map.put("counterAccountName", d.getCounterAccountName());
        if (d.getCounterAccountNumber() != null) map.put("counterAccountNumber", d.getCounterAccountNumber());
        if (d.getVirtualAccountName() != null) map.put("virtualAccountName", d.getVirtualAccountName());
        if (d.getVirtualAccountNumber() != null) map.put("virtualAccountNumber", d.getVirtualAccountNumber());
        return map;
    }

    public static CreatePaymentLinkResponse mapToCreatePaymentResponse(PaymentTransaction saved) {
        return CreatePaymentLinkResponse.builder()
                .transactionId(saved.getId())
                .rescueOrderId(saved.getRescueOrderId())
                .rescueCode(saved.getRescueCode())
                .payosOrderCode(saved.getPayosOrderCode())
                .amount(saved.getAmount())
                .commissionRate(saved.getCommissionRate())
                .platformFee(saved.getPlatformFee())
                .netGarageAmount(saved.getNetGarageAmount())
                .paymentMethod(saved.getPaymentMethod())
                .status(saved.getStatus())
                .isSimulation(saved.isSimulation())
                .qrCode(saved.getQrCode())
                .checkoutUrl(saved.getCheckoutUrl())
                .bankName(saved.getBankName())
                .accountNumber(saved.getAccountNumber())
                .accountHolder(saved.getAccountHolder())
                .paymentContent(saved.getPaymentContent())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    public static PaymentTransactionResponse mapToResponse(PaymentTransaction tx) {
        Garage g = tx.getGarage();
        User c = tx.getCustomer();
        return PaymentTransactionResponse.builder()
                .id(tx.getId())
                .rescueOrderId(tx.getRescueOrderId())
                .rescueCode(tx.getRescueCode())
                .orderType(tx.getOrderType())
                .garageId(g != null ? g.getId() : null)
                .garageName(g != null ? g.getGarageName() : null)
                .customerId(c != null ? c.getId() : null)
                .customerName(c != null ? c.getFullName() : "Khách hàng cứu hộ")
                .customerPhone(c != null ? c.getPhone() : null)
                .payosOrderCode(tx.getPayosOrderCode())
                .amount(tx.getAmount())
                .commissionRate(tx.getCommissionRate())
                .platformFee(tx.getPlatformFee())
                .netGarageAmount(tx.getNetGarageAmount())
                .paymentMethod(tx.getPaymentMethod())
                .status(tx.getStatus())
                .isSimulation(tx.isSimulation())
                .reconciled(tx.isReconciled())
                .checksumValid(tx.isChecksumValid())
                .webhookSignature(tx.getWebhookSignature())
                .qrCode(tx.getQrCode())
                .checkoutUrl(tx.getCheckoutUrl())
                .bankName(tx.getBankName())
                .accountNumber(tx.getAccountNumber())
                .accountHolder(tx.getAccountHolder())
                .paymentContent(tx.getPaymentContent())
                .rawWebhookPayload(tx.getRawWebhookPayload())
                .createdAt(tx.getCreatedAt())
                .paidAt(tx.getPaidAt())
                .reconciledAt(tx.getReconciledAt())
                .build();
    }
}

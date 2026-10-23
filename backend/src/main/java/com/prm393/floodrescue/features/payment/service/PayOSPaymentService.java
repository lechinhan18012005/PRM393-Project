package com.prm393.floodrescue.features.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.config.PayOSConfig;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    // =========================================================================
    // UC-18: Create Payment Link (PayOS VietQR or Cash) & Split Calculation
    // =========================================================================

    @Transactional
    public CreatePaymentLinkResponse createPayment(User currentUser, CreatePaymentRequest request) {
        Garage garage = garageRepository.findById(request.getGarageId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy garage #" + request.getGarageId()));

        if (request.getAmount() == null || request.getAmount().compareTo(new BigDecimal("1000")) < 0) {
            throw new BadRequestException("Số tiền thanh toán tối thiểu là 1.000 VNĐ");
        }

        String orderType = (request.getOrderType() != null && !request.getOrderType().isBlank())
                ? request.getOrderType().trim().toUpperCase()
                : "SINGLE_CROSSING";

        // Tích hợp Giai đoạn 1 (UC-24): Lấy tỷ lệ hoa hồng hiện hành từ cấu hình của Admin
        BigDecimal commissionRate = resolveCommissionRate(orderType);
        BigDecimal amount = request.getAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal platformFee = amount.multiply(commissionRate)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal netGarageAmount = amount.subtract(platformFee);

        long payosOrderCode = generateUniqueOrderCode();
        String rescueCode = (request.getRescueCode() != null && !request.getRescueCode().isBlank())
                ? request.getRescueCode().trim()
                : "#RC-" + request.getRescueOrderId();
        String paymentContent = "RESCUE " + payosOrderCode;

        PaymentMethod method = request.getPaymentMethod() != null
                ? request.getPaymentMethod()
                : PaymentMethod.PAYOS_VIETQR;

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

        if (method == PaymentMethod.PAYOS_VIETQR && payOSConfig.isRealGatewayConfigured()) {
            try {
                Map<String, Object> bodyMap = new HashMap<>();
                bodyMap.put("orderCode", payosOrderCode);
                bodyMap.put("amount", amount.longValue());
                bodyMap.put("description", paymentContent);
                bodyMap.put("cancelUrl", payOSConfig.getCancelUrl());
                bodyMap.put("returnUrl", payOSConfig.getReturnUrl());
                bodyMap.put("signature", signature);

                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(4))
                        .build();
                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(payOSConfig.getEndpoint() + "/v2/payment-requests"))
                        .timeout(Duration.ofSeconds(5))
                        .header("Content-Type", "application/json")
                        .header("x-client-id", payOSConfig.getClientId())
                        .header("x-api-key", payOSConfig.getApiKey())
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(bodyMap)))
                        .build();

                HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
                JsonNode root = objectMapper.readTree(response.body());
                if (response.statusCode() == 200 && "00".equals(root.path("code").asText())) {
                    JsonNode data = root.path("data");
                    if (!data.path("qrCode").asText().isBlank()) {
                        qrCode = data.path("qrCode").asText();
                    }
                    if (!data.path("checkoutUrl").asText().isBlank()) {
                        checkoutUrl = data.path("checkoutUrl").asText();
                    }
                    if (!data.path("accountNumber").asText().isBlank()) {
                        accountNumber = data.path("accountNumber").asText();
                    }
                    if (!data.path("accountName").asText().isBlank()) {
                        accountHolder = data.path("accountName").asText();
                    }
                    log.info("Created real PayOS payment link for orderCode: {}", payosOrderCode);
                } else {
                    log.warn("PayOS gateway returned non-00 ({}): using dynamic VietQR fallback for orderCode {}",
                            root.path("desc").asText(), payosOrderCode);
                }
            } catch (Exception ex) {
                log.warn("Could not reach PayOS gateway ({}), using dynamic VietQR fallback for orderCode {}",
                        ex.getMessage(), payosOrderCode);
            }
        }

        PaymentTransaction tx = PaymentTransaction.builder()
                .rescueOrderId(request.getRescueOrderId())
                .rescueCode(rescueCode)
                .orderType(orderType)
                .garage(garage)
                .customer(currentUser)
                .payosOrderCode(payosOrderCode)
                .amount(amount)
                .commissionRate(commissionRate)
                .platformFee(platformFee)
                .netGarageAmount(netGarageAmount)
                .paymentMethod(method)
                .status(PaymentStatus.PENDING)
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
                .qrCode(saved.getQrCode())
                .checkoutUrl(saved.getCheckoutUrl())
                .bankName(saved.getBankName())
                .accountNumber(saved.getAccountNumber())
                .accountHolder(saved.getAccountHolder())
                .paymentContent(saved.getPaymentContent())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    // =========================================================================
    // UC-18 & UC-25: Handle PayOS Webhook, Verify HMAC & Settle Garage Wallet
    // =========================================================================

    @Transactional
    public PaymentTransactionResponse handlePayOSWebhook(PayOSWebhookPayload payload) {
        if (payload == null || payload.getData() == null || payload.getData().getOrderCode() == null) {
            throw new BadRequestException("Dữ liệu Webhook PayOS không hợp lệ hoặc thiếu orderCode");
        }

        Map<String, Object> dataMap = convertWebhookDataToMap(payload.getData());
        String expectedSignature = payOSConfig.createWebhookDataSignature(dataMap);

        if (payload.getSignature() == null || !expectedSignature.equalsIgnoreCase(payload.getSignature().trim())) {
            throw new BadRequestException("Chữ ký bảo mật Webhook PayOS (HMAC-SHA256) không hợp lệ");
        }

        Long orderCode = payload.getData().getOrderCode();
        PaymentTransaction tx = paymentTransactionRepository.findByPayosOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch với mã PayOS orderCode: " + orderCode));

        // Idempotency: Nếu giao dịch đã SUCCESS trước đó thì không cộng tiền ví lần 2
        if (tx.getStatus() == PaymentStatus.SUCCESS) {
            return mapToResponse(tx);
        }

        boolean isPaidSuccess = "00".equals(payload.getCode()) || Boolean.TRUE.equals(payload.getSuccess());
        if (!isPaidSuccess) {
            tx.setStatus(PaymentStatus.FAILED);
            tx.setWebhookSignature(payload.getSignature());
            try {
                tx.setRawWebhookPayload(objectMapper.writeValueAsString(payload));
            } catch (Exception ignored) {
            }
            return mapToResponse(paymentTransactionRepository.save(tx));
        }

        tx.setStatus(PaymentStatus.SUCCESS);
        tx.setReconciled(true);
        tx.setChecksumValid(true);
        tx.setWebhookSignature(payload.getSignature());
        tx.setPaidAt(LocalDateTime.now());
        tx.setReconciledAt(LocalDateTime.now());
        try {
            tx.setRawWebhookPayload(objectMapper.writeValueAsString(payload));
        } catch (Exception ignored) {
        }

        // Tích hợp Giai đoạn 1 (UC-26): Cộng tiền thực nhận (netGarageAmount) vào Ví Gara & ghi sổ WalletTransaction
        Garage garage = tx.getGarage();
        BigDecimal currentBalance = garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO;
        BigDecimal newBalance = currentBalance.add(tx.getNetGarageAmount());
        garage.setWalletBalance(newBalance);
        garageRepository.save(garage);

        WalletTransaction walletTx = WalletTransaction.builder()
                .garage(garage)
                .amount(tx.getNetGarageAmount())
                .balanceAfter(newBalance)
                .transactionType(WalletTransactionType.ORDER_INCOME)
                .referenceCode("PAYOS-" + tx.getPayosOrderCode())
                .description(String.format(
                        "Thu hộ PayOS đơn %s: Tổng %s đ - Hoa hồng sàn (%s%%): %s đ = Thực nhận +%s đ",
                        tx.getRescueCode(),
                        tx.getAmount().toPlainString(),
                        tx.getCommissionRate().toPlainString(),
                        tx.getPlatformFee().toPlainString(),
                        tx.getNetGarageAmount().toPlainString()
                ))
                .build();
        walletTransactionRepository.save(walletTx);

        PaymentTransaction saved = paymentTransactionRepository.save(tx);
        log.info("PayOS Webhook verified & settled orderCode {}: credited {} to garage {}",
                orderCode, tx.getNetGarageAmount(), garage.getId());
        return mapToResponse(saved);
    }

    /**
     * Giả lập bắn Webhook chuẩn chữ ký HMAC-SHA256 từ PayOS để phục vụ test tích hợp & demo local.
     */
    @Transactional
    public PaymentTransactionResponse simulatePayOSWebhook(Long payosOrderCode) {
        PaymentTransaction tx = paymentTransactionRepository.findByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch với mã PayOS orderCode: " + payosOrderCode));

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
    public PaymentTransactionResponse confirmCashPayment(Long payosOrderCode) {
        PaymentTransaction tx = paymentTransactionRepository.findByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch với mã orderCode: " + payosOrderCode));

        if (tx.getStatus() == PaymentStatus.SUCCESS) {
            return mapToResponse(tx);
        }

        tx.setPaymentMethod(PaymentMethod.CASH);
        tx.setStatus(PaymentStatus.SUCCESS);
        tx.setReconciled(true);
        tx.setChecksumValid(true);
        tx.setPaidAt(LocalDateTime.now());
        tx.setReconciledAt(LocalDateTime.now());

        // Với đơn thu tiền mặt trực tiếp tại hiện trường, thợ đã cầm đủ amount -> Khấu trừ phí hoa hồng nền tảng từ Ví Gara
        Garage garage = tx.getGarage();
        BigDecimal currentBalance = garage.getWalletBalance() != null ? garage.getWalletBalance() : BigDecimal.ZERO;
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
        return mapToResponse(saved);
    }

    // =========================================================================
    // UC-25: Query & Reconcile Transactions
    // =========================================================================

    @Transactional(readOnly = true)
    public PaymentTransactionResponse getTransactionByOrderCode(Long payosOrderCode) {
        PaymentTransaction tx = paymentTransactionRepository.findByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch #" + payosOrderCode));
        return mapToResponse(tx);
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getTransactionsByRescueOrder(Long rescueOrderId) {
        return paymentTransactionRepository.findByRescueOrderIdOrderByCreatedAtDesc(rescueOrderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getAllTransactions(PaymentStatus status) {
        List<PaymentTransaction> list = (status != null)
                ? paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(status)
                : paymentTransactionRepository.findAllByOrderByCreatedAtDesc();
        return list.stream()
                .map(this::mapToResponse)
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
                .map(this::mapToResponse)
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

    private long generateUniqueOrderCode() {
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

    private PaymentTransactionResponse mapToResponse(PaymentTransaction tx) {
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

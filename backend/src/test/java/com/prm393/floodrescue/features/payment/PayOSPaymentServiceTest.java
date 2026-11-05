package com.prm393.floodrescue.features.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.config.PayOSConfig;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.entity.CommissionConfig;
import com.prm393.floodrescue.features.finance.entity.WalletTransaction;
import com.prm393.floodrescue.features.finance.entity.WalletTransactionType;
import com.prm393.floodrescue.features.finance.repository.CommissionConfigRepository;
import com.prm393.floodrescue.features.finance.repository.PayoutRequestRepository;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.finance.service.FinanceAdminService;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.payment.dto.CreatePaymentLinkResponse;
import com.prm393.floodrescue.features.payment.dto.CreatePaymentRequest;
import com.prm393.floodrescue.features.payment.dto.PayOSWebhookPayload;
import com.prm393.floodrescue.features.payment.dto.PaymentTransactionResponse;
import com.prm393.floodrescue.features.payment.entity.PaymentMethod;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.payment.service.PayOSPaymentService;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.service.RescueDispatchService;
import com.prm393.floodrescue.features.rescue.service.RescueExecutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayOSPaymentServiceTest {

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private GarageRepository garageRepository;

    @Mock
    private WalletTransactionRepository walletTransactionRepository;

    @Mock
    private CommissionConfigRepository commissionConfigRepository;

    @Mock
    private PayoutRequestRepository payoutRequestRepository;

    @Mock
    private RescueOrderRepository rescueOrderRepository;

    @Mock
    private RescueExecutionService rescueExecutionService;

    @Mock
    private RescueDispatchService rescueDispatchService;

    private FinanceAdminService financeAdminService;
    private PayOSConfig payOSConfig;
    private PayOSPaymentService payOSPaymentService;

    private User customer;
    private Garage garage;

    @BeforeEach
    void setUp() {
        payOSConfig = new PayOSConfig();
        payOSConfig.setClientId("demo_client_id");
        payOSConfig.setApiKey("demo_api_key");
        payOSConfig.setChecksumKey("0cd5516e4494a92daf356b2bc8edfe4c31fc9db635fda074cb262be43f67964e");
        payOSConfig.setSimulationEnabled(true);

        financeAdminService = new FinanceAdminService(
                commissionConfigRepository,
                payoutRequestRepository,
                walletTransactionRepository,
                garageRepository,
                paymentTransactionRepository
        );

        payOSPaymentService = new PayOSPaymentService(
                paymentTransactionRepository,
                garageRepository,
                walletTransactionRepository,
                financeAdminService,
                payOSConfig,
                new ObjectMapper(),
                rescueOrderRepository,
                rescueExecutionService,
                rescueDispatchService,
                new com.prm393.floodrescue.features.payment.service.PaymentAttemptService(paymentTransactionRepository, rescueOrderRepository, financeAdminService, payOSConfig),
                null,
                new com.prm393.floodrescue.features.payment.service.PaymentSettlementService(paymentTransactionRepository, rescueOrderRepository, garageRepository, walletTransactionRepository, rescueExecutionService, rescueDispatchService)
        );

        customer = User.builder()
                .id(10L)
                .username("customer_01")
                .fullName("HoÃ ng VÄƒn KhÃ¡ch")
                .phone("0909111222")
                .role(Role.CUSTOMER)
                .build();

        garage = Garage.builder()
                .id(20L)
                .garageName("Gara Cá»©u Há»™ Nam SÃ i GÃ²n")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("1000000.00"))
                .build();
        lenient().when(garageRepository.lockWalletBalance(any())).thenAnswer(inv -> Optional.of(garage.getWalletBalance()));
        lenient().when(paymentTransactionRepository.findByCodeWithLock(any())).thenAnswer(inv -> paymentTransactionRepository.findByPayosOrderCode(inv.getArgument(0)));
        lenient().when(paymentTransactionRepository.findRescueOrderIdByCode(any())).thenAnswer(inv -> paymentTransactionRepository.findByPayosOrderCode(inv.getArgument(0)).map(PaymentTransaction::getRescueOrderId));
        lenient().when(commissionConfigRepository.findFirstByActiveTrueOrderByCreatedAtDesc())
                .thenReturn(Optional.of(CommissionConfig.builder().id(1L).globalRate(new BigDecimal("12.50")).singleCrossingRate(new BigDecimal("10.00")).waterloggedRepairRate(new BigDecimal("15.00")).active(true).build()));
    }

    @Test
    @DisplayName("UC-18 + UC-24: Khá»Ÿi táº¡o thanh toÃ¡n tá»± Ä‘á»™ng láº¥y tá»· lá»‡ hoa há»“ng tá»« UC-24 vÃ  tÃ­nh Ä‘Ãºng phÃ­ sÃ n / thá»±c nháº­n Gara")
    void createPayment_AppliesActiveCommissionFromPhase1() {
        RescueOrder order = RescueOrder.builder()
                .id(901L)
                .customer(customer)
                .garage(garage)
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .totalAmount(new BigDecimal("300000.00"))
                .orderCode("#RC-901")
                .build();

        when(rescueOrderRepository.findByIdWithLock(901L)).thenReturn(Optional.of(order));
        when(commissionConfigRepository.findFirstByActiveTrueOrderByCreatedAtDesc())
                .thenReturn(Optional.of(CommissionConfig.builder()
                        .id(1L)
                        .globalRate(new BigDecimal("12.50"))
                        .singleCrossingRate(new BigDecimal("10.00"))
                        .batchCrossingRate(new BigDecimal("10.00"))
                        .waterloggedRepairRate(new BigDecimal("15.00"))
                        .active(true)
                        .build()));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> {
            PaymentTransaction tx = inv.getArgument(0);
            tx.setId(500L);
            return tx;
        });

        CreatePaymentRequest req = CreatePaymentRequest.builder()
                .rescueOrderId(901L)
                .garageId(20L)
                .rescueCode("#RC-901")
                .orderType("SINGLE_CROSSING")
                .amount(new BigDecimal("300000.00"))
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .build();

        CreatePaymentLinkResponse res = payOSPaymentService.createPayment(customer, req);

        assertNotNull(res);
        assertEquals(500L, res.getTransactionId());
        assertEquals(new BigDecimal("10.00"), res.getCommissionRate());
        assertEquals(new BigDecimal("30000.00"), res.getPlatformFee());
        assertEquals(new BigDecimal("270000.00"), res.getNetGarageAmount());
        assertEquals(PaymentStatus.PENDING, res.getStatus());
        assertNotNull(res.getQrCode());
    }

    @Test
    @DisplayName("Luá»“ng 4: Thanh toÃ¡n sá»­a táº¡i chá»— dÃ¹ng tá»· lá»‡ hoa há»“ng cá»©u há»™ xe ngáº­p")
    void createPayment_OnsiteRepairUsesWaterloggedRepairRate() {
        RescueOrder order = RescueOrder.builder()
                .id(903L).customer(customer).garage(garage)
                .orderType(OrderType.ONSITE_REPAIR)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .totalAmount(new BigDecimal("200000.00")).orderCode("#RC-903")
                .build();
        when(rescueOrderRepository.findByIdWithLock(903L)).thenReturn(Optional.of(order));
        when(commissionConfigRepository.findFirstByActiveTrueOrderByCreatedAtDesc())
                .thenReturn(Optional.of(CommissionConfig.builder()
                        .globalRate(new BigDecimal("12.50"))
                        .singleCrossingRate(new BigDecimal("10.00"))
                        .waterloggedRepairRate(new BigDecimal("15.00"))
                        .active(true).build()));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> {
            PaymentTransaction tx = inv.getArgument(0);
            tx.setId(503L);
            return tx;
        });

        CreatePaymentLinkResponse response = payOSPaymentService.createPayment(customer,
                CreatePaymentRequest.builder().rescueOrderId(903L).garageId(20L)
                        .amount(new BigDecimal("200000.00"))
                        .paymentMethod(PaymentMethod.PAYOS_VIETQR).build());

        assertEquals(new BigDecimal("15.00"), response.getCommissionRate());
        assertEquals(new BigDecimal("30000.00"), response.getPlatformFee());
        assertEquals(new BigDecimal("170000.00"), response.getNetGarageAmount());
    }

    @Test
    @DisplayName("UC-18 + UC-26: Webhook PayOS há»£p lá»‡ tá»± Ä‘á»™ng cá»™ng tiá»n thá»±c nháº­n vÃ o VÃ­ Gara, ghi sá»• WalletTransaction vÃ  hoÃ n táº¥t Ä‘Æ¡n cá»©u há»™")
    void handlePayOSWebhook_ValidSignature_CreditsGarageWallet() {
        RescueOrder order = RescueOrder.builder()
                .id(902L)
                .customer(customer)
                .garage(garage)
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .totalAmount(new BigDecimal("400000.00"))
                .orderCode("#RC-902")
                .build();

        PaymentTransaction pendingTx = PaymentTransaction.builder()
                .id(501L)
                .rescueOrderId(902L)
                .rescueCode("#RC-902")
                .garage(garage)
                .customer(customer)
                .payosOrderCode(88990011L)
                .amount(new BigDecimal("400000.00"))
                .commissionRate(new BigDecimal("12.50"))
                .platformFee(new BigDecimal("50000.00"))
                .netGarageAmount(new BigDecimal("350000.00"))
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .simulation(true).paymentContent("RESCUE 88990011")
                .status(PaymentStatus.PENDING)
                .build();

        when(rescueOrderRepository.findByIdWithLock(902L)).thenReturn(Optional.of(order));
        when(paymentTransactionRepository.findByPayosOrderCode(88990011L)).thenReturn(Optional.of(pendingTx));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransactionResponse settled = payOSPaymentService.simulatePayOSWebhook(customer, 88990011L);

        assertEquals(PaymentStatus.SUCCESS, settled.getStatus());
        assertTrue(settled.isReconciled());
        assertTrue(settled.isChecksumValid());
        // VÃ­ Gara ban Ä‘áº§u 1.000.000 + 350.000 (netGarageAmount) = 1.350.000
        assertEquals(new BigDecimal("1350000.00"), garage.getWalletBalance());

        ArgumentCaptor<WalletTransaction> captor = ArgumentCaptor.forClass(WalletTransaction.class);
        verify(walletTransactionRepository, times(1)).save(captor.capture());
        assertEquals(WalletTransactionType.ORDER_INCOME, captor.getValue().getTransactionType());
        assertEquals(new BigDecimal("350000.00"), captor.getValue().getAmount());
        assertEquals(new BigDecimal("1350000.00"), captor.getValue().getBalanceAfter());

        // Kiá»ƒm tra lá»‡nh hoÃ n táº¥t Ä‘Æ¡n cá»©u há»™
        verify(rescueExecutionService, times(1)).markPaymentSuccessful(
                eq(902L), eq(501L), eq(88990011L), eq("PAYOS"), eq(new BigDecimal("400000.00")), any()
        );
    }

    @Test
    @DisplayName("UC-18: Cháº·n Webhook PayOS giáº£ máº¡o khi chá»¯ kÃ½ HMAC-SHA256 sai lá»‡ch")
    void handlePayOSWebhook_InvalidSignature_ThrowsBadRequest() {
        PayOSWebhookPayload tamperedPayload = PayOSWebhookPayload.builder()
                .code("00")
                .desc("success")
                .success(true)
                .data(PayOSWebhookPayload.WebhookData.builder()
                        .orderCode(88990011L)
                        .amount(400000L)
                        .description("RESCUE 88990011")
                        .build())
                .signature("invalid_tampered_hmac_signature_123456")
                .build();

        assertThrows(BadRequestException.class, () -> payOSPaymentService.handlePayOSWebhook(tamperedPayload));
        verify(garageRepository, never()).save(any(Garage.class));
        verify(walletTransactionRepository, never()).save(any(WalletTransaction.class));
        verify(rescueExecutionService, never()).markPaymentSuccessful(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("UC-18: XÃ¡c nháº­n thu tiá»n máº·t bá»Ÿi Thá»£ phÃ¢n cÃ´ng tá»± Ä‘á»™ng kháº¥u trá»« hoa há»“ng ná»n táº£ng vÃ  hoÃ n táº¥t Ä‘Æ¡n")
    void confirmCashPayment_DeductsCommissionFromGarageWallet() {
        User mechanicUser = User.builder()
                .id(30L)
                .username("mechanic_01")
                .fullName("Thá»£ Cá»©u Há»™")
                .role(Role.FIELD_MECHANIC)
                .build();

        MechanicStaff staff = MechanicStaff.builder()
                .id(40L)
                .user(mechanicUser)
                .build();

        RescueOrder order = RescueOrder.builder()
                .id(903L)
                .customer(customer)
                .garage(garage)
                .mechanicStaff(staff)
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .totalAmount(new BigDecimal("200000.00"))
                .orderCode("#RC-903")
                .build();

        PaymentTransaction cashTx = PaymentTransaction.builder()
                .id(502L)
                .rescueOrderId(903L)
                .rescueCode("#RC-903")
                .garage(garage)
                .customer(customer)
                .payosOrderCode(88990022L)
                .amount(new BigDecimal("200000.00"))
                .commissionRate(new BigDecimal("10.00"))
                .platformFee(new BigDecimal("20000.00"))
                .netGarageAmount(new BigDecimal("180000.00"))
                .paymentMethod(PaymentMethod.CASH)
                .status(PaymentStatus.PENDING)
                .build();

        when(paymentTransactionRepository.findByPayosOrderCode(88990022L)).thenReturn(Optional.of(cashTx));
        when(rescueOrderRepository.findByIdWithLock(903L)).thenReturn(Optional.of(order));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransactionResponse confirmed = payOSPaymentService.confirmCashPayment(mechanicUser, 88990022L);

        assertEquals(PaymentStatus.SUCCESS, confirmed.getStatus());
        assertEquals(PaymentMethod.CASH, confirmed.getPaymentMethod());
        // VÃ­ Gara ban Ä‘áº§u 1.000.000 - 20.000 phÃ­ hoa há»“ng sÃ n = 980.000
        assertEquals(new BigDecimal("980000.00"), garage.getWalletBalance());
        verify(walletTransactionRepository, times(1)).save(any(WalletTransaction.class));
        verify(rescueExecutionService, times(1)).markPaymentSuccessful(
                eq(903L), eq(502L), eq(88990022L), eq("CASH"), eq(new BigDecimal("200000.00")), any()
        );
    }

    @Test
    @DisplayName("UC-18: Khởi tạo thanh toán áp dụng tỷ lệ chiết khấu riêng của Gara (garage.commissionRate = 8.0%)")
    void createPayment_WithPerGarageCommissionRate_OverridesGlobalConfig() {
        Garage customGarage = Garage.builder()
                .id(101L)
                .owner(User.builder().id(2L).build())
                .garageName("Gara Thủy Kích Sài Gòn")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("5000000.00"))
                .commissionRate(new BigDecimal("8.00"))
                .build();

        RescueOrder order = RescueOrder.builder()
                .id(904L)
                .customer(customer)
                .garage(customGarage)
                .orderType(OrderType.TOWING)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .totalAmount(new BigDecimal("1000000.00"))
                .orderCode("#RC-904")
                .build();

        when(rescueOrderRepository.findByIdWithLock(904L)).thenReturn(Optional.of(order));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> {
            PaymentTransaction tx = inv.getArgument(0);
            tx.setId(701L);
            return tx;
        });

        CreatePaymentRequest req = CreatePaymentRequest.builder()
                .rescueOrderId(904L)
                .amount(new BigDecimal("1000000.00"))
                .garageId(101L)
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .build();

        CreatePaymentLinkResponse res = payOSPaymentService.createPayment(customer, req);
        assertNotNull(res);
        // Chiết khấu 8.00% thay vì 15.00% của cấu hình chung loại WATERLOGGED_REPAIR
        assertEquals(new BigDecimal("8.00"), res.getCommissionRate());
        assertEquals(new BigDecimal("80000.00"), res.getPlatformFee());
        assertEquals(new BigDecimal("920000.00"), res.getNetGarageAmount());
    }

    @Test
    @DisplayName("UC-18: Khởi tạo thanh toán loại Vượt ngập (SINGLE_CROSSING) lấy đúng tỷ lệ 10.00%")
    void createPayment_SingleCrossingType_UsesSingleCrossing10Percent() {
        RescueOrder order = RescueOrder.builder()
                .id(905L)
                .customer(customer)
                .garage(garage)
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .totalAmount(new BigDecimal("300000.00"))
                .orderCode("#RC-905")
                .build();

        when(rescueOrderRepository.findByIdWithLock(905L)).thenReturn(Optional.of(order));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> {
            PaymentTransaction tx = inv.getArgument(0);
            tx.setId(702L);
            return tx;
        });

        CreatePaymentRequest req = CreatePaymentRequest.builder()
                .rescueOrderId(905L)
                .amount(new BigDecimal("300000.00"))
                .garageId(garage.getId())
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .build();

        CreatePaymentLinkResponse res = payOSPaymentService.createPayment(customer, req);
        assertEquals(new BigDecimal("10.00"), res.getCommissionRate());
        assertEquals(new BigDecimal("30000.00"), res.getPlatformFee());
        assertEquals(new BigDecimal("270000.00"), res.getNetGarageAmount());
    }

    @Test
    @DisplayName("UC-18: Chặn khởi tạo thanh toán khi đơn chưa ở trạng thái PAYMENT_PENDING")
    void createPayment_OrderNotPaymentPending_ThrowsBadRequest() {
        RescueOrder order = RescueOrder.builder()
                .id(906L)
                .customer(customer)
                .garage(garage)
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.REQUESTED)
                .totalAmount(new BigDecimal("200000.00"))
                .build();

        when(rescueOrderRepository.findByIdWithLock(906L)).thenReturn(Optional.of(order));

        CreatePaymentRequest req = CreatePaymentRequest.builder()
                .rescueOrderId(906L)
                .amount(new BigDecimal("200000.00"))
                .garageId(garage.getId())
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .build();

        assertThrows(BadRequestException.class, () -> payOSPaymentService.createPayment(customer, req));
    }

    @Test
    @DisplayName("UC-18: Chặn khởi tạo thanh toán số tiền nhỏ hơn 1.000 VNĐ")
    void createPayment_MinimumAmountViolationUnder1k_ThrowsBadRequest() {
        RescueOrder order = RescueOrder.builder()
                .id(907L)
                .customer(customer)
                .garage(garage)
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .totalAmount(new BigDecimal("500.00"))
                .build();

        when(rescueOrderRepository.findByIdWithLock(907L)).thenReturn(Optional.of(order));

        CreatePaymentRequest req = CreatePaymentRequest.builder()
                .rescueOrderId(907L)
                .amount(new BigDecimal("500.00"))
                .garageId(garage.getId())
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .build();

        assertThrows(BadRequestException.class, () -> payOSPaymentService.createPayment(customer, req));
    }

    @Test
    @DisplayName("UC-18: Nhận Webhook PayOS giả lập (Simulation Mode) xử lý thành công")
    void processWebhook_SimulationMode_Success() {
        RescueOrder order = RescueOrder.builder()
                .id(908L)
                .customer(customer)
                .garage(garage)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .orderCode("#RC-908")
                .build();

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(801L)
                .rescueOrderId(908L)
                .garage(garage)
                .customer(customer)
                .payosOrderCode(12345678L)
                .amount(new BigDecimal("400000.00"))
                .platformFee(new BigDecimal("40000.00"))
                .netGarageAmount(new BigDecimal("360000.00"))
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .status(PaymentStatus.PENDING)
                .simulation(true)
                .build();

        when(rescueOrderRepository.findByIdWithLock(908L)).thenReturn(Optional.of(order));
        when(paymentTransactionRepository.findByPayosOrderCode(12345678L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransactionResponse res = payOSPaymentService.simulatePayOSWebhook(customer, 12345678L);
        assertEquals(PaymentStatus.SUCCESS, res.getStatus());
        assertEquals(new BigDecimal("1360000.00"), garage.getWalletBalance());
        verify(walletTransactionRepository, times(1)).save(any(WalletTransaction.class));
    }

    @Test
    @DisplayName("UC-18: Đảm bảo tính lũy đẳng: Webhook gọi lần 2 không cộng tiền ví Gara lần nữa")
    void processWebhook_IdempotentDuplicateCall_DoesNotCreditWalletTwice() {
        RescueOrder completedOrder = RescueOrder.builder()
                .id(909L)
                .customer(customer)
                .garage(garage)
                .paymentTransactionId(802L)
                .status(RescueOrderStatus.COMPLETED)
                .build();

        PaymentTransaction alreadyPaidTx = PaymentTransaction.builder()
                .id(802L)
                .rescueOrderId(909L)
                .garage(garage)
                .customer(customer)
                .payosOrderCode(87654321L)
                .amount(new BigDecimal("500000.00"))
                .netGarageAmount(new BigDecimal("450000.00"))
                .status(PaymentStatus.SUCCESS)
                .simulation(true)
                .build();

        when(rescueOrderRepository.findByIdWithLock(909L)).thenReturn(Optional.of(completedOrder));
        when(paymentTransactionRepository.findByPayosOrderCode(87654321L)).thenReturn(Optional.of(alreadyPaidTx));

        PaymentTransactionResponse res = payOSPaymentService.simulatePayOSWebhook(customer, 87654321L);
        assertEquals(PaymentStatus.SUCCESS, res.getStatus());
        assertEquals(new BigDecimal("1000000.00"), garage.getWalletBalance());
        verify(walletTransactionRepository, never()).save(any(WalletTransaction.class));
    }

    @Test
    @DisplayName("UC-18: Webhook báo lỗi khi không tìm thấy giao dịch thanh toán trong hệ thống")
    void processWebhook_TransactionNotFound_ThrowsBadRequest() {
        when(paymentTransactionRepository.findByPayosOrderCode(99999999L)).thenReturn(Optional.empty());

        assertThrows(com.prm393.floodrescue.common.exception.ResourceNotFoundException.class,
                () -> payOSPaymentService.simulatePayOSWebhook(customer, 99999999L));
    }
}

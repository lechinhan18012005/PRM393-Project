package com.prm393.floodrescue.features.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.config.PayOSConfig;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.payment.dto.PayOSWebhookPayload;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RescuePaymentIntegrationTest {
    @Autowired private jakarta.persistence.EntityManager entityManager;

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private GarageRepository garageRepository;
    @Autowired private ServiceItemRepository serviceItemRepository;
    @Autowired private MechanicStaffRepository mechanicRepository;
    @Autowired private RescueOrderRepository rescueOrderRepository;
    @Autowired private PaymentTransactionRepository paymentTransactionRepository;
    @Autowired private PayOSConfig payOSConfig;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User customer;
    private User otherCustomer;
    private User mechanicUser;
    private User garageOwner;
    private MechanicStaff mechanicStaff;
    private Garage garage;
    private RescueOrder rescueOrder;

    private String customerToken;
    private String otherCustomerToken;
    private String mechanicToken;
    private String garageOwnerToken;

    @BeforeEach
    void setUp() {
        payOSConfig.setSimulationEnabled(true);

        customer = userRepository.save(User.builder()
                .username("cust_pay_01")
                .email("cust_pay_01@test.com")
                .phone("0911000001")
                .fullName("Nguyễn Khách Hàng")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        otherCustomer = userRepository.save(User.builder()
                .username("cust_pay_02")
                .email("cust_pay_02@test.com")
                .phone("0911000002")
                .fullName("Trần Khách Lạ")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        garageOwner = userRepository.save(User.builder()
                .username("owner_pay_01")
                .email("owner_pay_01@test.com")
                .phone("0911000003")
                .fullName("Lê Chủ Gara")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.GARAGE_OWNER)
                .active(true)
                .build());

        garage = garageRepository.save(Garage.builder()
                .owner(garageOwner)
                .garageName("Gara Sài Gòn Cứu Hộ")
                .phone("0911000003")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("500000.00"))
                .build());

        mechanicUser = userRepository.save(User.builder()
                .username("mech_pay_01")
                .email("mech_pay_01@test.com")
                .phone("0911000004")
                .fullName("Phạm Thợ Máy")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.FIELD_MECHANIC)
                .active(true)
                .build());

        mechanicStaff = mechanicRepository.save(MechanicStaff.builder()
                .user(mechanicUser)
                .garage(garage)
                .workingStatus(MechanicStatus.AVAILABLE)
                .hasCrossingCapability(true)
                .currentLatitude(10.7300)
                .currentLongitude(106.7000)
                .lastHeartbeatAt(LocalDateTime.now())
                .build());

        ServiceItem serviceItem = serviceItemRepository.save(ServiceItem.builder()
                .garage(garage)
                .serviceName("Chở xe qua ngập")
                .serviceType(ServiceType.CROSSING)
                .standardPrice(new BigDecimal("220000.00"))
                .active(true)
                .build());

        rescueOrder = rescueOrderRepository.save(RescueOrder.builder()
                .customer(customer)
                .garage(garage)
                .serviceItem(serviceItem)
                .mechanicStaff(mechanicStaff)
                .vehiclePlate("59-X1 999.88")
                .orderType(OrderType.SINGLE_CROSSING)
                .status(RescueOrderStatus.PAYMENT_PENDING)
                .serviceBasePrice(new BigDecimal("220000.00"))
                .bookingFee(new BigDecimal("30000.00"))
                .totalAmount(new BigDecimal("250000.00"))
                .orderCode("SOS-PAY-2026")
                .transportStage(TransportStage.HANDED_OVER)
                .pickupAddress("Điểm ngập Lê Văn Lương")
                .dropoffAddress("Điểm khô Nguyễn Thị Thập")
                .pickupLatitude(10.7300)
                .pickupLongitude(106.7000)
                .dropoffLatitude(10.7400)
                .dropoffLongitude(106.7100)
                .requestedAt(LocalDateTime.now().minusMinutes(30))
                .acceptedAt(LocalDateTime.now().minusMinutes(25))
                .arrivedAt(LocalDateTime.now().minusMinutes(20))
                .serviceStartedAt(LocalDateTime.now().minusMinutes(15))
                .serviceCompletedAt(LocalDateTime.now().minusMinutes(5))
                .completionPhotoUrl("https://res.cloudinary.com/demo/image/upload/v1/test_completion.jpg")
                .build());

        customerToken = jwtService.generateToken(customer);
        otherCustomerToken = jwtService.generateToken(otherCustomer);
        mechanicToken = jwtService.generateToken(mechanicUser);
        garageOwnerToken = jwtService.generateToken(garageOwner);
    }

    @Test
    @DisplayName("1. Khách sở hữu đơn tạo link PayOS thành công, đúng giá và đúng garage từ server")
    void createPayment_Success_ValidOrderAndOwner() throws Exception {
        String reqJson = """
                {
                  "rescueOrderId": %d,
                  "garageId": %d,
                  "amount": 250000,
                  "paymentMethod": "PAYOS_VIETQR"
                }
                """.formatted(rescueOrder.getId(), garage.getId());

        mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rescueOrderId").value(rescueOrder.getId()))
                .andExpect(jsonPath("$.data.amount").value(250000.00))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.qrCode").isNotEmpty())
                .andExpect(jsonPath("$.data.checkoutUrl").isNotEmpty())
                .andExpect(jsonPath("$.data.payosOrderCode").isNumber());
    }

    @Test
    @DisplayName("2. Khách khác cố tình tạo payment cho đơn người khác -> 403 Forbidden")
    void createPayment_WrongCustomer_Forbidden() throws Exception {
        String reqJson = """
                {
                  "rescueOrderId": %d,
                  "amount": 250000
                }
                """.formatted(rescueOrder.getId());

        mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + otherCustomerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("3. Client cố tình sửa giá hoặc sửa garageId sai lệch với đơn -> 400 Bad Request")
    void createPayment_PriceOrGarageTampered_BadRequest() throws Exception {
        // Giá gửi lên 150.000 trong khi đơn thực tế là 250.000
        String reqJson = """
                {
                  "rescueOrderId": %d,
                  "garageId": %d,
                  "amount": 150000
                }
                """.formatted(rescueOrder.getId(), garage.getId());

        mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("4. Nhấn tạo payment nhiều lần trong 15 phút -> Trả lại attempt PENDING cũ, không tạo attempt mới")
    void createPayment_Idempotent_ReusesActivePendingAttempt() throws Exception {
        String reqJson = """
                {
                  "rescueOrderId": %d
                }
                """.formatted(rescueOrder.getId());

        String res1 = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long code1 = mapper.readTree(res1).get("data").get("payosOrderCode").asLong();

        String res2 = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long code2 = mapper.readTree(res2).get("data").get("payosOrderCode").asLong();

        assertEquals(code1, code2, "Phải tái sử dụng payosOrderCode cũ thay vì sinh orderCode mới");
    }

    @Test
    @DisplayName("5. Webhook PayOS hợp lệ -> Đổi Payment SUCCESS, cộng ví Gara, và chuyển RescueOrder sang COMPLETED")
    void webhook_Valid_SettlesPaymentAndCompletesOrder() throws Exception {
        // Tạo payment transaction trước
        String reqJson = """
                {
                  "rescueOrderId": %d
                }
                """.formatted(rescueOrder.getId());

        String res = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long orderCode = mapper.readTree(res).get("data").get("payosOrderCode").asLong();

        // Chuẩn bị payload webhook thật với chữ ký HMAC-SHA256 hợp lệ
        Map<String, Object> dataMap = new HashMap<>();
        dataMap.put("orderCode", orderCode);
        dataMap.put("amount", 250000L);
        dataMap.put("description", "RESCUE " + orderCode);
        dataMap.put("accountNumber", "038299482910");
        dataMap.put("reference", "FT_TEST_01");
        dataMap.put("transactionDateTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        dataMap.put("currency", "VND");
        dataMap.put("paymentLinkId", "plink_" + orderCode);
        dataMap.put("code", "00");
        dataMap.put("desc", "Thành công");

        String validSig = payOSConfig.createWebhookDataSignature(dataMap);

        PayOSWebhookPayload webhookPayload = PayOSWebhookPayload.builder()
                .code("00")
                .desc("success")
                .success(true)
                .data(PayOSWebhookPayload.WebhookData.builder()
                        .orderCode(orderCode)
                        .amount(250000L)
                        .description("RESCUE " + orderCode)
                        .accountNumber("038299482910")
                        .reference("FT_TEST_01")
                        .transactionDateTime((String) dataMap.get("transactionDateTime"))
                        .currency("VND")
                        .paymentLinkId("plink_" + orderCode)
                        .code("00")
                        .desc("Thành công")
                        .build())
                .signature(validSig)
                .build();

        mvc.perform(post("/api/v1/payments/payos/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(webhookPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        // Kiểm tra RescueOrder đã chuyển sang COMPLETED
        RescueOrder updated = rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow();
        assertEquals(RescueOrderStatus.COMPLETED, updated.getStatus());
        assertNotNull(updated.getPaidAt());
        assertEquals("PAYOS", updated.getPaymentMethod());
        assertEquals(orderCode, updated.getPaymentOrderCode());

        // Kiểm tra Ví Gara đã được cộng tiền (500.000 + netGarageAmount)
        Garage updatedGarage = garageRepository.findById(garage.getId()).orElseThrow();
        assertTrue(updatedGarage.getWalletBalance().compareTo(new BigDecimal("500000.00")) > 0);

        // Gọi lại webhook lặp -> Vẫn trả SUCCESS, không cộng tiền ví lần hai
        BigDecimal balanceBeforeRepeat = updatedGarage.getWalletBalance();
        mvc.perform(post("/api/v1/payments/payos/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(webhookPayload)))
                .andExpect(status().isOk());

        Garage garageAfterRepeat = garageRepository.findById(garage.getId()).orElseThrow();
        assertEquals(balanceBeforeRepeat, garageAfterRepeat.getWalletBalance(), "Idempotent: Số dư không được thay đổi khi webhook lặp");
    }

    @Test
    @DisplayName("6. Webhook PayOS sai số tiền thanh toán -> 400 Bad Request và không thay đổi DB")
    void webhook_AmountMismatch_BadRequest() throws Exception {
        String reqJson = """
                {
                  "rescueOrderId": %d
                }
                """.formatted(rescueOrder.getId());

        String res = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long orderCode = mapper.readTree(res).get("data").get("payosOrderCode").asLong();

        // Webhook gửi số tiền 100.000 thay vì 250.000
        Map<String, Object> dataMap = new HashMap<>();
        dataMap.put("orderCode", orderCode);
        dataMap.put("amount", 100000L);
        dataMap.put("description", "RESCUE " + orderCode);
        dataMap.put("accountNumber", "038299482910");
        dataMap.put("reference", "FT_TEST_TAMPER");
        dataMap.put("transactionDateTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        dataMap.put("currency", "VND");
        dataMap.put("paymentLinkId", "plink_" + orderCode);
        dataMap.put("code", "00");
        dataMap.put("desc", "Thành công");

        String validSig = payOSConfig.createWebhookDataSignature(dataMap);

        PayOSWebhookPayload webhookPayload = PayOSWebhookPayload.builder()
                .code("00")
                .desc("success")
                .success(true)
                .data(PayOSWebhookPayload.WebhookData.builder()
                        .orderCode(orderCode)
                        .amount(100000L)
                        .description("RESCUE " + orderCode)
                        .build())
                .signature(validSig)
                .build();

        mvc.perform(post("/api/v1/payments/payos/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(webhookPayload)))
                .andExpect(status().isBadRequest());

        RescueOrder notUpdated = rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow();
        assertEquals(RescueOrderStatus.PAYMENT_PENDING, notUpdated.getStatus(), "Trạng thái đơn không đổi khi tiền sai");
    }

    @Test
    @DisplayName("7. Khách hàng cố tình gọi confirm-cash -> 403 Forbidden. Chỉ Thợ phân công hoặc Gara mới được confirm")
    void confirmCash_CustomerForbidden_MechanicAllowed() throws Exception {
        String reqJson = """
                {
                  "rescueOrderId": %d,
                  "paymentMethod": "CASH"
                }
                """.formatted(rescueOrder.getId());

        String res = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long orderCode = mapper.readTree(res).get("data").get("payosOrderCode").asLong();

        // Khách hàng cố tình xác nhận đã nộp tiền mặt -> Bị từ chối
        mvc.perform(post("/api/v1/payments/" + orderCode + "/confirm-cash")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        // Thợ được phân công xác nhận nộp tiền mặt -> Thành công
        mvc.perform(post("/api/v1/payments/" + orderCode + "/confirm-cash")
                        .header("Authorization", "Bearer " + mechanicToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.paymentMethod").value("CASH"));

        RescueOrder completedOrder = rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow();
        assertEquals(RescueOrderStatus.COMPLETED, completedOrder.getStatus());
        assertEquals("CASH", completedOrder.getPaymentMethod());
    }

    @Test
    @DisplayName("8. Tra cứu thông tin thanh toán của người khác bị chặn 403 Forbidden")
    void getPayment_OtherUserForbidden() throws Exception {
        String reqJson = """
                {
                  "rescueOrderId": %d
                }
                """.formatted(rescueOrder.getId());

        String res = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long orderCode = mapper.readTree(res).get("data").get("payosOrderCode").asLong();

        // Khách lạ xem thông tin payment của đơn người khác -> 403
        mvc.perform(get("/api/v1/payments/" + orderCode)
                        .header("Authorization", "Bearer " + otherCustomerToken))
                .andExpect(status().isForbidden());

        // Khách sở hữu đơn xem thông tin payment -> 200 OK
        mvc.perform(get("/api/v1/payments/" + orderCode)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.payosOrderCode").value(orderCode));
    }

    @Test
    @DisplayName("9. [Issue 1 Regression] Hai payment attempt A và B cùng nhận webhook -> Chỉ cộng ví 1 lần, attempt thứ hai DUPLICATE_PAID")
    void webhook_TwoAttemptsSameOrder_CreditsWalletOnlyOnce() throws Exception {
        // Tạo attempt A
        String reqJson = """
                {
                  "rescueOrderId": %d
                }
                """.formatted(rescueOrder.getId());

        String resA = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long orderCodeA = mapper.readTree(resA).get("data").get("payosOrderCode").asLong();

        // Đẩy created_at của attempt A về trước 20 phút để createPayment tạo attempt B
        PaymentTransaction txA = paymentTransactionRepository.findByPayosOrderCode(orderCodeA).orElseThrow();
        txA.setCreatedAt(LocalDateTime.now().minusMinutes(20));
        paymentTransactionRepository.save(txA);

        // Tạo attempt B
        String resB = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long orderCodeB = mapper.readTree(resB).get("data").get("payosOrderCode").asLong();
        assertEquals(orderCodeA, orderCodeB, "Mở lại sau 20 phút vẫn phải giữ link cũ cho tới khi gateway xác nhận kết thúc");
        // A legacy/orphan link from before this fix can still report a late payment.
        PaymentTransaction legacyTxB = new PaymentTransaction();
        org.springframework.beans.BeanUtils.copyProperties(txA, legacyTxB, "id", "payosOrderCode");
        orderCodeB = orderCodeA + 1;
        legacyTxB.setPayosOrderCode(orderCodeB);
        legacyTxB.setStatus(PaymentStatus.CANCELLED);
        paymentTransactionRepository.saveAndFlush(legacyTxB);

        BigDecimal initialBalance = garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance(); // 500.000

        // Gửi webhook hợp lệ cho attempt A
        PayOSWebhookPayload payloadA = buildValidWebhookPayload(orderCodeA, 250000L);
        mvc.perform(post("/api/v1/payments/payos/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(payloadA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        // Kiểm tra sau attempt A: ví được cộng 1 lần (+218.750 đ với commission 12.5%) -> 718.750 đ
        Garage garageAfterA = garageRepository.findById(garage.getId()).orElseThrow();
        BigDecimal expectedBalanceAfterOne = initialBalance.add(new BigDecimal("218750.00"));
        assertEquals(0, expectedBalanceAfterOne.compareTo(garageAfterA.getWalletBalance()),
                "Ví gara phải được cộng chính xác tiền thực nhận sau attempt A");

        RescueOrder orderAfterA = rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow();
        assertEquals(RescueOrderStatus.COMPLETED, orderAfterA.getStatus());
        assertEquals(txA.getId(), orderAfterA.getPaymentTransactionId());

        // Gửi tiếp webhook hợp lệ cho attempt B
        PayOSWebhookPayload payloadB = buildValidWebhookPayload(orderCodeB, 250000L);
        mvc.perform(post("/api/v1/payments/payos/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(payloadB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DUPLICATE_PAID"));

        // Kiểm tra sau attempt B: Ví gara TUYỆT ĐỐI KHÔNG được cộng lần 2 (vẫn là 718.750 đ)
        Garage garageAfterB = garageRepository.findById(garage.getId()).orElseThrow();
        assertEquals(0, expectedBalanceAfterOne.compareTo(garageAfterB.getWalletBalance()),
                "Ví gara tuyệt đối không được cộng lần 2 cho cùng 1 đơn!");

        PaymentTransaction txB = paymentTransactionRepository.findByPayosOrderCode(orderCodeB).orElseThrow();
        assertEquals(PaymentStatus.DUPLICATE_PAID, txB.getStatus(), "Attempt B phải được đánh dấu DUPLICATE_PAID");
        assertFalse(txB.isReconciled());
    }

    @Test
    @DisplayName("10. [Issue 3 Regression] Tắt simulation nhưng thiếu cấu hình real gateway -> 400 Bad Request, không trả tài khoản mẫu")
    void createPayment_RealNotConfiguredAndSimulationDisabled_ThrowsBadRequest() throws Exception {
        payOSConfig.setSimulationEnabled(false);

        String reqJson = """
                {
                  "rescueOrderId": %d
                }
                """.formatted(rescueOrder.getId());

        mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Cổng thanh toán PayOS chưa được cấu hình")));

        payOSConfig.setSimulationEnabled(true);
    }

    @Test
    @DisplayName("11. [Issue 4 Regression] Data có chữ ký đúng nhưng data.code='99' (thất bại) -> FAILED, không cộng ví")
    void webhook_DataCodeError_DoesNotSettle() throws Exception {
        String reqJson = """
                {
                  "rescueOrderId": %d
                }
                """.formatted(rescueOrder.getId());

        String res = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long orderCode = mapper.readTree(res).get("data").get("payosOrderCode").asLong();

        // Ký đúng data nhưng data.code = "99" (lỗi từ ngân hàng)
        Map<String, Object> dataMap = new HashMap<>();
        dataMap.put("orderCode", orderCode);
        dataMap.put("amount", 250000L);
        dataMap.put("description", "RESCUE " + orderCode);
        dataMap.put("accountNumber", "038299482910");
        dataMap.put("reference", "FT_FAIL_01");
        dataMap.put("transactionDateTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        dataMap.put("currency", "VND");
        dataMap.put("paymentLinkId", "plink_" + orderCode);
        dataMap.put("code", "99");
        dataMap.put("desc", "Giao dịch lỗi/bị hủy");

        String validSig = payOSConfig.createWebhookDataSignature(dataMap);

        PayOSWebhookPayload webhookPayload = PayOSWebhookPayload.builder()
                .code("00")
                .desc("success")
                .success(true)
                .data(PayOSWebhookPayload.WebhookData.builder()
                        .orderCode(orderCode)
                        .amount(250000L)
                        .description("RESCUE " + orderCode)
                        .accountNumber("038299482910")
                        .reference("FT_FAIL_01")
                        .transactionDateTime((String) dataMap.get("transactionDateTime"))
                        .currency("VND")
                        .paymentLinkId("plink_" + orderCode)
                        .code("99")
                        .desc("Giao dịch lỗi/bị hủy")
                        .build())
                .signature(validSig)
                .build();

        mvc.perform(post("/api/v1/payments/payos/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(webhookPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("FAILED"));

        // Order vẫn giữ PAYMENT_PENDING và ví không đổi
        RescueOrder order = rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow();
        assertEquals(RescueOrderStatus.PAYMENT_PENDING, order.getStatus());

        Garage g = garageRepository.findById(garage.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("500000.00").compareTo(g.getWalletBalance()));
    }

    @Test
    @DisplayName("12. [Issue 4 Regression] Webhook có currency khác VND -> 400 Bad Request")
    void webhook_InvalidCurrency_BadRequest() throws Exception {
        String reqJson = """
                {
                  "rescueOrderId": %d
                }
                """.formatted(rescueOrder.getId());

        String res = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long orderCode = mapper.readTree(res).get("data").get("payosOrderCode").asLong();

        Map<String, Object> dataMap = new HashMap<>();
        dataMap.put("orderCode", orderCode);
        dataMap.put("amount", 250000L);
        dataMap.put("description", "RESCUE " + orderCode);
        dataMap.put("accountNumber", "038299482910");
        dataMap.put("reference", "FT_USD_01");
        dataMap.put("transactionDateTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        dataMap.put("currency", "USD");
        dataMap.put("paymentLinkId", "plink_" + orderCode);
        dataMap.put("code", "00");
        dataMap.put("desc", "Thành công");

        String validSig = payOSConfig.createWebhookDataSignature(dataMap);

        PayOSWebhookPayload webhookPayload = PayOSWebhookPayload.builder()
                .code("00")
                .desc("success")
                .success(true)
                .data(PayOSWebhookPayload.WebhookData.builder()
                        .orderCode(orderCode)
                        .amount(250000L)
                        .description("RESCUE " + orderCode)
                        .accountNumber("038299482910")
                        .reference("FT_USD_01")
                        .transactionDateTime((String) dataMap.get("transactionDateTime"))
                        .currency("USD")
                        .paymentLinkId("plink_" + orderCode)
                        .code("00")
                        .desc("Thành công")
                        .build())
                .signature(validSig)
                .build();

        mvc.perform(post("/api/v1/payments/payos/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(webhookPayload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("VND")));
    }

    @Test
    void successCannotBeDowngradedByLateFailure() throws Exception {
        String response = mvc.perform(post("/api/v1/payments/create")
                .header("Authorization", "Bearer " + customerToken).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("rescueOrderId", rescueOrder.getId()))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long code = mapper.readTree(response).path("data").path("payosOrderCode").asLong();
        var paid = buildValidWebhookPayload(code, 250000L);
        mvc.perform(post("/api/v1/payments/payos/webhook").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(paid))).andExpect(status().isOk());
        BigDecimal balance = garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance();
        var paidTx = paymentTransactionRepository.findByPayosOrderCode(code).orElseThrow();
        entityManager.flush();
        entityManager.refresh(paidTx);
        var paidAt = paidTx.getPaidAt();
        paid.getData().setCode("99");
        Map<String,Object> data = mapper.convertValue(paid.getData(), new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>() {});
        data.entrySet().removeIf(e -> e.getValue() == null);
        paid.setSignature(payOSConfig.createWebhookDataSignature(data));
        mvc.perform(post("/api/v1/payments/payos/webhook").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(paid))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));
        assertEquals(paidAt.truncatedTo(java.time.temporal.ChronoUnit.MICROS), paymentTransactionRepository.findByPayosOrderCode(code).orElseThrow().getPaidAt().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        assertEquals(balance, garageRepository.findById(garage.getId()).orElseThrow().getWalletBalance());
        assertEquals(RescueOrderStatus.COMPLETED, rescueOrderRepository.findById(rescueOrder.getId()).orElseThrow().getStatus());
    }

    private PayOSWebhookPayload buildValidWebhookPayload(long orderCode, long amount) {
        Map<String, Object> dataMap = new HashMap<>();
        dataMap.put("orderCode", orderCode);
        dataMap.put("amount", amount);
        dataMap.put("description", "RESCUE " + orderCode);
        dataMap.put("accountNumber", "038299482910");
        dataMap.put("reference", "FT_" + orderCode);
        dataMap.put("transactionDateTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        dataMap.put("currency", "VND");
        dataMap.put("paymentLinkId", "plink_" + orderCode);
        dataMap.put("code", "00");
        dataMap.put("desc", "Thành công");

        String validSig = payOSConfig.createWebhookDataSignature(dataMap);

        return PayOSWebhookPayload.builder()
                .code("00")
                .desc("success")
                .success(true)
                .data(PayOSWebhookPayload.WebhookData.builder()
                        .orderCode(orderCode)
                        .amount(amount)
                        .description("RESCUE " + orderCode)
                        .accountNumber("038299482910")
                        .reference("FT_" + orderCode)
                        .transactionDateTime((String) dataMap.get("transactionDateTime"))
                        .currency("VND")
                        .paymentLinkId("plink_" + orderCode)
                        .code("00")
                        .desc("Thành công")
                        .build())
                .signature(validSig)
                .build();
    }
}

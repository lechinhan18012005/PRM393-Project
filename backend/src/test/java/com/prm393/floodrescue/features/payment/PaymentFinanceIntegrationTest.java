package com.prm393.floodrescue.features.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PaymentFinanceIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private String adminToken;
    private String garageOwnerToken;
    private String customerToken;
    private Long garageId;

    @BeforeEach
    void setUp() {
        User admin = userRepository.save(User.builder()
                .username("admin_p2")
                .email("admin_p2@test.com")
                .phone("0922000001")
                .fullName("Admin Tài Chính P2")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.ADMIN)
                .active(true)
                .build());

        User owner = userRepository.save(User.builder()
                .username("owner_p2")
                .email("owner_p2@test.com")
                .phone("0922000002")
                .fullName("Chủ Gara Nam Sài Gòn")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.GARAGE_OWNER)
                .active(true)
                .build());

        User customer = userRepository.save(User.builder()
                .username("customer_p2")
                .email("customer_p2@test.com")
                .phone("0922000003")
                .fullName("Khách Hàng Cứu Hộ")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        Garage savedGarage = garageRepository.save(Garage.builder()
                .owner(owner)
                .garageName("Trung Tâm Cứu Hộ Nam Sài Gòn")
                .phone("0922000002")
                .status(GarageStatus.APPROVED)
                .walletBalance(BigDecimal.ZERO)
                .build());
        garageId = savedGarage.getId();

        adminToken = jwtService.generateToken(admin);
        garageOwnerToken = jwtService.generateToken(owner);
        customerToken = jwtService.generateToken(customer);
    }

    @Test
    @DisplayName("Tích hợp Giai đoạn 1 + 2: Cấu hình hoa hồng (UC-24) -> Tạo VietQR & Webhook PayOS (UC-18) -> Đối soát (UC-25) -> Cộng ví & Rút tiền Gara (UC-26)")
    void fullClosedLoopCashFlow_Phase1AndPhase2_Success() throws Exception {
        // BƯỚC 1 (UC-24 - Giai đoạn 1): Admin cấu hình tỷ lệ hoa hồng 10% cho dịch vụ chở xe đơn lẻ
        String commissionPayload = """
                {
                  "globalRate": 10.0,
                  "singleCrossingRate": 10.0,
                  "batchCrossingRate": 8.0,
                  "waterloggedRepairRate": 15.0,
                  "surgeHoursRate": 6.0,
                  "subsidyRate": 15.0,
                  "baseFee": 25000,
                  "perKmFee": 10000,
                  "versionCode": "v3.0"
                }
                """;

        mvc.perform(put("/api/v1/finance/commission")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(commissionPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.singleCrossingRate").value(10.0));

        // BƯỚC 2 (UC-18 - Giai đoạn 2): Khách tạo giao dịch thanh toán PayOS VietQR cho đơn cứu hộ 400.000 đ
        String createPaymentPayload = """
                {
                  "rescueOrderId": 88419,
                  "garageId": %d,
                  "rescueCode": "#RC-88419",
                  "orderType": "SINGLE_CROSSING",
                  "amount": 400000,
                  "paymentMethod": "PAYOS_VIETQR"
                }
                """.formatted(garageId);

        String createPaymentRes = mvc.perform(post("/api/v1/payments/create")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPaymentPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.commissionRate").value(10.0))
                .andExpect(jsonPath("$.data.platformFee").value(40000.00))
                .andExpect(jsonPath("$.data.netGarageAmount").value(360000.00))
                .andReturn().getResponse().getContentAsString();

        JsonNode paymentData = mapper.readTree(createPaymentRes).get("data");
        long payosOrderCode = paymentData.get("payosOrderCode").asLong();

        // BƯỚC 3 (UC-18 Bảo mật Webhook): Bắn Webhook sai chữ ký HMAC-SHA256 -> Bị từ chối 400 Bad Request
        String invalidWebhookPayload = """
                {
                  "code": "00",
                  "desc": "success",
                  "success": true,
                  "data": {
                    "orderCode": %d,
                    "amount": 400000,
                    "description": "RESCUE %d"
                  },
                  "signature": "0000000000000000000000000000000000000000000000000000000000000000"
                }
                """.formatted(payosOrderCode, payosOrderCode);

        mvc.perform(post("/api/v1/payments/payos/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidWebhookPayload))
                .andExpect(status().isBadRequest());

        // BƯỚC 4 (UC-18 Webhook PayOS hợp lệ): Xác thực chữ ký HMAC-SHA256, đổi trạng thái SUCCESS và cộng 360.000 đ vào ví Gara
        mvc.perform(post("/api/v1/payments/" + payosOrderCode + "/simulate-webhook")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.reconciled").value(true))
                .andExpect(jsonPath("$.data.checksumValid").value(true));

        // BƯỚC 5 (UC-25 - Giai đoạn 2): Admin kiểm tra danh sách giao dịch đối soát PayOS
        mvc.perform(get("/api/v1/finance/transactions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].payosOrderCode").value(payosOrderCode))
                .andExpect(jsonPath("$.data[0].amount").value(400000.00))
                .andExpect(jsonPath("$.data[0].platformFee").value(40000.00))
                .andExpect(jsonPath("$.data[0].netGarageAmount").value(360000.00));

        // BƯỚC 6 (UC-26 - Giai đoạn 1): Chủ Gara kiểm tra ví thấy đã có 360.000 đ từ cuốc xe vừa thanh toán và tạo lệnh rút 300.000 đ
        mvc.perform(get("/api/v1/garages/wallet")
                        .header("Authorization", "Bearer " + garageOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.walletBalance").value(360000.00))
                .andExpect(jsonPath("$.data.availableBalance").value(360000.00))
                .andExpect(jsonPath("$.data.recentTransactions.length()").value(1))
                .andExpect(jsonPath("$.data.recentTransactions[0].transactionType").value("ORDER_INCOME"));

        String payoutReqJson = """
                {
                  "requestedAmount": 300000,
                  "bankCode": "MB",
                  "bankName": "MB Bank",
                  "accountNumber": "038299482910",
                  "accountHolderName": "CHU GARA NAM SAI GON"
                }
                """;

        String payoutRes = mvc.perform(post("/api/v1/garages/wallet/payouts")
                        .header("Authorization", "Bearer " + garageOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payoutReqJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.availableBalance").value(60000.00))
                .andReturn().getResponse().getContentAsString();

        long payoutId = mapper.readTree(payoutRes).get("data").get("id").asLong();

        // BƯỚC 7 (UC-26 - Giai đoạn 1): Admin giải ngân lệnh rút 300.000 đ -> Ví Gara còn đúng 60.000 đ và có đủ 2 dòng lịch sử ví
        String transferPayoutJson = """
                {
                  "status": "TRANSFERRED",
                  "transactionReference": "TXN-NAPAS-300K",
                  "adminNote": "Đã giải ngân doanh thu cứu hộ"
                }
                """;

        mvc.perform(patch("/api/v1/finance/payouts/" + payoutId + "/process")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(transferPayoutJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("TRANSFERRED"))
                .andExpect(jsonPath("$.data.walletBalance").value(60000.00));

        mvc.perform(get("/api/v1/garages/wallet")
                        .header("Authorization", "Bearer " + garageOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.walletBalance").value(60000.00))
                .andExpect(jsonPath("$.data.totalWithdrawnAmount").value(300000.00))
                .andExpect(jsonPath("$.data.recentTransactions.length()").value(2));
    }
}

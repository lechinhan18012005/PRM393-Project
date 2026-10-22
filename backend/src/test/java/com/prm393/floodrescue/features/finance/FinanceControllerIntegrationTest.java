package com.prm393.floodrescue.features.finance;

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
class FinanceControllerIntegrationTest {

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

    @BeforeEach
    void setUp() {
        User admin = userRepository.save(User.builder()
                .username("fin_admin_test")
                .email("fin_admin@test.com")
                .phone("0911000001")
                .fullName("Admin Tài Chính")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.ADMIN)
                .active(true)
                .build());

        User owner = userRepository.save(User.builder()
                .username("garage_owner_test")
                .email("garage_owner@test.com")
                .phone("0911000002")
                .fullName("Chủ Gara Test")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.GARAGE_OWNER)
                .active(true)
                .build());

        User customer = userRepository.save(User.builder()
                .username("customer_test")
                .email("customer@test.com")
                .phone("0911000003")
                .fullName("Khách Hàng Test")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        garageRepository.save(Garage.builder()
                .owner(owner)
                .garageName("Gara Cứu Hộ Thủ Đức")
                .phone("0911000002")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("15000000.00"))
                .build());

        adminToken = jwtService.generateToken(admin);
        garageOwnerToken = jwtService.generateToken(owner);
        customerToken = jwtService.generateToken(customer);
    }

    @Test
    @DisplayName("UC-24: Admin lấy và cập nhật cấu hình hoa hồng thành công; Customer bị chặn 403")
    void commissionConfig_AdminCanUpdateAndCustomerForbidden() throws Exception {
        // Customer không được phép truy cập cấu hình tài chính của Admin
        mvc.perform(get("/api/v1/finance/commission")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());

        // Admin lấy cấu hình mặc định
        mvc.perform(get("/api/v1/finance/commission")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.globalRate").value(12.5));

        // Admin cập nhật cấu hình hoa hồng mới
        String updatePayload = """
                {
                  "globalRate": 11.5,
                  "singleCrossingRate": 11.5,
                  "batchCrossingRate": 9.0,
                  "waterloggedRepairRate": 14.0,
                  "surgeHoursRate": 7.5,
                  "subsidyRate": 18.0,
                  "baseFee": 30000,
                  "perKmFee": 12000,
                  "versionCode": "v2.5",
                  "changeSummary": "Giảm hoa hồng hỗ trợ đợt triều cường tháng 10",
                  "approvalReason": "Quyết định của Admin Tài chính"
                }
                """;

        mvc.perform(put("/api/v1/finance/commission")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.globalRate").value(11.5))
                .andExpect(jsonPath("$.data.versionCode").value("v2.5"));

        // Kiểm tra lịch sử thay đổi có 2 bản ghi (1 bản ghi mới active, 1 bản ghi cũ lưu trữ)
        mvc.perform(get("/api/v1/finance/commission/history")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("UC-26: Luồng khép kín Chủ Gara yêu cầu rút tiền -> Admin duyệt lệnh -> Admin xác nhận giải ngân và trừ ví")
    void payoutWorkflow_EndToEndSuccess() throws Exception {
        // 1. Chủ gara kiểm tra số dư ví ban đầu (15.000.000 đ)
        mvc.perform(get("/api/v1/garages/wallet")
                        .header("Authorization", "Bearer " + garageOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.walletBalance").value(15000000.00))
                .andExpect(jsonPath("$.data.availableBalance").value(15000000.00));

        // 2. Chủ gara tạo lệnh rút 5.000.000 đ
        String createPayoutJson = """
                {
                  "requestedAmount": 5000000,
                  "bankCode": "VCB",
                  "bankName": "Vietcombank",
                  "accountNumber": "0071000892831",
                  "accountHolderName": "CHU GARA TEST"
                }
                """;

        String createRes = mvc.perform(post("/api/v1/garages/wallet/payouts")
                        .header("Authorization", "Bearer " + garageOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayoutJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.requestedAmount").value(5000000))
                .andExpect(jsonPath("$.data.availableBalance").value(10000000.00))
                .andReturn().getResponse().getContentAsString();

        JsonNode payoutNode = mapper.readTree(createRes).get("data");
        long payoutId = payoutNode.get("id").asLong();

        // 3. Admin phê duyệt lệnh rút (APPROVED - chưa trừ walletBalance)
        String approveJson = """
                {
                  "status": "APPROVED",
                  "adminNote": "Hồ sơ hợp lệ, chờ kế toán chuyển khoản"
                }
                """;

        mvc.perform(patch("/api/v1/finance/payouts/" + payoutId + "/process")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(approveJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.walletBalance").value(15000000.00));

        // 4. Admin xác nhận đã chuyển tiền thành công (TRANSFERRED -> trừ walletBalance còn 10.000.000 đ)
        String transferJson = """
                {
                  "status": "TRANSFERRED",
                  "transactionReference": "TXN-NAPAS-20261019",
                  "adminNote": "Đã giải ngân qua cổng Napas247"
                }
                """;

        mvc.perform(patch("/api/v1/finance/payouts/" + payoutId + "/process")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(transferJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("TRANSFERRED"))
                .andExpect(jsonPath("$.data.transactionReference").value("TXN-NAPAS-20261019"))
                .andExpect(jsonPath("$.data.walletBalance").value(10000000.00));

        // 5. Chủ gara xem lại ví: số dư ví còn 10.000.000 đ và có bản ghi lịch sử giao dịch ví
        mvc.perform(get("/api/v1/garages/wallet")
                        .header("Authorization", "Bearer " + garageOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.walletBalance").value(10000000.00))
                .andExpect(jsonPath("$.data.totalWithdrawnAmount").value(5000000.00))
                .andExpect(jsonPath("$.data.recentTransactions.length()").value(1))
                .andExpect(jsonPath("$.data.recentTransactions[0].transactionType").value("PAYOUT_WITHDRAW"));
    }
}

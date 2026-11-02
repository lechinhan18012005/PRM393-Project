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
import com.prm393.floodrescue.features.payment.entity.PaymentMethod;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DisputeRefundIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private String customerToken;
    private String staffToken;
    private String adminToken;
    private String garageOwnerToken;
    private Long rescueOrderId;
    private PaymentTransaction paidTx;
    private Garage garage;

    @BeforeEach
    void setUp() {
        User customer = userRepository.save(User.builder()
                .username("dispute_customer")
                .email("dispute_customer@test.com")
                .phone("0933000111")
                .fullName("Phạm Văn Hùng")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        User staff = userRepository.save(User.builder()
                .username("dispute_staff")
                .email("dispute_staff@test.com")
                .phone("0933000222")
                .fullName("Chuyên Viên CSKH")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.STAFF)
                .active(true)
                .build());

        User admin = userRepository.save(User.builder()
                .username("dispute_admin")
                .email("dispute_admin@test.com")
                .phone("0933000333")
                .fullName("Admin Thẩm Định")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.ADMIN)
                .active(true)
                .build());

        User garageOwner = userRepository.save(User.builder()
                .username("dispute_garage_owner")
                .email("dispute_garage@test.com")
                .phone("0933000444")
                .fullName("Chủ Gara Nam Sài Gòn")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.GARAGE_OWNER)
                .active(true)
                .build());

        garage = garageRepository.save(Garage.builder()
                .owner(garageOwner)
                .garageName("Cứu Hộ Nhanh Sài Gòn")
                .phone("0933000444")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("10000000.00"))
                .build());

        rescueOrderId = 8790L;

        paidTx = paymentTransactionRepository.save(PaymentTransaction.builder()
                .rescueOrderId(rescueOrderId)
                .rescueCode("#RC-8790")
                .payosOrderCode(2604168790L)
                .customer(customer)
                .garage(garage)
                .amount(new BigDecimal("2100000.00"))
                .commissionRate(new BigDecimal("12.50"))
                .platformFee(new BigDecimal("262500.00"))
                .netGarageAmount(new BigDecimal("1837500.00"))
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .status(PaymentStatus.SUCCESS)
                .reconciled(true)
                .paidAt(LocalDateTime.now())
                .build());

        customerToken = jwtService.generateToken(customer);
        staffToken = jwtService.generateToken(staff);
        adminToken = jwtService.generateToken(admin);
        garageOwnerToken = jwtService.generateToken(garageOwner);
    }

    @Test
    @DisplayName("Luồng 6 (UC-23 & UC-27): Khách gửi khiếu nại -> Staff xác minh & đề xuất -> Admin phê duyệt hoàn tiền & trừ ví Gara")
    void fullDisputeAndRefundWorkflow_EndToEndSuccess() throws Exception {
        // 1. Customer gửi khiếu nại cho đơn đã hoàn tất & thanh toán
        String createDisputeJson = """
                {
                  "rescueOrderId": %d,
                  "paymentTransactionId": %d,
                  "disputeType": "OVERCHARGE",
                  "requestedRefundAmount": 600000,
                  "customerReason": "Tài xế tự ý thu thêm 600.000đ tiền cáp kéo ngoài báo giá trên ứng dụng",
                  "evidenceImageUrls": "https://img.example.com/receipt_8790.jpg"
                }
                """.formatted(rescueOrderId, paidTx.getId());

        String createRes = mvc.perform(post("/api/v1/disputes")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDisputeJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("STAFF_REVIEW"))
                .andExpect(jsonPath("$.data.originalAmount").value(2100000.00))
                .andExpect(jsonPath("$.data.requestedRefundAmount").value(600000))
                .andReturn().getResponse().getContentAsString();

        JsonNode disputeNode = mapper.readTree(createRes).get("data");
        long disputeId = disputeNode.get("id").asLong();

        // 2. Staff truy cập danh sách khiếu nại và lập biên bản đề xuất Admin hoàn tiền (UC-23)
        mvc.perform(get("/api/v1/staff/disputes")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));

        String staffReviewJson = """
                {
                  "decision": "ADMIN_APPROVAL",
                  "proposedRefundAmount": 600000,
                  "staffFindingNote": "Đã kiểm tra biên lai viết tay của khách và gọi xác minh Gara. Xác nhận Gara thu vượt 600.000đ, đề xuất Admin duyệt hoàn."
                }
                """;

        mvc.perform(patch("/api/v1/staff/disputes/" + disputeId + "/review")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(staffReviewJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ADMIN_APPROVAL"))
                .andExpect(jsonPath("$.data.proposedRefundAmount").value(600000))
                .andExpect(jsonPath("$.data.staffReviewerName").value("Chuyên Viên CSKH"));

        // 3. Kiểm tra phân quyền: Staff KHÔNG ĐƯỢC PHÉP gọi endpoint duyệt hoàn tiền của Admin (403 Forbidden)
        String adminApproveJson = """
                {
                  "decision": "REFUNDED",
                  "approvedRefundAmount": 600000,
                  "refundSource": "GARAGE_WALLET",
                  "refundReferenceCode": "PAYOS-REV-8790",
                  "adminResolutionNote": "Phê duyệt hoàn tiền 600.000đ cho khách hàng, khấu trừ trực tiếp từ ví Gara."
                }
                """;

        mvc.perform(patch("/api/v1/finance/refunds/" + disputeId + "/process")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(adminApproveJson))
                .andExpect(status().isForbidden());

        // 4. Admin phê duyệt & thực thi hoàn tiền (UC-27)
        mvc.perform(patch("/api/v1/finance/refunds/" + disputeId + "/process")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(adminApproveJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUNDED"))
                .andExpect(jsonPath("$.data.approvedRefundAmount").value(600000))
                .andExpect(jsonPath("$.data.refundReferenceCode").value("PAYOS-REV-8790"))
                .andExpect(jsonPath("$.data.garageWalletBalance").value(9400000.00));

        // 5. Kiểm tra số dư ví Gara giảm từ 10.000.000 xuống 9.400.000 và có bút toán DISPUTE_REFUND_DEDUCT
        mvc.perform(get("/api/v1/garages/wallet")
                        .header("Authorization", "Bearer " + garageOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.walletBalance").value(9400000.00))
                .andExpect(jsonPath("$.data.recentTransactions.length()").value(1))
                .andExpect(jsonPath("$.data.recentTransactions[0].transactionType").value("DISPUTE_REFUND_DEDUCT"))
                .andExpect(jsonPath("$.data.recentTransactions[0].amount").value(-600000.00));

        // 6. Kiểm tra trạng thái giao dịch gốc chuyển sang REFUNDED
        PaymentTransaction updatedTx = paymentTransactionRepository.findById(paidTx.getId()).orElseThrow();
        assertEquals(PaymentStatus.REFUNDED, updatedTx.getStatus());
    }
}

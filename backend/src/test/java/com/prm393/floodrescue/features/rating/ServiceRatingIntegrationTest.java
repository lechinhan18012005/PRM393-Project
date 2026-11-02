package com.prm393.floodrescue.features.rating;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ServiceRatingIntegrationTest {

    @Autowired
    private MockMvc mvc;

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
    private Garage garage;
    private Long rescueOrderId;

    @BeforeEach
    void setUp() {
        User customer = userRepository.save(User.builder()
                .username("rating_customer")
                .email("rating_customer@test.com")
                .phone("0944000111")
                .fullName("Võ Minh Khôi")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        User staff = userRepository.save(User.builder()
                .username("rating_staff")
                .email("rating_staff@test.com")
                .phone("0944000222")
                .fullName("Nhân Viên Giám Sát SLA")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.STAFF)
                .active(true)
                .build());

        User garageOwner = userRepository.save(User.builder()
                .username("rating_garage_owner")
                .email("rating_garage@test.com")
                .phone("0944000333")
                .fullName("Chủ Gara Minh Phát")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.GARAGE_OWNER)
                .active(true)
                .build());

        garage = garageRepository.save(Garage.builder()
                .owner(garageOwner)
                .garageName("Gara Cứu Hộ Minh Phát")
                .phone("0944000333")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("5000000.00"))
                .build());

        rescueOrderId = 8821L;

        paymentTransactionRepository.save(PaymentTransaction.builder()
                .rescueOrderId(rescueOrderId)
                .rescueCode("#RC-8821")
                .payosOrderCode(2604168821L)
                .customer(customer)
                .garage(garage)
                .amount(new BigDecimal("450000.00"))
                .commissionRate(new BigDecimal("15.00"))
                .platformFee(new BigDecimal("67500.00"))
                .netGarageAmount(new BigDecimal("382500.00"))
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .status(PaymentStatus.SUCCESS)
                .reconciled(true)
                .paidAt(LocalDateTime.now())
                .build());

        customerToken = jwtService.generateToken(customer);
        staffToken = jwtService.generateToken(staff);
    }

    @Test
    @DisplayName("Luồng 9 (UC-19): Khách gửi đánh giá 5 sao sau dịch vụ -> Chặn gửi trùng -> Tra cứu theo đơn, theo Garage & bảng SLA")
    void fullServiceRatingWorkflow_EndToEndSuccess() throws Exception {
        // 1. Customer gửi đánh giá 5 sao cho đơn cứu hộ #8821 đã thanh toán
        String createRatingJson = """
                {
                  "rescueOrderId": %d,
                  "stars": 5,
                  "tags": "Đến nhanh < 15p,Nhiệt tình lội nước,Đúng giá niêm yết",
                  "comment": "Anh thợ hỗ trợ rất nhiệt tình giữa đêm mưa ngập, giá minh bạch đúng trên app!"
                }
                """.formatted(rescueOrderId);

        mvc.perform(post("/api/v1/ratings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRatingJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rescueOrderId").value(rescueOrderId))
                .andExpect(jsonPath("$.data.stars").value(5))
                .andExpect(jsonPath("$.data.garageName").value("Gara Cứu Hộ Minh Phát"))
                .andExpect(jsonPath("$.data.customerName").value("Võ Minh Khôi"));

        // 2. Gửi đánh giá lần 2 cho cùng đơn #8821 bị chặn (400 Bad Request)
        mvc.perform(post("/api/v1/ratings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRatingJson))
                .andExpect(status().isBadRequest());

        // 3. Xem đánh giá theo mã đơn cứu hộ (GET /api/v1/ratings/order/{rescueOrderId})
        mvc.perform(get("/api/v1/ratings/order/" + rescueOrderId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stars").value(5))
                .andExpect(jsonPath("$.data.tags").value("Đến nhanh < 15p,Nhiệt tình lội nước,Đúng giá niêm yết"));

        // 4. Xem lịch sử đánh giá của tôi (GET /api/v1/ratings/my)
        mvc.perform(get("/api/v1/ratings/my")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));

        // 5. Xem danh sách đánh giá công khai của Garage (GET /api/v1/ratings/garage/{garageId})
        mvc.perform(get("/api/v1/ratings/garage/" + garage.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].stars").value(5));

        // 6. Staff xem toàn bộ đánh giá trên bảng giám sát SLA (GET /api/v1/ratings)
        mvc.perform(get("/api/v1/ratings")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].rescueCode").value("#RC-8821"));
    }
}

package com.prm393.floodrescue.features.floodmap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.floodmap.repository.FloodReportRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FloodReportIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FloodReportRepository floodReportRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private String customer1Token;
    private String customer2Token;
    private String customer3Token;
    private String staffToken;

    @BeforeEach
    void setUp() {
        floodReportRepository.deleteAll();

        User c1 = userRepository.save(User.builder()
                .username("flood_cust_1")
                .email("flood_cust_1@test.com")
                .phone("0944000111")
                .fullName("Người Dân Quận 8 #1")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        User c2 = userRepository.save(User.builder()
                .username("flood_cust_2")
                .email("flood_cust_2@test.com")
                .phone("0944000222")
                .fullName("Người Dân Quận 8 #2")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        User c3 = userRepository.save(User.builder()
                .username("flood_cust_3")
                .email("flood_cust_3@test.com")
                .phone("0944000333")
                .fullName("Người Dân Quận 8 #3")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.CUSTOMER)
                .active(true)
                .build());

        User staff = userRepository.save(User.builder()
                .username("flood_staff_gis")
                .email("flood_staff@test.com")
                .phone("0944000999")
                .fullName("Điều Phối Viên Bản Đồ GIS")
                .password(passwordEncoder.encode("Password@123"))
                .role(Role.STAFF)
                .active(true)
                .build());

        customer1Token = jwtService.generateToken(c1);
        customer2Token = jwtService.generateToken(c2);
        customer3Token = jwtService.generateToken(c3);
        staffToken = jwtService.generateToken(staff);
    }

    @Test
    @DisplayName("Luồng 8 (UC-20, UC-21, UC-22): Gửi báo cáo cộng đồng -> Gom cụm tự động (>=3 tin trong 150m) -> Hiển thị bản đồ Public -> Staff duyệt & hạ cảnh báo khi nước rút")
    void fullCommunityFloodMapWorkflow_EndToEndSuccess() throws Exception {
        // 1. Người dân #1 gửi báo cáo ngập tại Bến Bình Đông -> Trạng thái PENDING (chưa lên bản đồ public)
        String report1Json = """
                {
                  "latitude": 10.74210,
                  "longitude": 106.70210,
                  "address": "Số 302 Bến Bình Đông, P.15, Quận 8",
                  "waterDepthLevel": "SEAT_60CM_PLUS",
                  "description": "Nước ngập lút yên xe tại dốc cầu Chà Và",
                  "imageUrls": "https://img.example.com/ben_binh_dong_1.jpg"
                }
                """;

        String res1 = mvc.perform(post("/api/v1/flood-reports")
                        .header("Authorization", "Bearer " + customer1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(report1Json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.moderationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.clusterCount").value(1))
                .andExpect(jsonPath("$.data.confidenceScore").value(2))
                .andReturn().getResponse().getContentAsString();

        long report1Id = mapper.readTree(res1).get("data").get("id").asLong();

        // Bản đồ Public lúc này chưa hiển thị điểm PENDING
        mvc.perform(get("/api/v1/flood-reports/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        // 2. Người dân #2 gửi báo cáo cách đó ~30m -> Vẫn PENDING (clusterCount = 2, confidenceScore = 4)
        String report2Json = """
                {
                  "latitude": 10.74225,
                  "longitude": 106.70220,
                  "address": "Số 310 Bến Bình Đông, P.15, Quận 8",
                  "waterDepthLevel": "SEAT_60CM_PLUS",
                  "description": "Nhiều xe chết máy hàng loạt",
                  "imageUrls": "https://img.example.com/ben_binh_dong_2.jpg"
                }
                """;

        mvc.perform(post("/api/v1/flood-reports")
                        .header("Authorization", "Bearer " + customer2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(report2Json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.moderationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.clusterCount").value(2))
                .andExpect(jsonPath("$.data.confidenceScore").value(4));

        // 3. Người dân #3 gửi báo cáo thứ 3 trong bán kính 150m -> Tự động kích hoạt cụm ngập APPROVED (clusterCount = 3, confidenceScore = 5)
        String report3Json = """
                {
                  "latitude": 10.74240,
                  "longitude": 106.70235,
                  "address": "Bến Bình Đông giao Ngô Sĩ Liên, Quận 8",
                  "waterDepthLevel": "SEAT_60CM_PLUS",
                  "description": "Ngập sâu >60cm, không thể di chuyển",
                  "imageUrls": "https://img.example.com/ben_binh_dong_3.jpg"
                }
                """;

        mvc.perform(post("/api/v1/flood-reports")
                        .header("Authorization", "Bearer " + customer3Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(report3Json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.moderationStatus").value("APPROVED"))
                .andExpect(jsonPath("$.data.clusterCount").value(3))
                .andExpect(jsonPath("$.data.confidenceScore").value(5));

        // 4. Bản đồ Public (GET /api/v1/flood-reports/active) không cần token vẫn lấy được cả 3 điểm trong cụm vừa được tự động APPROVED
        mvc.perform(get("/api/v1/flood-reports/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].moderationStatus").value("APPROVED"));

        // 5. Người dân #1 gửi thêm 1 báo cáo đơn lẻ ở Quận 7 (cách xa > 3km) -> PENDING chờ Staff duyệt
        String reportQ7Json = """
                {
                  "latitude": 10.75250,
                  "longitude": 106.72500,
                  "address": "Số 148 Trần Xuân Soạn, Quận 7",
                  "waterDepthLevel": "HALF_WHEEL_40CM",
                  "description": "Nước triều cường lên nửa bánh xe"
                }
                """;

        String resQ7 = mvc.perform(post("/api/v1/flood-reports")
                        .header("Authorization", "Bearer " + customer1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportQ7Json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.moderationStatus").value("PENDING"))
                .andReturn().getResponse().getContentAsString();

        long reportQ7Id = mapper.readTree(resQ7).get("data").get("id").asLong();

        // 6. Kiểm tra danh sách báo cáo của Người dân #1 (GET /api/v1/flood-reports/my)
        mvc.perform(get("/api/v1/flood-reports/my")
                        .header("Authorization", "Bearer " + customer1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));

        // 7. Kiểm tra phân quyền: CUSTOMER không được phép gọi API kiểm duyệt của STAFF (403 Forbidden)
        mvc.perform(get("/api/v1/staff/flood-reports")
                        .header("Authorization", "Bearer " + customer1Token))
                .andExpect(status().isForbidden());

        // 8. Staff xem toàn bộ 4 báo cáo và duyệt báo cáo ở Quận 7 (PENDING -> APPROVED)
        mvc.perform(get("/api/v1/staff/flood-reports")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(4));

        String moderateApproveJson = """
                {
                  "status": "APPROVED",
                  "moderatorNote": "Đã kiểm tra camera Trần Xuân Soạn, xác nhận ngập 40cm",
                  "nearbyStations": "Trạm cứu hộ Nam Sài Gòn đang túc trực cách 500m"
                }
                """;

        mvc.perform(patch("/api/v1/staff/flood-reports/" + reportQ7Id + "/moderate")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(moderateApproveJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.moderationStatus").value("APPROVED"))
                .andExpect(jsonPath("$.data.moderatedByName").value("Điều Phối Viên Bản Đồ GIS"));

        // 9. Staff xác nhận nước đã rút cho điểm ngập #1 (APPROVED -> EXPIRED)
        mvc.perform(patch("/api/v1/staff/flood-reports/" + report1Id + "/resolve")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.moderationStatus").value("EXPIRED"));
    }
}

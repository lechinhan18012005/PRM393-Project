package com.prm393.floodrescue.features.floodmap;

import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.floodmap.dto.CreateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.dto.FloodReportResponse;
import com.prm393.floodrescue.features.floodmap.dto.ModerateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.entity.DepthLevel;
import com.prm393.floodrescue.features.floodmap.entity.FloodReportPoint;
import com.prm393.floodrescue.features.floodmap.entity.FloodStatus;
import com.prm393.floodrescue.features.floodmap.repository.FloodReportRepository;
import com.prm393.floodrescue.features.floodmap.service.FloodReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FloodReportServiceTest {

    @Mock
    private FloodReportRepository floodReportRepository;

    @InjectMocks
    private FloodReportService floodReportService;

    private User customer1;
    private User customer2;
    private User customer3;
    private User staff;

    @BeforeEach
    void setUp() {
        customer1 = User.builder()
                .id(101L)
                .username("customer_q8_1")
                .fullName("Lê Hoàng Nam")
                .role(Role.CUSTOMER)
                .build();

        customer2 = User.builder()
                .id(102L)
                .username("customer_q8_2")
                .fullName("Trần Minh Tâm")
                .role(Role.CUSTOMER)
                .build();

        customer3 = User.builder()
                .id(103L)
                .username("customer_q8_3")
                .fullName("Nguyễn Thu Hà")
                .role(Role.CUSTOMER)
                .build();

        staff = User.builder()
                .id(201L)
                .username("staff_gis")
                .fullName("Điều Phối Viên GIS")
                .role(Role.STAFF)
                .build();
    }

    @Test
    @DisplayName("UC-20: Tin báo điểm ngập đầu tiên ở khu vực mới -> Trạng thái PENDING, clusterCount = 1, confidenceScore = 2")
    void createReport_SingleReport_StartsAsPending() {
        when(floodReportRepository.findAll()).thenReturn(List.of());
        when(floodReportRepository.save(any(FloodReportPoint.class))).thenAnswer(inv -> {
            FloodReportPoint p = inv.getArgument(0);
            p.setId(401L);
            p.setCreatedAt(LocalDateTime.now());
            return p;
        });

        CreateFloodReportRequest req = CreateFloodReportRequest.builder()
                .latitude(10.7420)
                .longitude(106.7020)
                .address("Số 148 Trần Xuân Soạn, P. Tân Hưng, Q.7")
                .waterDepthLevel(DepthLevel.HALF_WHEEL_40CM)
                .description("Triều cường dâng nhanh qua nửa bánh xe")
                .imageUrls("https://img.example.com/flood_q7_1.jpg")
                .build();

        FloodReportResponse res = floodReportService.createReport(customer1, req);

        assertNotNull(res);
        assertEquals(401L, res.getId());
        assertEquals(FloodStatus.PENDING, res.getModerationStatus());
        assertEquals(1, res.getClusterCount());
        assertEquals(2, res.getConfidenceScore());
        assertEquals(DepthLevel.HALF_WHEEL_40CM, res.getWaterDepthLevel());
    }

    @Test
    @DisplayName("UC-20 (Spatial Clustering): Tin báo thứ 3 trong bán kính <= 150m trong 60 phút -> Tự động APPROVED, clusterCount = 3, confidenceScore = 5 và nâng cấp các điểm PENDING cùng cụm")
    void createReport_ThirdNearbyReportWithin150m_AutoApprovesCluster() {
        FloodReportPoint point1 = FloodReportPoint.builder()
                .id(401L)
                .reportedBy(customer1)
                .latitude(10.74200)
                .longitude(106.70200)
                .address("Bến Bình Đông, P.13, Q.8")
                .waterDepthLevel(DepthLevel.SEAT_60CM_PLUS)
                .confidenceScore(2)
                .clusterCount(1)
                .moderationStatus(FloodStatus.PENDING)
                .createdAt(LocalDateTime.now().minusMinutes(15))
                .build();

        FloodReportPoint point2 = FloodReportPoint.builder()
                .id(402L)
                .reportedBy(customer2)
                .latitude(10.74230) // Cách ~35m
                .longitude(106.70220)
                .address("Bến Bình Đông (Chân cầu Chà Và), Q.8")
                .waterDepthLevel(DepthLevel.SEAT_60CM_PLUS)
                .confidenceScore(4)
                .clusterCount(2)
                .moderationStatus(FloodStatus.PENDING)
                .createdAt(LocalDateTime.now().minusMinutes(8))
                .build();

        // Một điểm cách xa > 2km không được tính vào cụm
        FloodReportPoint farPoint = FloodReportPoint.builder()
                .id(403L)
                .reportedBy(customer1)
                .latitude(10.79000)
                .longitude(106.72000)
                .address("Nguyễn Hữu Cảnh, Q. Bình Thạnh")
                .waterDepthLevel(DepthLevel.HALF_WHEEL_40CM)
                .moderationStatus(FloodStatus.APPROVED)
                .createdAt(LocalDateTime.now().minusMinutes(10))
                .build();

        when(floodReportRepository.findAll()).thenReturn(List.of(point1, point2, farPoint));
        when(floodReportRepository.save(any(FloodReportPoint.class))).thenAnswer(inv -> {
            FloodReportPoint p = inv.getArgument(0);
            if (p.getId() == null) {
                p.setId(404L);
                p.setCreatedAt(LocalDateTime.now());
            }
            return p;
        });

        CreateFloodReportRequest req3 = CreateFloodReportRequest.builder()
                .latitude(10.74250) // Cách point1 ~60m (<= 150m)
                .longitude(106.70230)
                .address("Số 310 Bến Bình Đông, Q.8")
                .waterDepthLevel(DepthLevel.SEAT_60CM_PLUS)
                .description("Ngập lút yên xe, hơn 10 xe chết máy")
                .imageUrls("https://img.example.com/flood_q8_3.jpg")
                .build();

        FloodReportResponse res = floodReportService.createReport(customer3, req3);

        assertEquals(FloodStatus.APPROVED, res.getModerationStatus());
        assertEquals(3, res.getClusterCount());
        assertEquals(5, res.getConfidenceScore());

        // Cả 2 điểm PENDING trước đó trong cụm 150m cũng được nâng cấp lên APPROVED & clusterCount = 3
        assertEquals(FloodStatus.APPROVED, point1.getModerationStatus());
        assertEquals(3, point1.getClusterCount());
        assertEquals(5, point1.getConfidenceScore());
        assertEquals(FloodStatus.APPROVED, point2.getModerationStatus());
        assertEquals(3, point2.getClusterCount());
        assertEquals(5, point2.getConfidenceScore());
    }

    @Test
    @DisplayName("UC-21: Staff thẩm định và duyệt điểm ngập (PENDING -> APPROVED) kèm ghi chú điều phối")
    void moderateReport_StaffApprovesReport_Success() {
        FloodReportPoint pendingPoint = FloodReportPoint.builder()
                .id(410L)
                .reportedBy(customer1)
                .latitude(10.7510)
                .longitude(106.6620)
                .address("Đường Mễ Cốc, P.15, Q.8")
                .waterDepthLevel(DepthLevel.HALF_WHEEL_40CM)
                .moderationStatus(FloodStatus.PENDING)
                .build();

        when(floodReportRepository.findById(410L)).thenReturn(Optional.of(pendingPoint));
        when(floodReportRepository.save(any(FloodReportPoint.class))).thenAnswer(inv -> inv.getArgument(0));

        ModerateFloodReportRequest modReq = ModerateFloodReportRequest.builder()
                .status(FloodStatus.APPROVED)
                .moderatorNote("Đã xác minh qua camera giao thông Q.8, phát cảnh báo bán kính 1km")
                .nearbyStations("Chốt ứng cứu Gara Phúc Sang & Gara Minh Quân cách 600m")
                .build();

        FloodReportResponse res = floodReportService.moderateReport(staff, 410L, modReq);

        assertEquals(FloodStatus.APPROVED, res.getModerationStatus());
        assertEquals("Điều Phối Viên GIS", res.getModeratedByName());
        assertEquals("Đã xác minh qua camera giao thông Q.8, phát cảnh báo bán kính 1km", res.getModeratorNote());
        assertEquals("Chốt ứng cứu Gara Phúc Sang & Gara Minh Quân cách 600m", res.getNearbyStations());
    }

    @Test
    @DisplayName("UC-21: Staff xác nhận nước đã rút -> Chuyển điểm ngập sang EXPIRED")
    void resolveWaterReceded_SetsStatusToExpired() {
        FloodReportPoint activePoint = FloodReportPoint.builder()
                .id(411L)
                .reportedBy(customer1)
                .latitude(10.7510)
                .longitude(106.6620)
                .address("Nguyễn Hữu Cảnh, Q. Bình Thạnh")
                .waterDepthLevel(DepthLevel.HALF_WHEEL_40CM)
                .moderationStatus(FloodStatus.APPROVED)
                .build();

        when(floodReportRepository.findById(411L)).thenReturn(Optional.of(activePoint));
        when(floodReportRepository.save(any(FloodReportPoint.class))).thenAnswer(inv -> inv.getArgument(0));

        FloodReportResponse res = floodReportService.resolveWaterReceded(staff, 411L);

        assertEquals(FloodStatus.EXPIRED, res.getModerationStatus());
        assertEquals("Điều Phối Viên GIS", res.getModeratedByName());
        assertTrue(res.getModeratorNote().contains("nước rút hoàn toàn"));
    }

    @Test
    @DisplayName("UC-21: Báo lỗi ResourceNotFoundException khi kiểm duyệt điểm ngập không tồn tại")
    void moderateReport_NotFound_ThrowsException() {
        when(floodReportRepository.findById(9999L)).thenReturn(Optional.empty());

        ModerateFloodReportRequest req = ModerateFloodReportRequest.builder()
                .status(FloodStatus.APPROVED)
                .build();

        assertThrows(ResourceNotFoundException.class,
                () -> floodReportService.moderateReport(staff, 9999L, req));
    }
}

package com.prm393.floodrescue.features.floodmap;

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

    private User sampleCustomer;
    private User sampleStaff;

    @BeforeEach
    void setUp() {
        sampleCustomer = User.builder()
                .id(5L)
                .username("hoang_khach")
                .fullName("Hoàng Văn Khách")
                .role(Role.CUSTOMER)
                .build();

        sampleStaff = User.builder()
                .id(2L)
                .username("staff_user")
                .fullName("Trần Điều Hành")
                .role(Role.STAFF)
                .build();
    }

    @Test
    @DisplayName("UC-20: Tạo báo cáo điểm ngập mới")
    void createReport_Success() {
        CreateFloodReportRequest request = CreateFloodReportRequest.builder()
                .latitude(10.7423)
                .longitude(106.7021)
                .address("148 Trần Xuân Soạn, Q7")
                .waterDepthLevel(DepthLevel.HALF_WHEEL_40CM)
                .description("Nước dâng nhanh qua nửa bánh xe")
                .build();

        when(floodReportRepository.findAll()).thenReturn(List.of());
        when(floodReportRepository.save(any(FloodReportPoint.class))).thenAnswer(invocation -> {
            FloodReportPoint p = invocation.getArgument(0);
            p.setId(100L);
            p.setCreatedAt(LocalDateTime.now());
            return p;
        });

        FloodReportResponse response = floodReportService.createReport(sampleCustomer, request);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals("148 Trần Xuân Soạn, Q7", response.getAddress());
        assertEquals(DepthLevel.HALF_WHEEL_40CM, response.getWaterDepthLevel());
        assertEquals(FloodStatus.PENDING, response.getModerationStatus());
        assertEquals(1, response.getClusterCount());
    }

    @Test
    @DisplayName("UC-21: Staff kiểm duyệt và kích hoạt điểm ngập lên bản đồ")
    void moderateReport_Approve() {
        FloodReportPoint point = FloodReportPoint.builder()
                .id(101L)
                .reportedBy(sampleCustomer)
                .latitude(10.7423)
                .longitude(106.7021)
                .address("Đường Huỳnh Tấn Phát, Q7")
                .waterDepthLevel(DepthLevel.SEAT_60CM_PLUS)
                .moderationStatus(FloodStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(floodReportRepository.findById(101L)).thenReturn(Optional.of(point));
        when(floodReportRepository.save(any(FloodReportPoint.class))).thenAnswer(i -> i.getArgument(0));

        ModerateFloodReportRequest modRequest = ModerateFloodReportRequest.builder()
                .status(FloodStatus.APPROVED)
                .moderatorNote("Đã xác minh qua camera giao thông")
                .nearbyStations("3 Gara đang ứng trực")
                .build();

        FloodReportResponse response = floodReportService.moderateReport(sampleStaff, 101L, modRequest);

        assertNotNull(response);
        assertEquals(FloodStatus.APPROVED, response.getModerationStatus());
        assertEquals(sampleStaff.getId(), response.getModeratedById());
        assertEquals("Đã xác minh qua camera giao thông", response.getModeratorNote());
    }
}

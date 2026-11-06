package com.prm393.floodrescue.features.mechanic;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.mechanic.dto.MechanicAttendanceSummaryResponse;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatusLog;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStatusLogRepository;
import com.prm393.floodrescue.features.mechanic.service.impl.MechanicAttendanceServiceImpl;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MechanicAttendanceServiceTest {

    @Mock private MechanicStatusLogRepository statusLogRepository;
    @Mock private MechanicStaffRepository mechanicRepository;
    @Mock private GarageRepository garageRepository;
    @Mock private RescueOrderRepository rescueOrderRepository;

    @InjectMocks private MechanicAttendanceServiceImpl attendanceService;

    private User owner;
    private Garage garage;
    private MechanicStaff staff;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).username("owner").role(Role.GARAGE_OWNER).active(true).build();
        garage = Garage.builder().id(10L).owner(owner).garageName("Gara Sài Gòn").status(GarageStatus.APPROVED).build();
        User staffUser = User.builder().id(2L).username("tho_01").fullName("Nguyễn Văn Thợ").phone("0909123456").active(true).build();
        GarageBranch branch = GarageBranch.builder().id(100L).branchName("Chi nhánh Quận 7").build();
        staff = MechanicStaff.builder()
                .id(20L)
                .user(staffUser)
                .garage(garage)
                .branch(branch)
                .workingStatus(MechanicStatus.AVAILABLE)
                .shiftName("Ca sáng (08:00 - 17:00)")
                .build();
    }

    @Test
    @DisplayName("Ghi nhận log đổi trạng thái thợ thành công")
    void recordStatusChange_Success() {
        attendanceService.recordStatusChange(
                staff,
                "ONLINE",
                MechanicStatus.OFFLINE,
                MechanicStatus.AVAILABLE,
                null,
                false,
                false,
                10.77,
                106.70,
                85
        );

        verify(statusLogRepository, times(1)).save(any(MechanicStatusLog.class));
    }

    @Test
    @DisplayName("Lấy tổng hợp chấm công ngày chính xác")
    void getAttendanceSummary_Success() {
        LocalDate date = LocalDate.of(2026, 11, 6);
        when(garageRepository.findByOwnerId(owner.getId())).thenReturn(Optional.of(garage));
        when(mechanicRepository.findByGarageId(garage.getId())).thenReturn(List.of(staff));

        LocalDateTime t1 = date.atTime(8, 0);
        LocalDateTime t2 = date.atTime(12, 0);
        LocalDateTime t3 = date.atTime(12, 45);
        LocalDateTime t4 = date.atTime(17, 0);

        MechanicStatusLog log1 = MechanicStatusLog.builder().eventType("ONLINE").statusTo(MechanicStatus.AVAILABLE).createdAt(t1).build();
        MechanicStatusLog log2 = MechanicStatusLog.builder().eventType("PAUSE").pauseReason("Nghỉ ăn trưa").statusTo(MechanicStatus.OFFLINE).createdAt(t2).build();
        MechanicStatusLog log3 = MechanicStatusLog.builder().eventType("RESUME").statusTo(MechanicStatus.AVAILABLE).createdAt(t3).build();
        MechanicStatusLog log4 = MechanicStatusLog.builder().eventType("OFFLINE").statusTo(MechanicStatus.OFFLINE).createdAt(t4).build();

        when(statusLogRepository.findByMechanicStaffIdAndCreatedAtBetweenOrderByCreatedAtAsc(eq(staff.getId()), any(), any()))
                .thenReturn(List.of(log1, log2, log3, log4));
        when(rescueOrderRepository.countByMechanicStaffIdAndStatusAndServiceCompletedAtBetween(eq(staff.getId()), any(), any(), any()))
                .thenReturn(3L);

        MechanicAttendanceSummaryResponse summary = attendanceService.getAttendanceSummary(owner, date, null, null);

        assertNotNull(summary);
        assertEquals(1, summary.getTotalMechanicsCount());
        assertEquals(1, summary.getActiveTodayCount());
        assertEquals(3, summary.getTotalCompletedOrders());
        assertEquals(1, summary.getItems().size());

        var item = summary.getItems().get(0);
        assertEquals("Nguyễn Văn Thợ", item.getMechanicFullName());
        assertEquals(t1, item.getFirstOnlineAt());
        assertEquals(t4, item.getLastOfflineAt());
        assertEquals(495, item.getTotalOnlineMinutes()); // 4h + 4h15m = 8h15m = 495m
        assertEquals(45, item.getTotalBreakMinutes());   // 45m nghỉ trưa
        assertEquals(3, item.getCompletedOrdersCount());
    }

    @Test
    @DisplayName("Xuất CSV chấm công có UTF-8 BOM và đầy đủ cột")
    void exportAttendanceCsv_Success() {
        LocalDate date = LocalDate.of(2026, 11, 6);
        when(garageRepository.findByOwnerId(owner.getId())).thenReturn(Optional.of(garage));
        when(mechanicRepository.findByGarageId(garage.getId())).thenReturn(List.of(staff));

        byte[] csv = attendanceService.exportAttendanceCsv(owner, date, null);
        assertNotNull(csv);
        String csvText = new String(csv, java.nio.charset.StandardCharsets.UTF_8);

        assertTrue(csvText.startsWith("\ufeffBÁO CÁO CHẤM CÔNG"));
        assertTrue(csvText.contains("Gara Sài Gòn"));
        assertTrue(csvText.contains("Nguyễn Văn Thợ"));
        assertTrue(csvText.contains("Chi nhánh Quận 7"));
    }
}

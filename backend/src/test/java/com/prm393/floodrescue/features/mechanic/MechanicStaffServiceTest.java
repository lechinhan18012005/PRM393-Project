package com.prm393.floodrescue.features.mechanic;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.mechanic.dto.CreateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.dto.UpdateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.dto.ToggleMechanicStatusRequest;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import java.time.LocalDateTime;
import java.util.List;
import com.prm393.floodrescue.features.mechanic.service.impl.MechanicStaffServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class MechanicStaffServiceTest {

    @Mock private MechanicStaffRepository mechanicRepository;

    @Mock private GarageRepository garageRepository;

    @Mock private GarageBranchRepository branchRepository;

    @Mock private UserRepository userRepository;

    @Mock private PasswordEncoder passwordEncoder;
    @Mock private RescueOrderRepository rescueOrderRepository;

    @InjectMocks private MechanicStaffServiceImpl mechanicService;

    private User sampleOwner;
    private Garage sampleGarage;
    private GarageBranch sampleBranch;

    @BeforeEach
    void setUp() {
        sampleOwner =
                User.builder().id(1L).username("garage_owner").role(Role.GARAGE_OWNER).build();

        sampleGarage =
                Garage.builder()
                        .id(10L)
                        .owner(sampleOwner)
                        .garageName("Gara Toàn Thắng")
                        .status(com.prm393.floodrescue.features.garage.entity.GarageStatus.APPROVED)
                        .build();

        sampleBranch =
                GarageBranch.builder()
                        .id(101L)
                        .branchName("Chi nhánh 1 (Q7)")
                        .garage(sampleGarage)
                        .operatingStatus(BranchStatus.OPEN)
                        .build();
    }

    @Test
    @DisplayName("UC-05: Thêm nhân viên thợ và phân bổ chi nhánh")
    void createMechanic_Success() {
        CreateMechanicRequest request =
                CreateMechanicRequest.builder()
                        .username("tech_01")
                        .fullName("Phạm Tuấn Anh")
                        .phone("0909123456")
                        .password("Password@123")
                        .branchId(101L)
                        .shiftName("Ca Chiều (Trực Bão)")
                        .build();

        when(garageRepository.findByOwnerId(sampleOwner.getId()))
                .thenReturn(Optional.of(sampleGarage));
        when(userRepository.existsByUsername("tech_01")).thenReturn(false);
        when(userRepository.existsByPhone("0909123456")).thenReturn(false);
        when(userRepository.existsByEmail("tech_01@floodrescue.vn")).thenReturn(false);
        when(passwordEncoder.encode("Password@123")).thenReturn("hashedPassword");

        User savedUser =
                User.builder()
                        .id(50L)
                        .username("tech_01")
                        .fullName("Phạm Tuấn Anh")
                        .phone("0909123456")
                        .role(Role.FIELD_MECHANIC)
                        .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        when(branchRepository.findById(101L)).thenReturn(Optional.of(sampleBranch));

        MechanicStaff staff =
                MechanicStaff.builder()
                        .id(200L)
                        .user(savedUser)
                        .garage(sampleGarage)
                        .branch(sampleBranch)
                        .workingStatus(MechanicStatus.OFFLINE)
                        .shiftName("Ca Chiều (Trực Bão)")
                        .build();
        when(mechanicRepository.save(any(MechanicStaff.class))).thenReturn(staff);

        MechanicStaffResponse response = mechanicService.createMechanic(sampleOwner, request);

        assertNotNull(response);
        assertEquals(200L, response.getId());
        assertEquals("Phạm Tuấn Anh", response.getFullName());
        assertEquals(MechanicStatus.OFFLINE, response.getWorkingStatus());
        assertEquals(101L, response.getBranchId());
    }

    @Test
    @DisplayName("UC-07: Thợ bật trạng thái trực tuyến (AVAILABLE) kèm tọa độ GPS")
    void toggleStatus_AvailableWithGps() {
        User mechanicUser =
                User.builder()
                        .id(50L)
                        .username("tech_01")
                        .fullName("Phạm Tuấn Anh")
                        .role(Role.FIELD_MECHANIC)
                        .build();

        MechanicStaff staff =
                MechanicStaff.builder()
                        .id(200L)
                        .user(mechanicUser)
                        .garage(sampleGarage)
                        .branch(sampleBranch)
                        .workingStatus(MechanicStatus.OFFLINE)
                        .build();

        when(mechanicRepository.findByUserId(50L)).thenReturn(Optional.of(staff));
        when(mechanicRepository.save(any(MechanicStaff.class))).thenAnswer(i -> i.getArgument(0));

        ToggleMechanicStatusRequest toggleRequest =
                ToggleMechanicStatusRequest.builder()
                        .workingStatus(MechanicStatus.AVAILABLE)
                        .latitude(10.7423)
                        .longitude(106.7021)
                        .build();

        MechanicStaffResponse response = mechanicService.toggleStatus(mechanicUser, toggleRequest);

        assertNotNull(response);
        assertEquals(MechanicStatus.AVAILABLE, response.getWorkingStatus());
        assertEquals(10.7423, response.getCurrentLatitude());
        assertEquals(106.7021, response.getCurrentLongitude());
        assertNotNull(response.getLastGpsUpdatedAt());
        assertNotNull(staff.getLastGpsUpdatedAt());
    }

    @Test
    @DisplayName("UC-07: Chặn thợ bật AVAILABLE khi chưa được phân bổ vào chi nhánh")
    void toggleStatus_BlockedWhenNoBranch() {
        User mechanicUser = User.builder().id(50L).username("tech_01").role(Role.FIELD_MECHANIC).build();
        MechanicStaff staff = MechanicStaff.builder()
                .id(200L)
                .user(mechanicUser)
                .garage(sampleGarage)
                .branch(null)
                .workingStatus(MechanicStatus.OFFLINE)
                .build();

        when(mechanicRepository.findByUserId(50L)).thenReturn(Optional.of(staff));

        ToggleMechanicStatusRequest toggleRequest = ToggleMechanicStatusRequest.builder()
                .workingStatus(MechanicStatus.AVAILABLE)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> mechanicService.toggleStatus(mechanicUser, toggleRequest));
        assertTrue(ex.getMessage().contains("chưa được phân bổ vào chi nhánh"));
    }

    @Test
    @DisplayName("UC-07: Chặn thợ bật AVAILABLE khi chi nhánh đang đóng cửa bảo trì")
    void toggleStatus_BlockedWhenBranchClosed() {
        User mechanicUser = User.builder().id(50L).username("tech_01").role(Role.FIELD_MECHANIC).build();
        GarageBranch closedBranch = GarageBranch.builder()
                .id(101L)
                .branchName("Chi nhánh 1 (Q7)")
                .garage(sampleGarage)
                .operatingStatus(BranchStatus.CLOSED_MAINTENANCE)
                .build();

        MechanicStaff staff = MechanicStaff.builder()
                .id(200L)
                .user(mechanicUser)
                .garage(sampleGarage)
                .branch(closedBranch)
                .workingStatus(MechanicStatus.OFFLINE)
                .build();

        when(mechanicRepository.findByUserId(50L)).thenReturn(Optional.of(staff));

        ToggleMechanicStatusRequest toggleRequest = ToggleMechanicStatusRequest.builder()
                .workingStatus(MechanicStatus.AVAILABLE)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> mechanicService.toggleStatus(mechanicUser, toggleRequest));
        assertTrue(ex.getMessage().contains("tạm đóng cửa bảo trì"));
    }

    @Test
    @DisplayName("UC-07: Thợ tạm nghỉ có lý do (pauseReason & isManualOverride = true)")
    void toggleStatus_PauseWithReason() {
        User mechanicUser = User.builder().id(50L).username("tech_01").role(Role.FIELD_MECHANIC).build();
        MechanicStaff staff = MechanicStaff.builder()
                .id(200L)
                .user(mechanicUser)
                .garage(sampleGarage)
                .branch(sampleBranch)
                .workingStatus(MechanicStatus.AVAILABLE)
                .build();

        when(mechanicRepository.findByUserId(50L)).thenReturn(Optional.of(staff));
        when(mechanicRepository.save(any(MechanicStaff.class))).thenAnswer(i -> i.getArgument(0));

        ToggleMechanicStatusRequest toggleRequest = ToggleMechanicStatusRequest.builder()
                .workingStatus(MechanicStatus.OFFLINE)
                .pauseReason("Nghỉ ăn trưa và kiểm tra đồ nghề")
                .build();

        MechanicStaffResponse response = mechanicService.toggleStatus(mechanicUser, toggleRequest);

        assertNotNull(response);
        assertEquals(MechanicStatus.OFFLINE, response.getWorkingStatus());
        assertTrue(response.isManualOverride());
        assertEquals("Nghỉ ăn trưa và kiểm tra đồ nghề", response.getPauseReason());
        assertNotNull(response.getPausedAt());
    }

    @Test
    @DisplayName("Chặn thợ tự đặt trạng thái BUSY qua toggleStatus")
    void toggleStatus_CannotSetBusyManually() {
        User mechanicUser = User.builder().id(50L).username("tech_01").role(Role.FIELD_MECHANIC).build();
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(mechanicUser).garage(sampleGarage).branch(sampleBranch).workingStatus(MechanicStatus.OFFLINE).build();

        when(mechanicRepository.findByUserId(50L)).thenReturn(Optional.of(staff));

        ToggleMechanicStatusRequest toggleRequest = ToggleMechanicStatusRequest.builder()
                .workingStatus(MechanicStatus.BUSY)
                .build();

        assertThrows(BadRequestException.class, () -> mechanicService.toggleStatus(mechanicUser, toggleRequest));
    }

    @Test
    @DisplayName("Chặn thợ đổi sang AVAILABLE/OFFLINE để thoát đơn khi đang có đơn active")
    void toggleStatus_CannotEscapeActiveOrder() {
        User mechanicUser = User.builder().id(50L).username("tech_01").role(Role.FIELD_MECHANIC).build();
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(mechanicUser).garage(sampleGarage).branch(sampleBranch).workingStatus(MechanicStatus.BUSY).build();

        when(mechanicRepository.findByUserId(50L)).thenReturn(Optional.of(staff));
        when(rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(eq(200L), anyList())).thenReturn(true);

        ToggleMechanicStatusRequest toggleRequest = ToggleMechanicStatusRequest.builder()
                .workingStatus(MechanicStatus.AVAILABLE)
                .build();

        assertThrows(BadRequestException.class, () -> mechanicService.toggleStatus(mechanicUser, toggleRequest));
    }

    @Test
    @DisplayName("Chặn điều chuyển chi nhánh khi thợ đang xử lý đơn active")
    void allocateBranch_BlockedWhenActiveOrder() {
        MechanicStaff staff = MechanicStaff.builder().id(200L).garage(sampleGarage).build();
        when(garageRepository.findByOwnerId(1L)).thenReturn(Optional.of(sampleGarage));
        when(mechanicRepository.findById(200L)).thenReturn(Optional.of(staff));
        when(rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(eq(200L), anyList())).thenReturn(true);

        com.prm393.floodrescue.features.mechanic.dto.AllocateBranchRequest req =
                new com.prm393.floodrescue.features.mechanic.dto.AllocateBranchRequest(2L, "Ca tối");

        assertThrows(BadRequestException.class, () -> mechanicService.allocateBranch(sampleOwner, 200L, req));
    }

    @Test
    @DisplayName("UC-05: Cập nhật thông tin, ca trực và năng lực vượt ngập thành công")
    void updateMechanic_Success() {
        User user = User.builder().id(50L).fullName("Nguyễn Văn A").phone("0901112233").build();
        MechanicStaff staff = MechanicStaff.builder()
                .id(200L)
                .user(user)
                .garage(sampleGarage)
                .shiftName("Ca sáng")
                .speciality("Sửa bugi")
                .hasCrossingCapability(false)
                .build();

        when(garageRepository.findByOwnerId(1L)).thenReturn(Optional.of(sampleGarage));
        when(mechanicRepository.findById(200L)).thenReturn(Optional.of(staff));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(mechanicRepository.save(any(MechanicStaff.class))).thenAnswer(i -> i.getArgument(0));

        UpdateMechanicRequest req = UpdateMechanicRequest.builder()
                .fullName("Nguyễn Văn B")
                .phone("0909998877")
                .shiftName("Ca đêm trực bão")
                .speciality("Sấy bugi & Chở xe vượt ngập")
                .hasCrossingCapability(true)
                .build();

        when(userRepository.existsByPhone("0909998877")).thenReturn(false);

        MechanicStaffResponse res = mechanicService.updateMechanic(sampleOwner, 200L, req);

        assertNotNull(res);
        assertEquals("Nguyễn Văn B", res.getFullName());
        assertEquals("0909998877", res.getPhone());
        assertEquals("Ca đêm trực bão", res.getShiftName());
        assertTrue(res.isHasCrossingCapability());
    }

    @Test
    @DisplayName("UC-05: Chặn cập nhật chi nhánh khi thợ đang có đơn active")
    void updateMechanic_BlockedWhenActiveOrder() {
        GarageBranch branchA = GarageBranch.builder().id(1L).branchName("CN 1").garage(sampleGarage).build();
        User user = User.builder().id(50L).build();
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(user).garage(sampleGarage).branch(branchA).build();

        when(garageRepository.findByOwnerId(1L)).thenReturn(Optional.of(sampleGarage));
        when(mechanicRepository.findById(200L)).thenReturn(Optional.of(staff));
        when(rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(eq(200L), anyList())).thenReturn(true);

        UpdateMechanicRequest req = UpdateMechanicRequest.builder()
                .branchId(2L)
                .build();

        assertThrows(BadRequestException.class, () -> mechanicService.updateMechanic(sampleOwner, 200L, req));
    }

    @Test
    @DisplayName("UC-05: Chặn khóa tài khoản (active=false) khi thợ đang có đơn active")
    void setActive_BlockedWhenActiveOrder() {
        User user = User.builder().id(50L).active(true).build();
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(user).garage(sampleGarage).build();

        when(garageRepository.findByOwnerId(1L)).thenReturn(Optional.of(sampleGarage));
        when(mechanicRepository.findById(200L)).thenReturn(Optional.of(staff));
        when(rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(eq(200L), anyList())).thenReturn(true);

        assertThrows(BadRequestException.class, () -> mechanicService.setActive(sampleOwner, 200L, false));
    }

    @Test
    @DisplayName("UC-05: Cấp lại mật khẩu tạm thời thành công")
    void resetPassword_Success() {
        User user = User.builder().id(50L).username("tech_01").password("old_pass").build();
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(user).garage(sampleGarage).build();

        when(garageRepository.findByOwnerId(1L)).thenReturn(Optional.of(sampleGarage));
        when(mechanicRepository.findById(200L)).thenReturn(Optional.of(staff));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_new_pass");
        when(userRepository.save(any(User.class))).thenReturn(user);

        String tempPass = mechanicService.resetPassword(sampleOwner, 200L);

        assertNotNull(tempPass);
        assertTrue(tempPass.startsWith("FR@"));
        verify(passwordEncoder).encode(tempPass);
    }

    @Test
    @DisplayName("UC-05: Cho thợ thôi việc thành công và bảo toàn dữ liệu")
    void removeMechanic_Success() {
        GarageBranch branch = GarageBranch.builder().id(1L).garage(sampleGarage).build();
        User user = User.builder().id(50L).active(true).build();
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(user).garage(sampleGarage).branch(branch).workingStatus(MechanicStatus.AVAILABLE).build();

        when(garageRepository.findByOwnerId(1L)).thenReturn(Optional.of(sampleGarage));
        when(mechanicRepository.findById(200L)).thenReturn(Optional.of(staff));
        when(rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(eq(200L), anyList())).thenReturn(false);

        mechanicService.removeMechanic(sampleOwner, 200L);

        assertFalse(user.isActive());
        assertEquals(MechanicStatus.OFFLINE, staff.getWorkingStatus());
        assertNull(staff.getBranch());
    }

    @Test
    @DisplayName("UC-05: Chặn cho thợ thôi việc khi đang có đơn cứu hộ active")
    void removeMechanic_BlockedWhenActiveOrder() {
        User user = User.builder().id(50L).active(true).build();
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(user).garage(sampleGarage).build();

        when(garageRepository.findByOwnerId(1L)).thenReturn(Optional.of(sampleGarage));
        when(mechanicRepository.findById(200L)).thenReturn(Optional.of(staff));
        when(rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(eq(200L), anyList())).thenReturn(true);

        assertThrows(BadRequestException.class, () -> mechanicService.removeMechanic(sampleOwner, 200L));
    }

    @Test
    @DisplayName("UC-05: Kiem tra tinh toan khung gio ca truc chinh xac (isWithinShift)")
    void isWithinShift_Calculation() {
        // Daytime shift: 06:00 - 14:00
        String morningShift = "Ca 1: Sáng (06:00 - 14:00)";
        assertTrue(MechanicStaffServiceImpl.isWithinShift(morningShift, java.time.LocalTime.of(8, 30)));
        assertTrue(MechanicStaffServiceImpl.isWithinShift(morningShift, java.time.LocalTime.of(6, 0)));
        assertFalse(MechanicStaffServiceImpl.isWithinShift(morningShift, java.time.LocalTime.of(15, 0)));

        // Afternoon/evening shift: 14:00 - 22:00
        String afternoonShift = "Ca 2: Chiều tối (14:00 - 22:00)";
        assertTrue(MechanicStaffServiceImpl.isWithinShift(afternoonShift, java.time.LocalTime.of(18, 0)));
        assertFalse(MechanicStaffServiceImpl.isWithinShift(afternoonShift, java.time.LocalTime.of(10, 0)));

        // Overnight shift: 22:00 - 06:00 (crosses midnight)
        String nightShift = "Ca 3: Đêm trực bão (22:00 - 06:00)";
        assertTrue(MechanicStaffServiceImpl.isWithinShift(nightShift, java.time.LocalTime.of(23, 30)));
        assertTrue(MechanicStaffServiceImpl.isWithinShift(nightShift, java.time.LocalTime.of(3, 15)));
        assertFalse(MechanicStaffServiceImpl.isWithinShift(nightShift, java.time.LocalTime.of(12, 0)));

        // 24/7 shift
        String allDayShift = "Ca Trực chiến 24/7 (00:00 - 23:59)";
        assertTrue(MechanicStaffServiceImpl.isWithinShift(allDayShift, java.time.LocalTime.of(12, 0)));
        assertTrue(MechanicStaffServiceImpl.isWithinShift(allDayShift, java.time.LocalTime.of(2, 0)));
    }

    @Test
    @DisplayName("UC-05: Dong bo trang thai tho theo khung gio ca truc (AVAILABLE trong ca, OFFLINE ngoai ca)")
    void syncStatusWithShift_FollowsShiftSchedule() {
        User user = User.builder().id(50L).fullName("Nguyễn Văn Thợ").active(true).build();
        MechanicStaff staff = MechanicStaff.builder()
                .id(200L)
                .user(user)
                .shiftName("Ca 2: Chiều tối (14:00 - 22:00)")
                .workingStatus(MechanicStatus.OFFLINE)
                .isManualOverride(false)
                .build();

        // 1. When time is 18:00 (within shift), status should transition to AVAILABLE
        mechanicService.syncStatusWithShift(staff, java.time.LocalTime.of(18, 0));
        assertEquals(MechanicStatus.AVAILABLE, staff.getWorkingStatus());

        // 2. When time is 23:00 (outside shift), status should transition to OFFLINE
        mechanicService.syncStatusWithShift(staff, java.time.LocalTime.of(23, 0));
        assertEquals(MechanicStatus.OFFLINE, staff.getWorkingStatus());

        // 3. When staff is BUSY on active rescue, status must NOT be modified
        staff.setWorkingStatus(MechanicStatus.BUSY);
        mechanicService.syncStatusWithShift(staff, java.time.LocalTime.of(23, 0));
        assertEquals(MechanicStatus.BUSY, staff.getWorkingStatus());
    }

    @Test
    @DisplayName("BR-MECH-008: Tôn trọng quyết định tạm nghỉ thủ công của thợ (isManualOverride = true)")
    void syncStatusWithShift_RespectsManualOverride() {
        User user = User.builder().id(50L).fullName("Nguyễn Văn Thợ").active(true).build();
        MechanicStaff staff = MechanicStaff.builder()
                .id(200L)
                .user(user)
                .shiftName("Ca 2: Chiều tối (14:00 - 22:00)")
                .workingStatus(MechanicStatus.OFFLINE)
                .isManualOverride(true)
                .pauseReason("Nghỉ ăn cơm")
                .build();

        // Dù đang trong ca (18:00), hệ thống vẫn giữ nguyên OFFLINE vì thợ chủ động tạm nghỉ
        mechanicService.syncStatusWithShift(staff, java.time.LocalTime.of(18, 0));
        assertEquals(MechanicStatus.OFFLINE, staff.getWorkingStatus());
    }

    @Test
    @DisplayName("BR-MECH-009: Reaper tự động hạ OFFLINE các thợ mất tín hiệu định vị > 10 phút")
    void autoOfflineStaleMechanics_ReapsStaleMechanics() {
        User user1 = User.builder().id(50L).username("tho_01").active(true).build();
        User user2 = User.builder().id(51L).username("tho_02").active(true).build();

        // Thợ 1: AVAILABLE nhưng heartbeat từ 15 phút trước -> bị reaper hạ OFFLINE
        MechanicStaff staleStaff = MechanicStaff.builder()
                .id(201L)
                .user(user1)
                .workingStatus(MechanicStatus.AVAILABLE)
                .lastGpsUpdatedAt(LocalDateTime.now().minusMinutes(15))
                .build();

        // Thợ 2: AVAILABLE và heartbeat vừa cập nhật 2 phút trước -> giữ nguyên AVAILABLE
        MechanicStaff freshStaff = MechanicStaff.builder()
                .id(202L)
                .user(user2)
                .workingStatus(MechanicStatus.AVAILABLE)
                .lastGpsUpdatedAt(LocalDateTime.now().minusMinutes(2))
                .build();

        when(mechanicRepository.findAll()).thenReturn(List.of(staleStaff, freshStaff));
        when(rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(eq(201L), anyList())).thenReturn(false);

        mechanicService.autoOfflineStaleMechanics();

        assertEquals(MechanicStatus.OFFLINE, staleStaff.getWorkingStatus());
        assertFalse(staleStaff.isManualOverride());
        assertTrue(staleStaff.getPauseReason().contains("BR-MECH-009"));
        assertEquals(MechanicStatus.AVAILABLE, freshStaff.getWorkingStatus());
        verify(mechanicRepository).save(staleStaff);
        verify(mechanicRepository, never()).save(freshStaff);
    }
}

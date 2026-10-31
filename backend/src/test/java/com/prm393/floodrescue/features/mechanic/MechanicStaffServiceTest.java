package com.prm393.floodrescue.features.mechanic;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
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
import java.util.List;
import com.prm393.floodrescue.features.mechanic.service.MechanicStaffService;

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

    @InjectMocks private MechanicStaffService mechanicService;

    private User sampleOwner;
    private Garage sampleGarage;

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

        GarageBranch branch =
                GarageBranch.builder()
                        .id(101L)
                        .branchName("Chi nhánh 1 (Q7)")
                        .garage(sampleGarage)
                        .build();
        when(branchRepository.findById(101L)).thenReturn(Optional.of(branch));

        MechanicStaff staff =
                MechanicStaff.builder()
                        .id(200L)
                        .user(savedUser)
                        .garage(sampleGarage)
                        .branch(branch)
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
    @DisplayName("Chặn thợ tự đặt trạng thái BUSY qua toggleStatus")
    void toggleStatus_CannotSetBusyManually() {
        User mechanicUser = User.builder().id(50L).username("tech_01").role(Role.FIELD_MECHANIC).build();
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(mechanicUser).garage(sampleGarage).workingStatus(MechanicStatus.OFFLINE).build();

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
        MechanicStaff staff = MechanicStaff.builder().id(200L).user(mechanicUser).garage(sampleGarage).workingStatus(MechanicStatus.BUSY).build();

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
}

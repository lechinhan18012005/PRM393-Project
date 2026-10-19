package com.prm393.floodrescue.features.mechanic;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.mechanic.dto.CreateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.dto.ToggleMechanicStatusRequest;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MechanicStaffServiceTest {

    @Mock
    private MechanicStaffRepository mechanicRepository;

    @Mock
    private GarageRepository garageRepository;

    @Mock
    private GarageBranchRepository branchRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private MechanicStaffService mechanicService;

    private User sampleOwner;
    private Garage sampleGarage;

    @BeforeEach
    void setUp() {
        sampleOwner = User.builder()
                .id(1L)
                .username("garage_owner")
                .role(Role.GARAGE_OWNER)
                .build();

        sampleGarage = Garage.builder()
                .id(10L)
                .owner(sampleOwner)
                .garageName("Gara Toàn Thắng")
                .build();
    }

    @Test
    @DisplayName("UC-05: Thêm nhân viên thợ và phân bổ chi nhánh")
    void createMechanic_Success() {
        CreateMechanicRequest request = CreateMechanicRequest.builder()
                .username("tech_01")
                .fullName("Phạm Tuấn Anh")
                .phone("0909123456")
                .password("Password@123")
                .branchId(101L)
                .shiftName("Ca Chiều (Trực Bão)")
                .build();

        when(garageRepository.findByOwnerId(sampleOwner.getId())).thenReturn(Optional.of(sampleGarage));
        when(userRepository.existsByUsername("tech_01")).thenReturn(false);
        when(userRepository.existsByPhone("0909123456")).thenReturn(false);
        when(passwordEncoder.encode("Password@123")).thenReturn("hashedPassword");

        User savedUser = User.builder()
                .id(50L)
                .username("tech_01")
                .fullName("Phạm Tuấn Anh")
                .phone("0909123456")
                .role(Role.FIELD_MECHANIC)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        GarageBranch branch = GarageBranch.builder()
                .id(101L)
                .branchName("Chi nhánh 1 (Q7)")
                .garage(sampleGarage)
                .build();
        when(branchRepository.findById(101L)).thenReturn(Optional.of(branch));

        MechanicStaff staff = MechanicStaff.builder()
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
        User mechanicUser = User.builder()
                .id(50L)
                .username("tech_01")
                .fullName("Phạm Tuấn Anh")
                .role(Role.FIELD_MECHANIC)
                .build();

        MechanicStaff staff = MechanicStaff.builder()
                .id(200L)
                .user(mechanicUser)
                .garage(sampleGarage)
                .workingStatus(MechanicStatus.OFFLINE)
                .build();

        when(mechanicRepository.findByUserId(50L)).thenReturn(Optional.of(staff));
        when(mechanicRepository.save(any(MechanicStaff.class))).thenAnswer(i -> i.getArgument(0));

        ToggleMechanicStatusRequest toggleRequest = ToggleMechanicStatusRequest.builder()
                .workingStatus(MechanicStatus.AVAILABLE)
                .latitude(10.7423)
                .longitude(106.7021)
                .build();

        MechanicStaffResponse response = mechanicService.toggleStatus(mechanicUser, toggleRequest);

        assertNotNull(response);
        assertEquals(MechanicStatus.AVAILABLE, response.getWorkingStatus());
        assertEquals(10.7423, response.getCurrentLatitude());
        assertEquals(106.7021, response.getCurrentLongitude());
    }
}

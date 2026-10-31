package com.prm393.floodrescue.features.garage;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.dto.ApproveGarageRequest;
import com.prm393.floodrescue.features.garage.dto.GarageResponse;
import com.prm393.floodrescue.features.garage.dto.RegisterGarageRequest;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.service.GarageService;
import com.prm393.floodrescue.features.garage.service.impl.GarageServiceImpl;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class GarageServiceTest {

    @Mock private GarageRepository garageRepository;

    @Mock private GarageBranchRepository branchRepository;

    @Mock private MechanicStaffRepository mechanicRepository;

    @Mock private UserRepository userRepository;

    @InjectMocks private GarageServiceImpl garageService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser =
                User.builder()
                        .id(1L)
                        .username("test_owner")
                        .fullName("Lê Chủ Gara")
                        .phone("0901234567")
                        .role(Role.GARAGE_OWNER)
                        .build();
    }

    @Test
    @DisplayName("UC-02: Đăng ký garage thành công và khởi tạo chi nhánh đầu tiên")
    void registerGarage_Success() {
        RegisterGarageRequest request =
                RegisterGarageRequest.builder()
                        .garageName("Gara Toàn Thắng Q7")
                        .phone("0901234567")
                        .firstBranchName("Chi nhánh chính")
                        .firstBranchAddress("148 Trần Xuân Soạn, Q7")
                        .firstBranchLatitude(10.7423)
                        .firstBranchLongitude(106.7021)
                        .build();

        when(garageRepository.existsByOwnerId(sampleUser.getId())).thenReturn(false);

        Garage savedGarage =
                Garage.builder()
                        .id(10L)
                        .owner(sampleUser)
                        .garageName("Gara Toàn Thắng Q7")
                        .status(GarageStatus.PENDING)
                        .walletBalance(BigDecimal.ZERO)
                        .build();

        when(garageRepository.save(any(Garage.class))).thenReturn(savedGarage);
        when(branchRepository.save(any(GarageBranch.class))).thenAnswer(i -> i.getArgument(0));
        when(branchRepository.findByGarageIdOrderByCreatedAtAsc(10L))
                .thenReturn(Collections.emptyList());
        when(mechanicRepository.countByGarageId(10L)).thenReturn(0L);

        GarageResponse response = garageService.registerGarage(sampleUser, request);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals(GarageStatus.PENDING, response.getStatus());
        assertEquals("Gara Toàn Thắng Q7", response.getGarageName());
        verify(garageRepository, times(1)).save(any(Garage.class));
        verify(branchRepository, times(1)).save(any(GarageBranch.class));
    }

    @Test
    @DisplayName("UC-02: Báo lỗi khi user đã có garage đăng ký trên hệ thống")
    void registerGarage_DuplicateError() {
        RegisterGarageRequest request =
                RegisterGarageRequest.builder().garageName("Gara Đã Có").build();

        when(garageRepository.existsByOwnerId(sampleUser.getId())).thenReturn(true);

        assertThrows(
                BadRequestException.class, () -> garageService.registerGarage(sampleUser, request));
        verify(garageRepository, never()).save(any(Garage.class));
    }

    @Test
    @DisplayName("UC-03: Staff phê duyệt và kích hoạt gara")
    void moderateGarage_Approve() {
        Garage garage =
                Garage.builder()
                        .id(20L)
                        .owner(sampleUser)
                        .garageName("Gara Chờ Duyệt")
                        .businessLicenseUrl("https://example.com/license")
                        .idCardUrl("https://example.com/id")
                        .status(GarageStatus.PENDING)
                        .build();

        when(garageRepository.findById(20L)).thenReturn(Optional.of(garage));
        when(garageRepository.save(any(Garage.class))).thenAnswer(i -> i.getArgument(0));
        when(branchRepository.findByGarageIdOrderByCreatedAtAsc(20L))
                .thenReturn(Collections.emptyList());
        when(mechanicRepository.countByGarageId(20L)).thenReturn(0L);

        ApproveGarageRequest approveRequest =
                ApproveGarageRequest.builder()
                        .status(GarageStatus.APPROVED)
                        .note("Hồ sơ hợp lệ, đủ điều kiện tiếp nhận cứu hộ")
                        .build();

        GarageResponse response = garageService.moderateGarage(20L, approveRequest);

        assertNotNull(response);
        assertEquals(GarageStatus.APPROVED, response.getStatus());
        assertEquals("Hồ sơ hợp lệ, đủ điều kiện tiếp nhận cứu hộ", response.getRejectionReason());
    }
}

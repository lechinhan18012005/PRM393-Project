package com.prm393.floodrescue.features.mechanic.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.mechanic.dto.AllocateBranchRequest;
import com.prm393.floodrescue.features.mechanic.dto.CreateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.dto.ToggleMechanicStatusRequest;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MechanicStaffService {

    private final MechanicStaffRepository mechanicRepository;
    private final GarageRepository garageRepository;
    private final GarageBranchRepository branchRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public MechanicStaffResponse createMechanic(User owner, CreateMechanicRequest request) {
        Garage garage = garageRepository.findByOwnerId(owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại trong hệ thống!");
        }

        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Số điện thoại đã được đăng ký!");
        }

        User mechanicUser = User.builder()
                .username(request.getUsername().trim())
                .fullName(request.getFullName().trim())
                .email(request.getEmail() != null && !request.getEmail().isBlank()
                        ? request.getEmail().trim()
                        : request.getUsername() + "@floodrescue.vn")
                .phone(request.getPhone().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.FIELD_MECHANIC)
                .avatarUrl("https://ui-avatars.com/api/?name=" + request.getFullName().replace(" ", "+") + "&background=DC2626&color=fff")
                .active(true)
                .build();

        mechanicUser = userRepository.save(mechanicUser);

        GarageBranch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Chi nhánh không tồn tại: " + request.getBranchId()));
        }

        MechanicStaff staff = MechanicStaff.builder()
                .user(mechanicUser)
                .garage(garage)
                .branch(branch)
                .workingStatus(MechanicStatus.OFFLINE)
                .shiftName(request.getShiftName() != null ? request.getShiftName() : "Ca 2: Chiều tối (14:00 - 22:00)")
                .speciality(request.getSpeciality() != null ? request.getSpeciality() : "Cứu hộ xe ngập nước & Sấy bugi")
                .ratingAvg(5.0)
                .build();

        staff = mechanicRepository.save(staff);
        log.info("Mechanic created with staff id: {} for garage: {}", staff.getId(), garage.getId());
        return mapToResponse(staff);
    }

    @Transactional(readOnly = true)
    public List<MechanicStaffResponse> getMechanicsByGarage(User owner) {
        Garage garage = garageRepository.findByOwnerId(owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));
        return mechanicRepository.findByGarageIdOrderByCreatedAtDesc(garage.getId()).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MechanicStaffResponse> getMechanicsByGarageId(Long garageId) {
        return mechanicRepository.findByGarageIdOrderByCreatedAtDesc(garageId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public MechanicStaffResponse allocateBranch(User owner, Long staffId, AllocateBranchRequest request) {
        Garage garage = garageRepository.findByOwnerId(owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));

        MechanicStaff staff = mechanicRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thợ với id: " + staffId));

        if (!staff.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException("Thợ không thuộc quyền quản lý của garage bạn!");
        }

        if (request.getBranchId() != null) {
            GarageBranch branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Chi nhánh không tồn tại: " + request.getBranchId()));
            staff.setBranch(branch);
        }

        if (request.getShiftName() != null) {
            staff.setShiftName(request.getShiftName());
        }

        staff = mechanicRepository.save(staff);
        return mapToResponse(staff);
    }

    @Transactional(readOnly = true)
    public MechanicStaffResponse getMyProfile(User mechanicUser) {
        MechanicStaff staff = mechanicRepository.findByUserId(mechanicUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có hồ sơ thợ cứu hộ cho tài khoản này!"));
        return mapToResponse(staff);
    }

    @Transactional
    public MechanicStaffResponse toggleStatus(User mechanicUser, ToggleMechanicStatusRequest request) {
        MechanicStaff staff = mechanicRepository.findByUserId(mechanicUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có hồ sơ thợ cứu hộ cho tài khoản này!"));

        staff.setWorkingStatus(request.getWorkingStatus());
        if (request.getLatitude() != null && request.getLongitude() != null) {
            staff.setCurrentLatitude(request.getLatitude());
            staff.setCurrentLongitude(request.getLongitude());
        }

        staff = mechanicRepository.save(staff);
        log.info("Mechanic user: {} updated status to: {}", mechanicUser.getUsername(), request.getWorkingStatus());
        return mapToResponse(staff);
    }

    public MechanicStaffResponse mapToResponse(MechanicStaff staff) {
        return MechanicStaffResponse.builder()
                .id(staff.getId())
                .userId(staff.getUser().getId())
                .username(staff.getUser().getUsername())
                .fullName(staff.getUser().getFullName())
                .phone(staff.getUser().getPhone())
                .email(staff.getUser().getEmail())
                .avatarUrl(staff.getUser().getAvatarUrl())
                .garageId(staff.getGarage().getId())
                .garageName(staff.getGarage().getGarageName())
                .branchId(staff.getBranch() != null ? staff.getBranch().getId() : null)
                .branchName(staff.getBranch() != null ? staff.getBranch().getBranchName() : null)
                .branchAddress(staff.getBranch() != null ? staff.getBranch().getAddress() : null)
                .currentLatitude(staff.getCurrentLatitude())
                .currentLongitude(staff.getCurrentLongitude())
                .workingStatus(staff.getWorkingStatus())
                .shiftName(staff.getShiftName())
                .ratingAvg(staff.getRatingAvg())
                .speciality(staff.getSpeciality())
                .createdAt(staff.getCreatedAt())
                .build();
    }
}

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
import com.prm393.floodrescue.features.mechanic.dto.UpdateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import java.time.LocalDateTime;

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
    private final RescueOrderRepository rescueOrderRepository;

    @Transactional
    public MechanicStaffResponse createMechanic(User owner, CreateMechanicRequest request) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        com.prm393.floodrescue.features.garage.service.GarageAccess.requireApproved(garage);

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại trong hệ thống!");
        }

        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Số điện thoại đã được đăng ký!");
        }

        User mechanicUser =
                User.builder()
                        .username(request.getUsername().trim())
                        .fullName(request.getFullName().trim())
                        .email(
                                request.getEmail() != null && !request.getEmail().isBlank()
                                        ? request.getEmail().trim()
                                        : request.getUsername() + "@floodrescue.vn")
                        .phone(request.getPhone().trim())
                        .password(passwordEncoder.encode(request.getPassword()))
                        .role(Role.FIELD_MECHANIC)
                        .avatarUrl(
                                "https://ui-avatars.com/api/?name="
                                        + request.getFullName().replace(" ", "+")
                                        + "&background=DC2626&color=fff")
                        .active(true)
                        .build();

        mechanicUser = userRepository.save(mechanicUser);

        GarageBranch branch = null;
        if (request.getBranchId() != null) {
            branch =
                    branchRepository
                            .findById(request.getBranchId())
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Chi nhánh không tồn tại: "
                                                            + request.getBranchId()));
        }

        if (branch != null && !branch.getGarage().getId().equals(garage.getId()))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Chi nhánh không thuộc gara của bạn");
        MechanicStaff staff =
                MechanicStaff.builder()
                        .user(mechanicUser)
                        .garage(garage)
                        .branch(branch)
                        .workingStatus(MechanicStatus.OFFLINE)
                        .shiftName(
                                request.getShiftName() != null
                                        ? request.getShiftName()
                                        : "Ca 2: Chiều tối (14:00 - 22:00)")
                        .speciality(
                                request.getSpeciality() != null
                                        ? request.getSpeciality()
                                        : "Cứu hộ xe ngập nước & Sấy bugi")
                        .hasCrossingCapability(Boolean.TRUE.equals(request.getHasCrossingCapability()))
                        .ratingAvg(5.0)
                        .build();

        staff = mechanicRepository.save(staff);
        log.info(
                "Mechanic created with staff id: {} for garage: {}", staff.getId(), garage.getId());
        return mapToResponse(staff);
    }

    @Transactional(readOnly = true)
    public List<MechanicStaffResponse> getMechanicsByGarage(User owner) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        com.prm393.floodrescue.features.garage.service.GarageAccess.requireApproved(garage);
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
    public MechanicStaffResponse allocateBranch(
            User owner, Long staffId, AllocateBranchRequest request) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        com.prm393.floodrescue.features.garage.service.GarageAccess.requireApproved(garage);

        MechanicStaff staff =
                mechanicRepository
                        .findById(staffId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy thợ với id: " + staffId));

        if (!staff.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException("Thợ không thuộc quyền quản lý của garage bạn!");
        }

        if (rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(
                staffId, List.of(RescueOrderStatus.DISPATCHED, RescueOrderStatus.ARRIVED, RescueOrderStatus.IN_PROGRESS))) {
            throw new BadRequestException("Không thể điều chuyển chi nhánh khi thợ đang thực hiện đơn cứu hộ!");
        }

        if (request.getBranchId() != null) {
            GarageBranch branch =
                    branchRepository
                            .findById(request.getBranchId())
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Chi nhánh không tồn tại: "
                                                            + request.getBranchId()));
            if (!branch.getGarage().getId().equals(garage.getId()))
                throw new org.springframework.security.access.AccessDeniedException(
                        "Chi nhánh không thuộc gara của bạn");
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
        MechanicStaff staff =
                mechanicRepository
                        .findByUserId(mechanicUser.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa có hồ sơ thợ cứu hộ cho tài khoản này!"));
        return mapToResponse(staff);
    }

    @Transactional
    public MechanicStaffResponse toggleStatus(
            User mechanicUser, ToggleMechanicStatusRequest request) {
        MechanicStaff staff =
                mechanicRepository
                        .findByUserId(mechanicUser.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa có hồ sơ thợ cứu hộ cho tài khoản này!"));

        com.prm393.floodrescue.features.garage.service.GarageAccess.requireApproved(
                staff.getGarage());

        if (request.getWorkingStatus() == MechanicStatus.BUSY) {
            throw new BadRequestException("Trạng thái BẬN do nghiệp vụ điều phối quản lý, không thể tự đặt!");
        }

        boolean hasActiveOrder = rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(
                staff.getId(), List.of(RescueOrderStatus.DISPATCHED, RescueOrderStatus.ARRIVED, RescueOrderStatus.IN_PROGRESS)
        );
        if (hasActiveOrder && (request.getWorkingStatus() == MechanicStatus.AVAILABLE || request.getWorkingStatus() == MechanicStatus.OFFLINE)) {
            throw new BadRequestException("Thợ đang có đơn cứu hộ chưa hoàn thành, không thể chuyển trạng thái để thoát đơn!");
        }

        staff.setWorkingStatus(request.getWorkingStatus());
        staff.setLastHeartbeatAt(LocalDateTime.now());
        if (request.getLatitude() != null && request.getLongitude() != null) {
            double lat = request.getLatitude();
            double lon = request.getLongitude();
            if (!Double.isNaN(lat) && !Double.isInfinite(lat) && lat >= -90.0 && lat <= 90.0
                    && !Double.isNaN(lon) && !Double.isInfinite(lon) && lon >= -180.0 && lon <= 180.0) {
                staff.setCurrentLatitude(lat);
                staff.setCurrentLongitude(lon);
                staff.setLastGpsUpdatedAt(LocalDateTime.now());
            }

        }

        staff = mechanicRepository.save(staff);
        log.info(
                "Mechanic user: {} updated status to: {}",
                mechanicUser.getUsername(),
                request.getWorkingStatus());
        return mapToResponse(staff);
    }

    @Transactional
    public MechanicStaffResponse setActive(User owner, Long staffId, boolean active) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara"));
        com.prm393.floodrescue.features.garage.service.GarageAccess.requireApproved(garage);
        MechanicStaff staff =
                mechanicRepository
                        .findById(staffId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thợ"));
        if (!staff.getGarage().getId().equals(garage.getId()))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Thợ không thuộc gara của bạn");

        if (!active && rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(
                staffId, List.of(RescueOrderStatus.DISPATCHED, RescueOrderStatus.ARRIVED, RescueOrderStatus.IN_PROGRESS))) {
            throw new BadRequestException("Không thể khóa quyền làm việc khi thợ đang thực hiện đơn cứu hộ!");
        }

        staff.getUser().setActive(active);
        userRepository.save(staff.getUser());
        if (!active) staff.setWorkingStatus(MechanicStatus.OFFLINE);
        mechanicRepository.save(staff);
        return mapToResponse(staff);
    }

    @Transactional
    public MechanicStaffResponse updateMechanic(
            User owner, Long staffId, UpdateMechanicRequest request) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        com.prm393.floodrescue.features.garage.service.GarageAccess.requireApproved(garage);

        MechanicStaff staff =
                mechanicRepository
                        .findById(staffId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy thợ với id: " + staffId));

        if (!staff.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException("Thợ không thuộc quyền quản lý của garage bạn!");
        }

        if (request.getBranchId() != null
                && (staff.getBranch() == null || !request.getBranchId().equals(staff.getBranch().getId()))) {
            if (rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(
                    staffId,
                    List.of(
                            RescueOrderStatus.DISPATCHED,
                            RescueOrderStatus.ARRIVED,
                            RescueOrderStatus.IN_PROGRESS))) {
                throw new BadRequestException("Không thể điều chuyển chi nhánh khi thợ đang thực hiện đơn cứu hộ!");
            }
            GarageBranch branch =
                    branchRepository
                            .findById(request.getBranchId())
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Chi nhánh không tồn tại: " + request.getBranchId()));
            if (!branch.getGarage().getId().equals(garage.getId())) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Chi nhánh không thuộc gara của bạn");
            }
            staff.setBranch(branch);
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            staff.getUser().setFullName(request.getFullName().trim());
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()
                && !request.getPhone().trim().equals(staff.getUser().getPhone())) {
            if (userRepository.existsByPhone(request.getPhone().trim())) {
                throw new BadRequestException("Số điện thoại đã được đăng ký bởi tài khoản khác!");
            }
            staff.getUser().setPhone(request.getPhone().trim());
        }

        if (request.getShiftName() != null) {
            staff.setShiftName(request.getShiftName().trim());
        }

        if (request.getSpeciality() != null) {
            staff.setSpeciality(request.getSpeciality().trim());
        }

        if (request.getHasCrossingCapability() != null) {
            staff.setHasCrossingCapability(request.getHasCrossingCapability());
        }

        userRepository.save(staff.getUser());
        staff = mechanicRepository.save(staff);
        return mapToResponse(staff);
    }

    @Transactional
    public String resetPassword(User owner, Long staffId) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));
        com.prm393.floodrescue.features.garage.service.GarageAccess.requireApproved(garage);

        MechanicStaff staff =
                mechanicRepository
                        .findById(staffId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thợ"));

        if (!staff.getGarage().getId().equals(garage.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Thợ không thuộc gara của bạn");
        }

        String tempPassword = "FR@" + java.util.UUID.randomUUID().toString().substring(0, 8);
        staff.getUser().setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(staff.getUser());
        log.info("Reset password for mechanic staffId: {}, username: {}", staffId, staff.getUser().getUsername());
        return tempPassword;
    }

    @Transactional
    public void removeMechanic(User owner, Long staffId) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));
        com.prm393.floodrescue.features.garage.service.GarageAccess.requireApproved(garage);

        MechanicStaff staff =
                mechanicRepository
                        .findById(staffId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thợ"));

        if (!staff.getGarage().getId().equals(garage.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Thợ không thuộc gara của bạn");
        }

        if (rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(
                staffId,
                List.of(
                        RescueOrderStatus.DISPATCHED,
                        RescueOrderStatus.ARRIVED,
                        RescueOrderStatus.IN_PROGRESS))) {
            throw new BadRequestException("Không thể cho thợ thôi việc khi đang thực hiện đơn cứu hộ!");
        }

        staff.getUser().setActive(false);
        userRepository.save(staff.getUser());
        staff.setWorkingStatus(MechanicStatus.OFFLINE);
        staff.setBranch(null);
        mechanicRepository.save(staff);
        log.info("Mechanic staffId: {} offboarded / soft-deleted from garage: {}", staffId, garage.getId());
    }

    public MechanicStaffResponse mapToResponse(MechanicStaff staff) {
        return MechanicStaffResponse.builder()
                .active(staff.getUser().isActive())
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
                .hasCrossingCapability(staff.isHasCrossingCapability())
                .lastHeartbeatAt(staff.getLastHeartbeatAt())
                .lastGpsUpdatedAt(staff.getLastGpsUpdatedAt())
                .createdAt(staff.getCreatedAt())
                .build();
    }
}

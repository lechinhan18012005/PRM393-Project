package com.prm393.floodrescue.features.mechanic.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.common.utils.PhoneUtils;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.service.GarageAccess;
import com.prm393.floodrescue.features.mechanic.dto.AllocateBranchRequest;
import com.prm393.floodrescue.features.mechanic.dto.CreateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.dto.ToggleMechanicStatusRequest;
import com.prm393.floodrescue.features.mechanic.dto.UpdateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.mechanic.service.MechanicStaffService;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MechanicStaffServiceImpl implements MechanicStaffService {

    private final MechanicStaffRepository mechanicRepository;
    private final GarageRepository garageRepository;
    private final GarageBranchRepository branchRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RescueOrderRepository rescueOrderRepository;

    @Override
    @Transactional
    public MechanicStaffResponse createMechanic(User owner, CreateMechanicRequest request) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

        String normalizedUsername = request.getUsername().trim();
        if (userRepository.existsByUsername(normalizedUsername)) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại trong hệ thống!");
        }

        String canonicalPhone = PhoneUtils.normalize(request.getPhone());
        if (!PhoneUtils.isValidVietnamesePhone(canonicalPhone)) {
            throw new BadRequestException("Số điện thoại không hợp lệ (yêu cầu 10 chữ số, ví dụ 0903123456)");
        }
        if (userRepository.existsByPhone(canonicalPhone)) {
            throw new BadRequestException("Số điện thoại đã được đăng ký!");
        }

        String email =
                request.getEmail() != null && !request.getEmail().isBlank()
                        ? request.getEmail().trim().toLowerCase(Locale.ROOT)
                        : normalizedUsername.toLowerCase(Locale.ROOT) + "@floodrescue.vn";
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email đã được đăng ký trong hệ thống!");
        }

        if (request.getBranchId() == null) {
            throw new BadRequestException("Vui lòng chọn chi nhánh làm việc cho thợ!");
        }

        GarageBranch branch =
                branchRepository
                        .findById(request.getBranchId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chi nhánh không tồn tại: "
                                                        + request.getBranchId()));

        if (!branch.getGarage().getId().equals(garage.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Chi nhánh không thuộc gara của bạn");
        }

        if (branch.getOperatingStatus() != BranchStatus.OPEN) {
            throw new BadRequestException("Chi nhánh đang tạm đóng cửa hoặc bảo trì, không thể phân bổ thợ vào lúc này!");
        }

        User mechanicUser =
                User.builder()
                        .username(normalizedUsername)
                        .fullName(request.getFullName().trim())
                        .email(email)
                        .phone(canonicalPhone)
                        .password(passwordEncoder.encode(request.getPassword()))
                        .role(Role.FIELD_MECHANIC)
                        .avatarUrl(
                                "https://ui-avatars.com/api/?name="
                                        + request.getFullName().trim().replace(" ", "+")
                                        + "&background=DC2626&color=fff")
                        .active(true)
                        .build();

        mechanicUser = userRepository.save(mechanicUser);

        String resolvedShiftName =
                request.getShiftName() != null && !request.getShiftName().isBlank()
                        ? request.getShiftName().trim()
                        : "Ca 2: Chiều tối (14:00 - 22:00)";

        boolean inShift = isWithinShift(resolvedShiftName, LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));

        MechanicStaff staff =
                MechanicStaff.builder()
                        .user(mechanicUser)
                        .garage(garage)
                        .branch(branch)
                        .workingStatus(inShift ? MechanicStatus.AVAILABLE : MechanicStatus.OFFLINE)
                        .shiftName(resolvedShiftName)
                        .speciality(
                                request.getSpeciality() != null && !request.getSpeciality().isBlank()
                                        ? request.getSpeciality().trim()
                                        : "Cứu hộ xe ngập nước & Sấy bugi")
                        .hasCrossingCapability(Boolean.TRUE.equals(request.getHasCrossingCapability()))
                        .ratingAvg(5.0)
                        .build();

        staff = mechanicRepository.save(staff);
        log.info(
                "Mechanic created with staff id: {} for garage: {}", staff.getId(), garage.getId());
        return mapToResponse(staff);
    }

    @Override
    @Transactional
    public List<MechanicStaffResponse> getMechanicsByGarage(User owner) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);
        List<MechanicStaff> list = mechanicRepository.findByGarageIdOrderByCreatedAtDesc(garage.getId());
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        for (MechanicStaff staff : list) {
            syncStatusWithShift(staff, now);
        }
        return list.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public List<MechanicStaffResponse> getMechanicsByGarageId(Long garageId) {
        List<MechanicStaff> list = mechanicRepository.findByGarageIdOrderByCreatedAtDesc(garageId);
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        for (MechanicStaff staff : list) {
            syncStatusWithShift(staff, now);
        }
        return list.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
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
        GarageAccess.requireApproved(garage);

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
            if (branch.getOperatingStatus() != BranchStatus.OPEN) {
                throw new BadRequestException("Chi nhánh đang tạm đóng cửa hoặc bảo trì, không thể phân bổ thợ vào lúc này!");
            }
            staff.setBranch(branch);
        }

        if (request.getShiftName() != null) {
            staff.setShiftName(request.getShiftName().trim());
            syncStatusWithShift(staff, LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        }

        staff = mechanicRepository.save(staff);
        return mapToResponse(staff);
    }

    @Override
    @Transactional
    public MechanicStaffResponse getMyProfile(User mechanicUser) {
        MechanicStaff staff =
                mechanicRepository
                        .findByUserId(mechanicUser.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa có hồ sơ thợ cứu hộ cho tài khoản này!"));
        syncStatusWithShift(staff, LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        return mapToResponse(staff);
    }

    @Override
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

        GarageAccess.requireApproved(staff.getGarage());

        if (staff.getBranch() == null) {
            throw new BadRequestException("Thợ chưa được phân bổ vào chi nhánh nào. Vui lòng liên hệ Chủ gara!");
        }

        if (request.getWorkingStatus() == MechanicStatus.AVAILABLE
                && staff.getBranch().getOperatingStatus() != BranchStatus.OPEN) {
            throw new BadRequestException("Chi nhánh '" + staff.getBranch().getBranchName()
                    + "' hiện đang tạm đóng cửa bảo trì, không thể bật nhận việc vào lúc này!");
        }

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

        if (request.getWorkingStatus() == MechanicStatus.OFFLINE) {
            staff.setManualOverride(true);
            staff.setPausedAt(LocalDateTime.now());
            staff.setPauseReason(
                    request.getPauseReason() != null && !request.getPauseReason().isBlank()
                            ? request.getPauseReason().trim()
                            : "Tạm nghỉ");
        } else if (request.getWorkingStatus() == MechanicStatus.AVAILABLE) {
            LocalTime nowTime = LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            boolean inShift = isWithinShift(staff.getShiftName(), nowTime);
            staff.setManualOverride(!inShift);
            staff.setPausedAt(null);
            staff.setPauseReason(null);
        }
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

    @Override
    @Transactional
    public MechanicStaffResponse setActive(User owner, Long staffId, boolean active) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara"));
        GarageAccess.requireApproved(garage);
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
        if (!active) {
            staff.setWorkingStatus(MechanicStatus.OFFLINE);
            staff = mechanicRepository.save(staff);
        }
        return mapToResponse(staff);
    }

    @Override
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
        GarageAccess.requireApproved(garage);

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
            if (branch.getOperatingStatus() != BranchStatus.OPEN) {
                throw new BadRequestException("Chi nhánh đích hiện đang đóng cửa hoặc bảo trì, không thể điều chuyển thợ tới chi nhánh này!");
            }
            staff.setBranch(branch);
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            staff.getUser().setFullName(request.getFullName().trim());
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String canonicalPhone = PhoneUtils.normalize(request.getPhone());
            if (!PhoneUtils.isValidVietnamesePhone(canonicalPhone)) {
                throw new BadRequestException("Số điện thoại không hợp lệ (yêu cầu 10 chữ số, ví dụ 0903123456)");
            }
            if (!canonicalPhone.equals(staff.getUser().getPhone())) {
                if (userRepository.existsByPhone(canonicalPhone)) {
                    throw new BadRequestException("Số điện thoại đã được đăng ký bởi tài khoản khác!");
                }
                staff.getUser().setPhone(canonicalPhone);
            }
        }

        if (request.getShiftName() != null) {
            staff.setShiftName(request.getShiftName().trim());
            syncStatusWithShift(staff, LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
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

    @Override
    @Transactional
    public String resetPassword(User owner, Long staffId) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

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

    @Override
    @Transactional
    public void removeMechanic(User owner, Long staffId) {
        Garage garage =
                garageRepository
                        .findByOwnerId(owner.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

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

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void syncAllMechanicsShiftStatuses() {
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        List<MechanicStaff> staffs = mechanicRepository.findAll();
        for (MechanicStaff staff : staffs) {
            syncStatusWithShift(staff, now);
        }
    }

    public void syncStatusWithShift(MechanicStaff staff, LocalTime now) {
        if (staff == null || staff.getUser() == null || !Boolean.TRUE.equals(staff.getUser().isActive())) {
            return;
        }
        if (staff.getWorkingStatus() == MechanicStatus.BUSY) {
            return;
        }

        // Tôn trọng quyết định tạm nghỉ hoặc tăng ca thủ công của thợ (BR-MECH-008)
        if (staff.isManualOverride()) {
            return;
        }

        boolean inShift = isWithinShift(staff.getShiftName(), now);
        MechanicStatus expected = inShift ? MechanicStatus.AVAILABLE : MechanicStatus.OFFLINE;
        if (staff.getWorkingStatus() != expected) {
            staff.setWorkingStatus(expected);
            mechanicRepository.save(staff);
            log.info(
                    "Mechanic staffId: {} ({}) status synchronized to {} based on shift '{}'",
                    staff.getId(),
                    staff.getUser().getFullName(),
                    expected,
                    staff.getShiftName());
        }
    }

    @Scheduled(fixedDelay = 120000)
    @Transactional
    public void autoOfflineStaleMechanics() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(10);
        List<MechanicStaff> staleMechanics = mechanicRepository.findAll().stream()
                .filter(m -> m.getWorkingStatus() == MechanicStatus.AVAILABLE)
                .filter(m -> {
                    LocalDateTime lastActive = m.getLastGpsUpdatedAt() != null
                            ? m.getLastGpsUpdatedAt()
                            : m.getLastHeartbeatAt();
                    return lastActive == null || lastActive.isBefore(threshold);
                })
                .toList();

        for (MechanicStaff staff : staleMechanics) {
            boolean hasActiveOrder = rescueOrderRepository.existsByMechanicStaffIdAndStatusIn(
                    staff.getId(), List.of(RescueOrderStatus.DISPATCHED, RescueOrderStatus.ARRIVED, RescueOrderStatus.IN_PROGRESS)
            );
            if (!hasActiveOrder) {
                staff.setWorkingStatus(MechanicStatus.OFFLINE);
                staff.setManualOverride(false);
                staff.setPauseReason("Tự động ngoại tuyến do mất tín hiệu định vị > 10 phút (BR-MECH-009)");
                mechanicRepository.save(staff);
                log.info("Mechanic staffId: {} ({}) auto-reaped to OFFLINE due to stale heartbeat",
                        staff.getId(), staff.getUser().getUsername());
            }
        }
    }

    public static boolean isWithinShift(String shiftName, LocalTime now) {
        if (shiftName == null || shiftName.isBlank()) {
            return false;
        }
        String trimmed = shiftName.trim();
        if (trimmed.contains("24/7") || trimmed.contains("24/24")) {
            return true;
        }

        Pattern pattern = Pattern.compile("(\\d{1,2}:\\d{2})\\s*[-–—]\\s*(\\d{1,2}:\\d{2})");
        Matcher matcher = pattern.matcher(trimmed);
        if (matcher.find()) {
            try {
                LocalTime start = LocalTime.parse(matcher.group(1));
                LocalTime end = LocalTime.parse(matcher.group(2));
                int currentMins = now.getHour() * 60 + now.getMinute();
                int startMins = start.getHour() * 60 + start.getMinute();
                int endMins = end.getHour() * 60 + end.getMinute();

                if (startMins <= endMins) {
                    return currentMins >= startMins && currentMins < endMins;
                } else {
                    // Overnight crosses midnight, e.g. 22:00 - 06:00
                    return currentMins >= startMins || currentMins < endMins;
                }
            } catch (Exception e) {
                log.warn("Failed to parse shift time for '{}': {}", shiftName, e.getMessage());
            }
        }

        // Fallback for keyword-based names without explicit time range
        String lower = trimmed.toLowerCase(Locale.ROOT);
        int currentHour = now.getHour();
        if (lower.contains("sáng")) {
            return currentHour >= 6 && currentHour < 14;
        }
        if (lower.contains("chiều")) {
            return currentHour >= 14 && currentHour < 22;
        }
        if (lower.contains("đêm") || lower.contains("tối")) {
            return currentHour >= 22 || currentHour < 6;
        }
        if (lower.contains("hành chính")) {
            return currentHour >= 8 && currentHour < 17;
        }

        return false;
    }

    @Override
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
                .branchOperatingStatus(staff.getBranch() != null ? staff.getBranch().getOperatingStatus() : null)
                .isManualOverride(staff.isManualOverride())
                .pausedAt(staff.getPausedAt())
                .pauseReason(staff.getPauseReason())
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

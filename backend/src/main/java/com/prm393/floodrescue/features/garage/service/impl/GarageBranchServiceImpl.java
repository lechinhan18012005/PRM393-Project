package com.prm393.floodrescue.features.garage.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.common.utils.PhoneUtils;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.CreateBranchRequest;
import com.prm393.floodrescue.features.garage.dto.GarageBranchResponse;
import com.prm393.floodrescue.features.garage.dto.UpdateBranchRequest;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.service.GarageAccess;
import com.prm393.floodrescue.features.garage.service.GarageBranchService;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GarageBranchServiceImpl implements GarageBranchService {

    private final GarageBranchRepository branchRepository;
    private final GarageRepository garageRepository;
    private final MechanicStaffRepository mechanicRepository;

    @Override
    @Transactional(readOnly = true)
    public List<GarageBranchResponse> getBranchesByCurrentUser(User user) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);
        return branchRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId()).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GarageBranchResponse> getBranchesByGarageId(Long garageId) {
        return branchRepository.findByGarageIdOrderByCreatedAtAsc(garageId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public GarageBranchResponse createBranch(User user, CreateBranchRequest request) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

        String branchName = request.getBranchName().trim();
        if (branchRepository.existsByGarageIdAndBranchNameIgnoreCase(garage.getId(), branchName)) {
            throw new BadRequestException("Chi nhánh '" + branchName + "' đã tồn tại trong gara của bạn!");
        }

        validateCoordinates(request.getLatitude(), request.getLongitude());

        String phoneNumber = null;
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            phoneNumber = PhoneUtils.normalize(request.getPhoneNumber());
            if (!PhoneUtils.isValidVietnamesePhone(phoneNumber)) {
                throw new BadRequestException("Số điện thoại hotline chi nhánh không hợp lệ (yêu cầu 10 chữ số)!");
            }
        } else {
            phoneNumber = garage.getPhone();
        }

        GarageBranch branch =
                GarageBranch.builder()
                        .garage(garage)
                        .branchName(branchName)
                        .address(request.getAddress().trim())
                        .latitude(request.getLatitude())
                        .longitude(request.getLongitude())
                        .phoneNumber(phoneNumber)
                        .rescueVehicles(request.getRescueVehicles() != null ? request.getRescueVehicles().trim() : null)
                        .operatingStatus(BranchStatus.OPEN)
                        .build();

        branch = branchRepository.save(branch);
        log.info("New branch created with id: {} for garage: {}", branch.getId(), garage.getId());
        return mapToResponse(branch);
    }

    @Override
    @Transactional
    public GarageBranchResponse updateBranch(
            User user, Long branchId, UpdateBranchRequest request) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

        GarageBranch branch =
                branchRepository
                        .findById(branchId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy chi nhánh với id: " + branchId));

        if (!branch.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException(
                    "Chi nhánh không thuộc quyền quản lý của garage bạn!");
        }

        if (request.getBranchName() != null && !request.getBranchName().isBlank()) {
            String newBranchName = request.getBranchName().trim();
            if (branchRepository.existsByGarageIdAndBranchNameIgnoreCaseAndIdNot(garage.getId(), newBranchName, branchId)) {
                throw new BadRequestException("Chi nhánh '" + newBranchName + "' đã tồn tại trong gara của bạn!");
            }
            branch.setBranchName(newBranchName);
        }

        if (request.getAddress() != null && !request.getAddress().isBlank()) {
            branch.setAddress(request.getAddress().trim());
        }

        if (request.getLatitude() != null || request.getLongitude() != null) {
            double lat = request.getLatitude() != null ? request.getLatitude() : branch.getLatitude();
            double lng = request.getLongitude() != null ? request.getLongitude() : branch.getLongitude();
            validateCoordinates(lat, lng);
            branch.setLatitude(lat);
            branch.setLongitude(lng);
        }

        if (request.getPhoneNumber() != null) {
            if (!request.getPhoneNumber().isBlank()) {
                String normalizedPhone = PhoneUtils.normalize(request.getPhoneNumber());
                if (!PhoneUtils.isValidVietnamesePhone(normalizedPhone)) {
                    throw new BadRequestException("Số điện thoại hotline chi nhánh không hợp lệ (yêu cầu 10 chữ số)!");
                }
                branch.setPhoneNumber(normalizedPhone);
            } else {
                branch.setPhoneNumber(null);
            }
        }

        if (request.getRescueVehicles() != null) {
            branch.setRescueVehicles(request.getRescueVehicles().trim());
        }

        if (request.getOperatingStatus() != null) {
            branch.setOperatingStatus(request.getOperatingStatus());
        }

        branch = branchRepository.save(branch);
        return mapToResponse(branch);
    }

    @Override
    @Transactional
    public GarageBranchResponse toggleBranchStatus(User user, Long branchId, BranchStatus status) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy garage của tài khoản này!"));
        GarageAccess.requireApproved(garage);

        GarageBranch branch =
                branchRepository
                        .findById(branchId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy chi nhánh với id: " + branchId));

        if (!branch.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException(
                    "Chi nhánh không thuộc quyền quản lý của garage bạn!");
        }

        BranchStatus targetStatus =
                status != null
                        ? status
                        : (branch.getOperatingStatus() == BranchStatus.OPEN
                                ? BranchStatus.CLOSED_MAINTENANCE
                                : BranchStatus.OPEN);
        branch.setOperatingStatus(targetStatus);
        branch = branchRepository.save(branch);
        return mapToResponse(branch);
    }

    private void validateCoordinates(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw new BadRequestException("Tọa độ GPS vĩ độ và kinh độ là bắt buộc!");
        }
        if (Double.isNaN(latitude) || Double.isInfinite(latitude) || latitude < -90.0 || latitude > 90.0) {
            throw new BadRequestException("Tọa độ vĩ độ không hợp lệ (phải trong khoảng từ -90 đến 90 độ)!");
        }
        if (Double.isNaN(longitude) || Double.isInfinite(longitude) || longitude < -180.0 || longitude > 180.0) {
            throw new BadRequestException("Tọa độ kinh độ không hợp lệ (phải trong khoảng từ -180 đến 180 độ)!");
        }
        // Kiểm tra phạm vi lãnh thổ & vùng biển Việt Nam (Vĩ độ ~6.0 đến 24.5, Kinh độ ~101.5 đến 118.0)
        if (latitude < 6.0 || latitude > 24.5 || longitude < 101.5 || longitude > 118.0) {
            log.warn("Branch coordinates ({}, {}) are outside standard Vietnam territory boundaries", latitude, longitude);
            throw new BadRequestException(
                    "Tọa độ GPS nằm ngoài phạm vi hoạt động tại Việt Nam (Vĩ độ: 6.0 - 24.5, Kinh độ: 101.5 - 118.0)!");
        }
    }

    @Override
    public GarageBranchResponse mapToResponse(GarageBranch branch) {
        int mechanicsCount = mechanicRepository.findByBranchId(branch.getId()).size();

        return GarageBranchResponse.builder()
                .id(branch.getId())
                .garageId(branch.getGarage().getId())
                .garageName(branch.getGarage().getGarageName())
                .branchName(branch.getBranchName())
                .address(branch.getAddress())
                .latitude(branch.getLatitude())
                .longitude(branch.getLongitude())
                .phoneNumber(branch.getPhoneNumber())
                .rescueVehicles(branch.getRescueVehicles())
                .operatingStatus(branch.getOperatingStatus())
                .createdAt(branch.getCreatedAt())
                .mechanicsCount(mechanicsCount)
                .build();
    }
}

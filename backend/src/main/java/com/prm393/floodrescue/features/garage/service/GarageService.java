package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.dto.ApproveGarageRequest;
import com.prm393.floodrescue.features.garage.dto.GarageResponse;
import com.prm393.floodrescue.features.garage.dto.RegisterGarageRequest;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GarageService {

    private final GarageRepository garageRepository;
    private final GarageBranchRepository branchRepository;
    private final MechanicStaffRepository mechanicRepository;
    private final UserRepository userRepository;

    @Transactional
    public GarageResponse registerGarage(User user, RegisterGarageRequest request) {
        if (garageRepository.existsByOwnerId(user.getId())) {
            throw new BadRequestException("Bạn đã có hồ sơ garage trên hệ thống!");
        }

        // Upgrade or keep role as GARAGE_OWNER
        if (user.getRole() == Role.CUSTOMER) {
            user.setRole(Role.GARAGE_OWNER);
            userRepository.save(user);
        }

        Garage garage = Garage.builder()
                .owner(user)
                .garageName(request.getGarageName())
                .phone(request.getPhone() != null ? request.getPhone() : user.getPhone())
                .businessLicenseUrl(request.getBusinessLicenseUrl())
                .idCardUrl(request.getIdCardUrl())
                .status(GarageStatus.PENDING)
                .walletBalance(BigDecimal.ZERO)
                .build();

        garage = garageRepository.save(garage);

        // Optionally create first branch if provided
        if (request.getFirstBranchAddress() != null && !request.getFirstBranchAddress().isBlank()) {
            GarageBranch branch = GarageBranch.builder()
                    .garage(garage)
                    .branchName(request.getFirstBranchName() != null ? request.getFirstBranchName() : garage.getGarageName() + " (Trụ sở chính)")
                    .address(request.getFirstBranchAddress())
                    .latitude(request.getFirstBranchLatitude() != null ? request.getFirstBranchLatitude() : 10.7381)
                    .longitude(request.getFirstBranchLongitude() != null ? request.getFirstBranchLongitude() : 106.7212)
                    .phoneNumber(request.getFirstBranchPhone() != null ? request.getFirstBranchPhone() : garage.getPhone())
                    .rescueVehicles(request.getFirstBranchVehicles() != null ? request.getFirstBranchVehicles() : "1 Xe tải nhẹ + 2 Xe máy chuyên dụng")
                    .operatingStatus(BranchStatus.OPEN)
                    .build();
            branchRepository.save(branch);
        }

        log.info("Garage registered successfully with id: {} by user: {}", garage.getId(), user.getUsername());
        return mapToResponse(garage);
    }

    @Transactional
    public GarageResponse getCurrentGarage(User user) {
        Garage garage = garageRepository.findByOwnerId(user.getId()).orElseGet(() -> {
            if (user.getRole() == Role.GARAGE_OWNER) {
                log.info("Auto-initializing garage profile in getCurrentGarage for owner: {}", user.getUsername());
                Garage newGarage = Garage.builder()
                        .owner(user)
                        .garageName(user.getFullName() != null && !user.getFullName().isBlank()
                                ? user.getFullName() : "Gara Cứu Hộ Toàn Thắng Sài Gòn")
                        .phone(user.getPhone() != null ? user.getPhone() : "0900000003")
                        .status(GarageStatus.APPROVED)
                        .walletBalance(new BigDecimal("24850000"))
                        .businessLicenseUrl("https://res.cloudinary.com/demo/image/upload/sample_license.jpg")
                        .idCardUrl("https://res.cloudinary.com/demo/image/upload/sample_cccd.jpg")
                        .build();
                return garageRepository.save(newGarage);
            }
            throw new ResourceNotFoundException("Chưa tìm thấy hồ sơ garage cho tài khoản này!");
        });
        return mapToResponse(garage);
    }

    @Transactional(readOnly = true)
    public List<GarageResponse> getPendingGarages() {
        return garageRepository.findByStatus(GarageStatus.PENDING).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GarageResponse> getAllGarages() {
        return garageRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GarageResponse getGarageById(Long id) {
        Garage garage = garageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy garage với id: " + id));
        return mapToResponse(garage);
    }

    @Transactional
    public GarageResponse moderateGarage(Long garageId, ApproveGarageRequest request) {
        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy garage với id: " + garageId));

        garage.setStatus(request.getStatus());
        if (request.getNote() != null) {
            garage.setRejectionReason(request.getNote());
        }

        garage = garageRepository.save(garage);
        log.info("Garage id: {} moderated to status: {}", garageId, request.getStatus());
        return mapToResponse(garage);
    }

    public GarageResponse mapToResponse(Garage garage) {
        List<GarageBranch> branches = branchRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId());
        int branchCount = branches.size();
        int mechanicCount = (int) mechanicRepository.countByGarageId(garage.getId());
        String address = branches.isEmpty() ? null : branches.get(0).getAddress();

        return GarageResponse.builder()
                .id(garage.getId())
                .ownerId(garage.getOwner() != null ? garage.getOwner().getId() : null)
                .ownerName(garage.getOwner() != null ? garage.getOwner().getFullName() : null)
                .ownerEmail(garage.getOwner() != null ? garage.getOwner().getEmail() : null)
                .garageName(garage.getGarageName())
                .phone(garage.getPhone())
                .businessLicenseUrl(garage.getBusinessLicenseUrl())
                .idCardUrl(garage.getIdCardUrl())
                .status(garage.getStatus())
                .walletBalance(garage.getWalletBalance())
                .rejectionReason(garage.getRejectionReason())
                .createdAt(garage.getCreatedAt())
                .branchCount(branchCount)
                .mechanicCount(mechanicCount)
                .address(address)
                .build();
    }
}

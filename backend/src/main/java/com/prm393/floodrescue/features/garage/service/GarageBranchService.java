package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.CreateBranchRequest;
import com.prm393.floodrescue.features.garage.dto.GarageBranchResponse;
import com.prm393.floodrescue.features.garage.dto.UpdateBranchRequest;
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
public class GarageBranchService {

    private final GarageBranchRepository branchRepository;
    private final GarageRepository garageRepository;
    private final MechanicStaffRepository mechanicRepository;

    @Transactional
    public Garage getOrCreateGarageForOwner(User user) {
        return garageRepository.findByOwnerId(user.getId()).orElseGet(() -> {
            log.info("Auto-initializing garage profile for garage owner: {}", user.getUsername());
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
            newGarage = garageRepository.save(newGarage);

            GarageBranch branch1 = GarageBranch.builder()
                    .garage(newGarage)
                    .branchName("Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)")
                    .address("85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7, TP.HCM")
                    .latitude(10.7380)
                    .longitude(106.7210)
                    .phoneNumber("0903111222")
                    .rescueVehicles("1 Xe tải nhẹ + 2 Xe máy chuyên dụng")
                    .operatingStatus(BranchStatus.OPEN)
                    .build();
            branchRepository.save(branch1);

            GarageBranch branch2 = GarageBranch.builder()
                    .garage(newGarage)
                    .branchName("Chi nhánh 2 (Q.8 - Phạm Thế Hiển)")
                    .address("340 Phạm Thế Hiển, Phường 3, Quận 8, TP.HCM")
                    .latitude(10.7420)
                    .longitude(106.6850)
                    .phoneNumber("0903111333")
                    .rescueVehicles("2 Xe máy cứu hộ ngập")
                    .operatingStatus(BranchStatus.OPEN)
                    .build();
            branchRepository.save(branch2);

            return newGarage;
        });
    }

    @Transactional
    public List<GarageBranchResponse> getBranchesByCurrentUser(User user) {
        Garage garage = getOrCreateGarageForOwner(user);
        List<GarageBranch> branches = branchRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId());

        // If branches are empty, create a starter branch so user can immediately manage
        if (branches.isEmpty()) {
            GarageBranch branch = GarageBranch.builder()
                    .garage(garage)
                    .branchName("Chi nhánh 1 (Trụ sở chính)")
                    .address("85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7, TP.HCM")
                    .latitude(10.7380)
                    .longitude(106.7210)
                    .phoneNumber(garage.getPhone() != null ? garage.getPhone() : "0903111222")
                    .rescueVehicles("1 Xe tải nhẹ + 2 Xe máy chuyên dụng")
                    .operatingStatus(BranchStatus.OPEN)
                    .build();
            branch = branchRepository.save(branch);
            branches = List.of(branch);
        }

        return branches.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GarageBranchResponse> getBranchesByGarageId(Long garageId) {
        return branchRepository.findByGarageIdOrderByCreatedAtAsc(garageId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public GarageBranchResponse createBranch(User user, CreateBranchRequest request) {
        Garage garage = getOrCreateGarageForOwner(user);

        GarageBranch branch = GarageBranch.builder()
                .garage(garage)
                .branchName(request.getBranchName())
                .address(request.getAddress())
                .latitude(request.getLatitude() != null ? request.getLatitude() : 10.7380)
                .longitude(request.getLongitude() != null ? request.getLongitude() : 106.7210)
                .phoneNumber(request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()
                        ? request.getPhoneNumber() : garage.getPhone())
                .rescueVehicles(request.getRescueVehicles() != null && !request.getRescueVehicles().isBlank()
                        ? request.getRescueVehicles() : "1 Xe tải nhẹ + 2 Xe máy chuyên dụng")
                .operatingStatus(BranchStatus.OPEN)
                .build();

        branch = branchRepository.save(branch);
        log.info("New branch created with id: {} for garage: {}", branch.getId(), garage.getId());
        return mapToResponse(branch);
    }

    @Transactional
    public GarageBranchResponse updateBranch(User user, Long branchId, UpdateBranchRequest request) {
        Garage garage = getOrCreateGarageForOwner(user);

        GarageBranch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với id: " + branchId));

        if (!branch.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException("Chi nhánh không thuộc quyền quản lý của garage bạn!");
        }

        if (request.getBranchName() != null) branch.setBranchName(request.getBranchName());
        if (request.getAddress() != null) branch.setAddress(request.getAddress());
        if (request.getLatitude() != null) branch.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) branch.setLongitude(request.getLongitude());
        if (request.getPhoneNumber() != null) branch.setPhoneNumber(request.getPhoneNumber());
        if (request.getRescueVehicles() != null) branch.setRescueVehicles(request.getRescueVehicles());
        if (request.getOperatingStatus() != null) branch.setOperatingStatus(request.getOperatingStatus());

        branch = branchRepository.save(branch);
        return mapToResponse(branch);
    }

    @Transactional
    public GarageBranchResponse toggleBranchStatus(User user, Long branchId, BranchStatus status) {
        Garage garage = getOrCreateGarageForOwner(user);

        GarageBranch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với id: " + branchId));

        if (!branch.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException("Chi nhánh không thuộc quyền quản lý của garage bạn!");
        }

        BranchStatus targetStatus = (status != null)
                ? status
                : (branch.getOperatingStatus() == BranchStatus.OPEN ? BranchStatus.CLOSED_MAINTENANCE : BranchStatus.OPEN);

        branch.setOperatingStatus(targetStatus);
        branch = branchRepository.save(branch);
        log.info("Toggled branch {} status to {}", branch.getId(), branch.getOperatingStatus());
        return mapToResponse(branch);
    }

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

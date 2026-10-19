package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.CreateBranchRequest;
import com.prm393.floodrescue.features.garage.dto.GarageBranchResponse;
import com.prm393.floodrescue.features.garage.dto.UpdateBranchRequest;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GarageBranchService {

    private final GarageBranchRepository branchRepository;
    private final GarageRepository garageRepository;
    private final MechanicStaffRepository mechanicRepository;

    @Transactional(readOnly = true)
    public List<GarageBranchResponse> getBranchesByCurrentUser(User user) {
        Garage garage = garageRepository.findByOwnerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));
        return branchRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId()).stream()
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
        Garage garage = garageRepository.findByOwnerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));

        GarageBranch branch = GarageBranch.builder()
                .garage(garage)
                .branchName(request.getBranchName())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber() : garage.getPhone())
                .rescueVehicles(request.getRescueVehicles())
                .operatingStatus(BranchStatus.OPEN)
                .build();

        branch = branchRepository.save(branch);
        log.info("New branch created with id: {} for garage: {}", branch.getId(), garage.getId());
        return mapToResponse(branch);
    }

    @Transactional
    public GarageBranchResponse updateBranch(User user, Long branchId, UpdateBranchRequest request) {
        Garage garage = garageRepository.findByOwnerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));

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
        Garage garage = garageRepository.findByOwnerId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa tìm thấy garage của tài khoản này!"));

        GarageBranch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với id: " + branchId));

        if (!branch.getGarage().getId().equals(garage.getId())) {
            throw new ResourceNotFoundException("Chi nhánh không thuộc quyền quản lý của garage bạn!");
        }

        branch.setOperatingStatus(status);
        branch = branchRepository.save(branch);
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

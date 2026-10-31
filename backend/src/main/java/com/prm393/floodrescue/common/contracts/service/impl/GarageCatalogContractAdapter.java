package com.prm393.floodrescue.common.contracts.service.impl;

import com.prm393.floodrescue.common.contracts.dto.GarageBranchSnapshot;
import com.prm393.floodrescue.common.contracts.dto.GarageOwnerContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.GarageServiceSnapshot;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;
import com.prm393.floodrescue.common.contracts.service.GarageCatalogLookup;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GarageCatalogContractAdapter implements GarageCatalogLookup {
    private final ServiceItemRepository serviceItemRepository;
    private final MechanicStaffRepository mechanicStaffRepository;
    private final GarageRepository garageRepository;
    private final GarageBranchRepository branchRepository;

    @Override
    public GarageServiceSnapshot getRequiredActiveService(Long serviceId, Long garageId) {
        ServiceItem service = serviceItemRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ: " + serviceId));
        if (!service.getGarage().getId().equals(garageId)) {
            throw new BadRequestException("Dịch vụ không thuộc garage của đơn cứu hộ");
        }
        if (service.isDeleted() || !service.isActive()) {
            throw new BadRequestException("Dịch vụ đã ngừng kinh doanh hoặc tạm dừng phục vụ");
        }
        return toSnapshot(service);
    }

    @Override
    public List<GarageServiceSnapshot> getActiveServices(Long garageId) {
        return serviceItemRepository.findByGarageIdAndActiveTrueAndDeletedFalseOrderByCreatedAtAsc(garageId)
                .stream()
                .map(this::toSnapshot)
                .toList();
    }

    @Override
    public MechanicContextSnapshot getRequiredMechanicContext(Long mechanicUserId) {
        MechanicStaff mechanic = mechanicStaffRepository.findByUserId(mechanicUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ thợ cứu hộ"));
        return toSnapshot(mechanic);
    }

    @Override
    public MechanicContextSnapshot getRequiredMechanicByStaffId(Long mechanicStaffId) {
        MechanicStaff mechanic = mechanicStaffRepository.findById(mechanicStaffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ thợ cứu hộ"));
        return toSnapshot(mechanic);
    }

    @Override
    public GarageOwnerContextSnapshot getRequiredGarageOwnerContext(Long ownerUserId) {
        Garage garage = garageRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy garage của chủ sở hữu"));
        return GarageOwnerContextSnapshot.builder()
                .garageId(garage.getId())
                .approved(garage.getStatus() == GarageStatus.APPROVED)
                .build();
    }

    @Override
    public GarageBranchSnapshot getRequiredBranch(Long branchId, Long garageId) {
        GarageBranch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh"));
        if (!branch.getGarage().getId().equals(garageId)) {
            throw new BadRequestException("Chi nhánh không thuộc garage này");
        }
        return GarageBranchSnapshot.builder()
                .branchId(branch.getId())
                .garageId(garageId)
                .branchName(branch.getBranchName())
                .address(branch.getAddress())
                .open(branch.getOperatingStatus() == BranchStatus.OPEN)
                .build();
    }

    private GarageServiceSnapshot toSnapshot(ServiceItem service) {
        return GarageServiceSnapshot.builder()
                .serviceId(service.getId())
                .garageId(service.getGarage().getId())
                .serviceName(service.getServiceName())
                .description(service.getDescription())
                .serviceType(service.getServiceType())
                .itemCategoryType(service.getItemCategoryType())
                .applicableVehicleType(service.getApplicableVehicleType())
                .standardPrice(service.getStandardPrice())
                .minPrice(service.getMinPrice())
                .maxPrice(service.getMaxPrice())
                .active(service.isActive() && !service.isDeleted())
                .build();
    }

    private MechanicContextSnapshot toSnapshot(MechanicStaff mechanic) {
        GarageBranch branch = mechanic.getBranch();
        return MechanicContextSnapshot.builder()
                .userId(mechanic.getUser().getId())
                .mechanicStaffId(mechanic.getId())
                .garageId(mechanic.getGarage().getId())
                .branchId(branch == null ? null : branch.getId())
                .garageApproved(mechanic.getGarage().getStatus() == GarageStatus.APPROVED)
                .branchOpen(branch != null && branch.getOperatingStatus() == BranchStatus.OPEN)
                .build();
    }
}

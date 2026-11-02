package com.prm393.floodrescue.common.contracts.service;

import com.prm393.floodrescue.common.contracts.dto.GarageBranchSnapshot;
import com.prm393.floodrescue.common.contracts.dto.GarageOwnerContextSnapshot;
import com.prm393.floodrescue.common.contracts.dto.GarageServiceSnapshot;
import com.prm393.floodrescue.common.contracts.dto.MechanicContextSnapshot;

import java.util.List;

public interface GarageCatalogLookup {
    GarageServiceSnapshot getRequiredActiveService(Long serviceId, Long garageId);

    List<GarageServiceSnapshot> getActiveServices(Long garageId);

    MechanicContextSnapshot getRequiredMechanicContext(Long mechanicUserId);

    MechanicContextSnapshot getRequiredMechanicByStaffId(Long mechanicStaffId);

    GarageOwnerContextSnapshot getRequiredGarageOwnerContext(Long ownerUserId);

    GarageBranchSnapshot getRequiredBranch(Long branchId, Long garageId);
}

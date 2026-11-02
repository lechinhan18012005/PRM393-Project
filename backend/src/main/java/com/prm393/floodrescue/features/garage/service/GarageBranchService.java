package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.CreateBranchRequest;
import com.prm393.floodrescue.features.garage.dto.GarageBranchResponse;
import com.prm393.floodrescue.features.garage.dto.UpdateBranchRequest;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;

import java.util.List;

public interface GarageBranchService {

    List<GarageBranchResponse> getBranchesByCurrentUser(User user);

    List<GarageBranchResponse> getBranchesByGarageId(Long garageId);

    GarageBranchResponse createBranch(User user, CreateBranchRequest request);

    GarageBranchResponse updateBranch(User user, Long branchId, UpdateBranchRequest request);

    GarageBranchResponse toggleBranchStatus(User user, Long branchId, BranchStatus status);

    GarageBranchResponse mapToResponse(GarageBranch branch);
}

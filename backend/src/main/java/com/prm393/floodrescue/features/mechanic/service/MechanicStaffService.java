package com.prm393.floodrescue.features.mechanic.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.dto.AllocateBranchRequest;
import com.prm393.floodrescue.features.mechanic.dto.CreateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.dto.MechanicStaffResponse;
import com.prm393.floodrescue.features.mechanic.dto.ToggleMechanicStatusRequest;
import com.prm393.floodrescue.features.mechanic.dto.UpdateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;

import java.util.List;

public interface MechanicStaffService {

    MechanicStaffResponse createMechanic(User owner, CreateMechanicRequest request);

    List<MechanicStaffResponse> getMechanicsByGarage(User owner);

    List<MechanicStaffResponse> getMechanicsByGarageId(Long garageId);

    MechanicStaffResponse allocateBranch(User owner, Long staffId, AllocateBranchRequest request);

    MechanicStaffResponse getMyProfile(User mechanicUser);

    MechanicStaffResponse toggleStatus(User mechanicUser, ToggleMechanicStatusRequest request);

    MechanicStaffResponse setActive(User owner, Long staffId, boolean active);

    MechanicStaffResponse updateMechanic(User owner, Long staffId, UpdateMechanicRequest request);

    String resetPassword(User owner, Long staffId);

    void removeMechanic(User owner, Long staffId);

    MechanicStaffResponse mapToResponse(MechanicStaff staff);
}

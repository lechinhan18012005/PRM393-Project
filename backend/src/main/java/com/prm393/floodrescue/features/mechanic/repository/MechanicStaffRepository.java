package com.prm393.floodrescue.features.mechanic.repository;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MechanicStaffRepository extends JpaRepository<MechanicStaff, Long> {
    Optional<MechanicStaff> findByUserId(Long userId);
    List<MechanicStaff> findByGarageIdOrderByCreatedAtDesc(Long garageId);
    List<MechanicStaff> findByBranchId(Long branchId);
    List<MechanicStaff> findByWorkingStatus(MechanicStatus status);
    long countByGarageId(Long garageId);
    long countByGarageIdAndWorkingStatus(Long garageId, MechanicStatus status);
}

package com.prm393.floodrescue.features.garage.repository;

import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageBranchRepository extends JpaRepository<GarageBranch, Long> {
    List<GarageBranch> findByGarageIdOrderByCreatedAtAsc(Long garageId);
    List<GarageBranch> findByOperatingStatus(BranchStatus status);
    boolean existsByGarageIdAndBranchNameIgnoreCase(Long garageId, String branchName);
    boolean existsByGarageIdAndBranchNameIgnoreCaseAndIdNot(Long garageId, String branchName, Long id);
}

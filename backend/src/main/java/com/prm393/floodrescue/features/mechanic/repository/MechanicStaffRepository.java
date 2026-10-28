package com.prm393.floodrescue.features.mechanic.repository;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MechanicStaffRepository extends JpaRepository<MechanicStaff, Long> {
    Optional<MechanicStaff> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MechanicStaff m WHERE m.user.id = :userId")
    Optional<MechanicStaff> findByUserIdWithLock(@Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MechanicStaff m WHERE m.id = :id")
    Optional<MechanicStaff> findByIdWithLock(@Param("id") Long id);

    List<MechanicStaff> findByGarageIdOrderByCreatedAtDesc(Long garageId);
    List<MechanicStaff> findByBranchId(Long branchId);
    List<MechanicStaff> findByWorkingStatus(MechanicStatus status);
    long countByGarageId(Long garageId);
    long countByGarageIdAndWorkingStatus(Long garageId, MechanicStatus status);
}

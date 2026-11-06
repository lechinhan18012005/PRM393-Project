package com.prm393.floodrescue.features.mechanic.repository;

import com.prm393.floodrescue.features.mechanic.entity.MechanicStatusLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MechanicStatusLogRepository extends JpaRepository<MechanicStatusLog, Long> {

    List<MechanicStatusLog> findByMechanicStaffIdAndCreatedAtBetweenOrderByCreatedAtAsc(
            Long mechanicStaffId, LocalDateTime start, LocalDateTime end);

    List<MechanicStatusLog> findByGarageIdAndCreatedAtBetweenOrderByCreatedAtAsc(
            Long garageId, LocalDateTime start, LocalDateTime end);

    Page<MechanicStatusLog> findByGarageIdOrderByCreatedAtDesc(Long garageId, Pageable pageable);

    @Query("SELECT l FROM MechanicStatusLog l WHERE l.garage.id = :garageId " +
           "AND (:staffId IS NULL OR l.mechanicStaff.id = :staffId) " +
           "AND l.createdAt >= :startDate AND l.createdAt <= :endDate " +
           "ORDER BY l.createdAt ASC")
    List<MechanicStatusLog> findLogsForAttendance(
            @Param("garageId") Long garageId,
            @Param("staffId") Long staffId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
}

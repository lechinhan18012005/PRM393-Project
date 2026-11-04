package com.prm393.floodrescue.features.floodmap.repository;

import com.prm393.floodrescue.features.floodmap.entity.FloodReportPoint;
import com.prm393.floodrescue.features.floodmap.entity.FloodStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FloodReportRepository extends JpaRepository<FloodReportPoint, Long> {
    List<FloodReportPoint> findByModerationStatusOrderByCreatedAtDesc(FloodStatus status);
    List<FloodReportPoint> findByModerationStatusAndCreatedAtAfterOrderByCreatedAtDesc(FloodStatus status, java.time.LocalDateTime since);
    List<FloodReportPoint> findByModerationStatusAndUpdatedAtBefore(FloodStatus status, java.time.LocalDateTime threshold);
    List<FloodReportPoint> findByCreatedAtAfter(java.time.LocalDateTime since);
    List<FloodReportPoint> findAllByOrderByCreatedAtDesc();
    List<FloodReportPoint> findByReportedByIdOrderByCreatedAtDesc(Long userId);
}

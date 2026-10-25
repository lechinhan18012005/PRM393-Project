package com.prm393.floodrescue.features.rescue.repository;

import com.prm393.floodrescue.features.rescue.entity.RescueOrderAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RescueOrderAuditRepository extends JpaRepository<RescueOrderAudit, Long> {
    List<RescueOrderAudit> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}

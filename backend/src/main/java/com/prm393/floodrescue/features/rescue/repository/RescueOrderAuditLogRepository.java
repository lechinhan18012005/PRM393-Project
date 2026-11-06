package com.prm393.floodrescue.features.rescue.repository;

import com.prm393.floodrescue.features.rescue.entity.RescueOrderAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RescueOrderAuditLogRepository extends JpaRepository<RescueOrderAuditLog, Long> {

    List<RescueOrderAuditLog> findByOrderIdOrderByCreatedAtAsc(Long orderId);

    List<RescueOrderAuditLog> findByOrderCodeOrderByCreatedAtAsc(String orderCode);
}

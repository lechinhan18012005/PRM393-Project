package com.prm393.floodrescue.features.execution.repository;

import com.prm393.floodrescue.features.execution.entity.ServiceExecutionRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceExecutionRecordRepository extends JpaRepository<ServiceExecutionRecord, Long> {
    List<ServiceExecutionRecord> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}

package com.prm393.floodrescue.features.finance.repository;

import com.prm393.floodrescue.features.finance.entity.DisputeStatus;
import com.prm393.floodrescue.features.finance.entity.ServiceDispute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceDisputeRepository extends JpaRepository<ServiceDispute, Long> {
    List<ServiceDispute> findAllByOrderByCreatedAtDesc();
    List<ServiceDispute> findByStatusOrderByCreatedAtDesc(DisputeStatus status);
    List<ServiceDispute> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<ServiceDispute> findByRescueOrderIdOrderByCreatedAtDesc(Long rescueOrderId);
    boolean existsByRescueOrderIdAndStatusIn(Long rescueOrderId, List<DisputeStatus> statuses);
}

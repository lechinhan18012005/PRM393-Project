package com.prm393.floodrescue.features.finance.repository;

import com.prm393.floodrescue.features.finance.entity.CommissionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommissionConfigRepository extends JpaRepository<CommissionConfig, Long> {
    Optional<CommissionConfig> findFirstByActiveTrueOrderByCreatedAtDesc();
    List<CommissionConfig> findAllByOrderByCreatedAtDesc();
}

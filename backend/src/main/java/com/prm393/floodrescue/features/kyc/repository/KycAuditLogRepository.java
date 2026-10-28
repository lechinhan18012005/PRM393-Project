package com.prm393.floodrescue.features.kyc.repository;

import com.prm393.floodrescue.features.kyc.entity.KycAuditAction;
import com.prm393.floodrescue.features.kyc.entity.KycAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KycAuditLogRepository extends JpaRepository<KycAuditLog, Long> {
    List<KycAuditLog> findByGarageIdOrderByCreatedAtDesc(Long garageId);
    Page<KycAuditLog> findByActionOrderByCreatedAtDesc(KycAuditAction action, Pageable pageable);
}

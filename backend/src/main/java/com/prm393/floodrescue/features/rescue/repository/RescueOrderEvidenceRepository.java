package com.prm393.floodrescue.features.rescue.repository;

import com.prm393.floodrescue.features.rescue.entity.RescueOrderEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RescueOrderEvidenceRepository extends JpaRepository<RescueOrderEvidence, Long> {
    List<RescueOrderEvidence> findByRescueOrderId(Long rescueOrderId);

    boolean existsByRescueOrderIdAndUploadedByIdAndFileUrl(Long rescueOrderId, Long uploadedById, String fileUrl);

    boolean existsByRescueOrderIdAndFileUrl(Long rescueOrderId, String fileUrl);
}

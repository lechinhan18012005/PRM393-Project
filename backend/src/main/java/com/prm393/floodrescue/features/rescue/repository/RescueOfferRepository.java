package com.prm393.floodrescue.features.rescue.repository;

import com.prm393.floodrescue.features.rescue.entity.RescueOffer;
import com.prm393.floodrescue.features.rescue.entity.RescueOfferStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RescueOfferRepository extends JpaRepository<RescueOffer, Long> {

    List<RescueOffer> findByRescueOrderIdOrderByCreatedAtAsc(Long rescueOrderId);

    Optional<RescueOffer> findFirstByRescueOrderIdAndStatus(Long rescueOrderId, RescueOfferStatus status);

    List<RescueOffer> findByMechanicStaffIdAndStatusOrderByOfferedAtDesc(
            Long mechanicStaffId, RescueOfferStatus status);

    Optional<RescueOffer> findByIdAndMechanicStaffId(Long id, Long mechanicStaffId);

    List<RescueOffer> findByStatusAndExpiresAtBefore(RescueOfferStatus status, LocalDateTime threshold);

    boolean existsByRescueOrderIdAndStatus(Long rescueOrderId, RescueOfferStatus status);

    boolean existsByRescueOrderIdAndMechanicStaffUserIdAndStatusAndExpiresAtAfter(
            Long rescueOrderId, Long userId, RescueOfferStatus status, LocalDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM RescueOffer o WHERE o.id = :id")
    Optional<RescueOffer> findByIdWithLock(@Param("id") Long id);
}

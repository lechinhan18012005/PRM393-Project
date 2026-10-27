package com.prm393.floodrescue.features.finance.repository;

import com.prm393.floodrescue.features.finance.entity.PayoutRequest;
import com.prm393.floodrescue.features.finance.entity.PayoutStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayoutRequestRepository extends JpaRepository<PayoutRequest, Long> {
    @Query("select p.garage.id from PayoutRequest p where p.id = :id")
    Optional<Long> findGarageIdById(@Param("id") Long id);
    List<PayoutRequest> findByGarageIdOrderByCreatedAtDesc(Long garageId);
    List<PayoutRequest> findByStatusOrderByCreatedAtDesc(PayoutStatus status);
    List<PayoutRequest> findAllByOrderByCreatedAtDesc();

    @Query("SELECT COALESCE(SUM(p.requestedAmount), 0) FROM PayoutRequest p WHERE p.garage.id = :garageId AND p.status IN :statuses")
    BigDecimal sumRequestedAmountByGarageIdAndStatuses(
            @Param("garageId") Long garageId,
            @Param("statuses") List<PayoutStatus> statuses
    );
}

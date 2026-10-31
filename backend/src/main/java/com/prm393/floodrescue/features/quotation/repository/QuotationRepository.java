package com.prm393.floodrescue.features.quotation.repository;

import com.prm393.floodrescue.features.quotation.entity.Quotation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    List<Quotation> findByOrderIdOrderByVersionDesc(Long orderId);

    Optional<Quotation> findFirstByOrderIdAndLatestTrue(Long orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select q from Quotation q left join fetch q.items where q.id = :id")
    Optional<Quotation> findByIdForUpdate(@Param("id") Long id);
}

package com.prm393.floodrescue.features.batchtransport.repository;

import com.prm393.floodrescue.features.batchtransport.entity.BatchTrip;
import com.prm393.floodrescue.features.batchtransport.entity.BatchTripStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BatchTripRepository extends JpaRepository<BatchTrip, Long> {
    List<BatchTrip> findByStatusInOrderByDepartureTimeAsc(Collection<BatchTripStatus> statuses);

    List<BatchTrip> findByMechanicIdOrderByCreatedAtDesc(Long mechanicId);

    List<BatchTrip> findByMechanicIdInOrderByCreatedAtDesc(Collection<Long> mechanicIds);

    boolean existsByMechanicIdAndStatusIn(Long mechanicId, Collection<BatchTripStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from BatchTrip b where b.id = :id")
    Optional<BatchTrip> findByIdForUpdate(@Param("id") Long id);
}

package com.prm393.floodrescue.features.rescue.repository;

import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface RescueOrderRepository extends JpaRepository<RescueOrder, Long> {

    Optional<RescueOrder> findByOrderCode(String orderCode);

    Optional<RescueOrder> findByClientRequestId(String clientRequestId);

    Optional<RescueOrder> findByCustomerIdAndClientRequestId(Long customerId, String clientRequestId);

    Optional<RescueOrder> findFirstByCustomerIdAndStatusInOrderByCreatedAtDesc(
            Long customerId, List<RescueOrderStatus> statuses);

    Optional<RescueOrder> findFirstByMechanicStaffIdAndStatusInOrderByCreatedAtDesc(
            Long mechanicStaffId, List<RescueOrderStatus> statuses);

    List<RescueOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<RescueOrder> findByMechanicStaffIdOrderByCreatedAtDesc(Long mechanicStaffId);

    List<RescueOrder> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    List<RescueOrder> findByBatchTripIdOrderByCreatedAtAsc(Long batchTripId);

    List<RescueOrder> findByOrderTypeAndBatchTripIdIsNullAndStatusAndRequestedAtBefore(
            OrderType orderType, RescueOrderStatus status, LocalDateTime requestedBefore);

    List<RescueOrder> findAllByOrderByCreatedAtDesc();

    boolean existsByCustomerIdAndStatusIn(Long customerId, List<RescueOrderStatus> statuses);

    boolean existsByMechanicStaffIdAndStatusIn(Long mechanicStaffId, List<RescueOrderStatus> statuses);

    boolean existsByMechanicStaffIdAndIdNotAndStatusIn(
            Long mechanicStaffId, Long excludedOrderId, List<RescueOrderStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RescueOrder r WHERE r.id = :id")
    Optional<RescueOrder> findByIdWithLock(@Param("id") Long id);

    @Query("""
        SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END
        FROM RescueOrder o
        WHERE o.id = :orderId
          AND (
              o.customer.id = :userId
              OR (o.mechanicStaff IS NOT NULL AND o.mechanicStaff.user.id = :userId)
              OR (o.garage IS NOT NULL AND o.garage.owner.id = :userId)
          )
    """)
    boolean canUserSubscribeToOrder(@Param("orderId") Long orderId, @Param("userId") Long userId);

    @Query("""
        SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END
        FROM RescueOrder o
        WHERE o.id = :orderId
          AND o.status IN (
              com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus.REQUESTED,
              com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus.DISPATCHED,
              com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus.ARRIVED,
              com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus.IN_PROGRESS,
              com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus.PAYMENT_PENDING
          )
    """)
    boolean isOrderActiveForTracking(@Param("orderId") Long orderId);
}

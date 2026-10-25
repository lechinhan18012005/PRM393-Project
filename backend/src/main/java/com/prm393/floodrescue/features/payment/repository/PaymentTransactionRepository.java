package com.prm393.floodrescue.features.payment.repository;

import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    @org.springframework.data.jpa.repository.Query("select p.rescueOrderId from PaymentTransaction p where p.payosOrderCode = :code")
    Optional<Long> findRescueOrderIdByCode(@org.springframework.data.repository.query.Param("code") Long code);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from PaymentTransaction p where p.payosOrderCode = :code")
    Optional<PaymentTransaction> findByCodeWithLock(@org.springframework.data.repository.query.Param("code") Long code);
    Optional<PaymentTransaction> findByPayosOrderCode(Long payosOrderCode);
    Optional<PaymentTransaction> findFirstByRescueOrderIdAndStatusOrderByCreatedAtDesc(Long rescueOrderId, PaymentStatus status);
    Optional<PaymentTransaction> findFirstByRescueOrderIdOrderByCreatedAtDesc(Long rescueOrderId);
    List<PaymentTransaction> findByRescueOrderIdAndStatus(Long rescueOrderId, PaymentStatus status);
    List<PaymentTransaction> findByRescueOrderIdOrderByCreatedAtDesc(Long rescueOrderId);
    List<PaymentTransaction> findByGarageIdOrderByCreatedAtDesc(Long garageId);
    List<PaymentTransaction> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
}

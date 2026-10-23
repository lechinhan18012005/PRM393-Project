package com.prm393.floodrescue.features.payment.repository;

import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByPayosOrderCode(Long payosOrderCode);
    List<PaymentTransaction> findByRescueOrderIdOrderByCreatedAtDesc(Long rescueOrderId);
    List<PaymentTransaction> findByGarageIdOrderByCreatedAtDesc(Long garageId);
    List<PaymentTransaction> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
}

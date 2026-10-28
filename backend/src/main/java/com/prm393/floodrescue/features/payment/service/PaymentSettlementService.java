package com.prm393.floodrescue.features.payment.service;

import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.finance.entity.*;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.payment.dto.PaymentTransactionResponse;
import com.prm393.floodrescue.features.payment.entity.*;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import com.prm393.floodrescue.features.rescue.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PaymentSettlementService {
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;
    private final PaymentTransactionRepository payments;
    private final RescueOrderRepository orders;
    private final GarageRepository garages;
    private final WalletTransactionRepository ledger;
    private final RescueExecutionService execution;
    private final RescueDispatchService dispatch;

    // Global lock order: rescue order -> payment -> garage wallet. No network I/O here.
    @Transactional
    public PaymentTransactionResponse apply(Long code, boolean paid, String signature, String proof) {
        Long orderId = payments.findRescueOrderIdByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));
        var order = orders.findByIdWithLock(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ"));
        var tx = payments.findByCodeWithLock(code).orElseThrow();
        // Calls from cash/demo may already have loaded these entities before waiting for the lock.
        if (entityManager != null) {
            entityManager.refresh(order, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            entityManager.refresh(tx, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        }
        if (!paid) {
            if (tx.getStatus() == PaymentStatus.SUCCESS || tx.getStatus() == PaymentStatus.REFUNDED
                    || tx.getStatus() == PaymentStatus.DUPLICATE_PAID) {
                return PayOSPaymentService.mapToResponse(tx);
            }
            // Cancellation/expiry is also terminal until verified money actually arrives.
            if (tx.getStatus() == PaymentStatus.PENDING || tx.getStatus() == PaymentStatus.FAILED) {
                tx.setStatus(PaymentStatus.FAILED);
                tx.setWebhookSignature(signature);
                tx.setRawWebhookPayload(proof);
                payments.save(tx);
            }
            return PayOSPaymentService.mapToResponse(tx);
        }
        if (tx.getStatus() == PaymentStatus.REFUNDED || tx.getStatus() == PaymentStatus.DUPLICATE_PAID) {
            return PayOSPaymentService.mapToResponse(tx);
        }
        if (order.getStatus() == RescueOrderStatus.COMPLETED) {
            if (tx.getId().equals(order.getPaymentTransactionId())) {
                return PayOSPaymentService.mapToResponse(tx);
            }
            tx.setStatus(PaymentStatus.DUPLICATE_PAID);
            tx.setReconciled(false);
            tx.setPaidAt(LocalDateTime.now());
            tx.setRawWebhookPayload(proof);
            tx.setWebhookSignature(signature);
            payments.save(tx);
            dispatch.recordAudit(orderId, order.getStatus(), order.getStatus(), null, "PAYMENT_GATEWAY",
                    "Khoản thanh toán đến muộn cần đối soát, không cộng ví lần hai: " + code);
            return PayOSPaymentService.mapToResponse(tx);
        }
        var garage = tx.getGarage();
        var balance = garages.lockWalletBalance(garage.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví gara"));
        var now = LocalDateTime.now();
        tx.setStatus(PaymentStatus.SUCCESS);
        tx.setPaidAt(now);
        tx.setReconciledAt(now);
        tx.setReconciled(true);
        tx.setChecksumValid(true);
        tx.setWebhookSignature(signature);
        tx.setRawWebhookPayload(proof);
        garage.setWalletBalance(balance.add(tx.getNetGarageAmount()));
        garages.save(garage);
        ledger.save(WalletTransaction.builder().garage(garage).amount(tx.getNetGarageAmount())
                .balanceAfter(garage.getWalletBalance()).transactionType(WalletTransactionType.ORDER_INCOME)
                .referenceCode("PAYOS-" + code).description("Thu hộ PayOS đơn " + tx.getRescueCode()).build());
        payments.save(tx);
        execution.markPaymentSuccessful(orderId, tx.getId(), code, "PAYOS", tx.getAmount(), now);
        return PayOSPaymentService.mapToResponse(tx);
    }
}

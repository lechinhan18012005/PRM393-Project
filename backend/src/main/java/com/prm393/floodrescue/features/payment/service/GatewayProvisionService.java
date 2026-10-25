package com.prm393.floodrescue.features.payment.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.payment.dto.*;
import com.prm393.floodrescue.features.payment.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@RequiredArgsConstructor
public class GatewayProvisionService {
    private final PaymentAttemptService attempts;
    private final PayOSGatewayClient gateway;
    private final PaymentSettlementService settlement;
    private final java.util.concurrent.ConcurrentHashMap<Long, SyncWindow> syncWindows = new java.util.concurrent.ConcurrentHashMap<>();

    private static final class SyncWindow {
        final java.util.concurrent.locks.ReentrantLock lock = new java.util.concurrent.locks.ReentrantLock();
        long nextAutomatic;
        long nextManual;
        volatile long lastUsed = System.nanoTime();
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CreatePaymentLinkResponse create(User user, CreatePaymentRequest request) {
        // Each DB phase commits independently; no order/wallet lock spans network I/O.
        var attempt = attempts.prepare(user, request);
        if (Boolean.TRUE.equals(attempt.getIsSimulation()) || attempt.getPaymentMethod() == PaymentMethod.CASH
                || attempt.getStatus() == PaymentStatus.SUCCESS) return attempt;
        boolean first = attempts.claimGatewayRequest(attempt.getPayosOrderCode());
        var data = gateway.ensureLink(attempt, first);
        var result = attempts.storeGatewayLink(attempt.getPayosOrderCode(), data);
        if ("PAID".equals(data.path("status").asText())) {
            settlement.apply(attempt.getPayosOrderCode(), true, null, data.toString());
            return attempts.prepare(user, request);
        }
        return result;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public PaymentTransactionResponse synchronize(Long code, boolean manualRefresh) {
        var window = syncWindows.computeIfAbsent(code, ignored -> new SyncWindow());
        if (!window.lock.tryLock()) return attempts.paymentSnapshot(code);
        try {
            long now = System.nanoTime();
            window.lastUsed = now;
            var attempt = attempts.snapshot(code);
            if (Boolean.TRUE.equals(attempt.getIsSimulation()) || attempt.getPaymentMethod() != PaymentMethod.PAYOS_VIETQR
                    || (attempt.getStatus() != PaymentStatus.PENDING && attempt.getStatus() != PaymentStatus.FAILED)) {
                return attempts.paymentSnapshot(code);
            }
            long deadline = manualRefresh ? window.nextManual : window.nextAutomatic;
            if (deadline != 0 && now - deadline < 0) {
                return attempts.paymentSnapshot(code);
            }
            // Per-backend rate limit and single-flight. No DB transaction spans the HTTP call.
            window.nextAutomatic = now + java.util.concurrent.TimeUnit.SECONDS.toNanos(5);
            window.nextManual = now + java.util.concurrent.TimeUnit.SECONDS.toNanos(1);
            var data = gateway.findLink(attempt);
            if (data == null) {
                throw new com.prm393.floodrescue.common.exception.BadRequestException(
                        "PayOS chưa tìm thấy link này. Vui lòng thử lại việc khởi tạo với mã giao dịch hiện có, không thanh toán thêm.");
            }
            attempts.storeGatewayLink(code, data);
            if ("PAID".equals(data.path("status").asText())) {
                return settlement.apply(code, true, null, data.toString());
            }
            return attempts.paymentSnapshot(code);
        } finally {
            window.lock.unlock();
            if (syncWindows.size() > 2048) {
                long cutoff = System.nanoTime() - java.util.concurrent.TimeUnit.MINUTES.toNanos(5);
                syncWindows.entrySet().removeIf(e -> e.getValue().lastUsed < cutoff && !e.getValue().lock.isLocked());
            }
        }
    }
}

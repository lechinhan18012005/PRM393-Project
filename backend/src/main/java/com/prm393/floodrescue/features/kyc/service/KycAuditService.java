package com.prm393.floodrescue.features.kyc.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.kyc.entity.KycAuditAction;
import com.prm393.floodrescue.features.kyc.entity.KycAuditLog;
import com.prm393.floodrescue.features.kyc.repository.KycAuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class KycAuditService {

    private final KycAuditLogRepository auditRepo;

    /**
     * Records an immutable audit log entry for Decree 13/2023/ND-CP compliance.
     * Uses REQUIRES_NEW propagation so the log persists even if outer transaction rolls back.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAccess(
            User operator,
            Long garageId,
            KycAuditAction action,
            String resourceAccessed,
            HttpServletRequest request,
            String details
    ) {
        String ip = extractClientIp(request);
        String userAgent = request != null ? request.getHeader("User-Agent") : "Unknown";

        KycAuditLog entry = KycAuditLog.builder()
                .operatorId(operator.getId())
                .operatorUsername(operator.getUsername())
                .operatorRole(operator.getRole().name())
                .garageId(garageId)
                .action(action)
                .resourceAccessed(resourceAccessed)
                .ipAddress(ip)
                .userAgent(userAgent != null && userAgent.length() > 300 ? userAgent.substring(0, 300) : userAgent)
                .details(details)
                .createdAt(LocalDateTime.now())
                .build();

        auditRepo.save(entry);
        log.info("[ND13-AUDIT] Operator {} ({}) performed action {} on Garage ID={} from IP={}",
                operator.getUsername(), operator.getRole(), action, garageId, ip);
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "Unknown";
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}

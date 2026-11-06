package com.prm393.floodrescue.features.rescue.service.impl;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.rescue.dto.RescueOrderAuditLogResponse;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderAuditLog;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderAuditLogRepository;
import com.prm393.floodrescue.features.rescue.service.RescueOrderAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RescueOrderAuditServiceImpl implements RescueOrderAuditService {

    private final RescueOrderAuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordOrderEvent(
            RescueOrder order,
            String action,
            RescueOrderStatus statusFrom,
            RescueOrderStatus statusTo,
            User actor,
            String actorRole,
            String notes,
            Double latitude,
            Double longitude,
            String evidencePhotoUrl) {
        if (order == null) return;
        try {
            RescueOrderAuditLog logEntry = RescueOrderAuditLog.builder()
                    .order(order)
                    .orderCode(order.getOrderCode())
                    .mechanicStaff(order.getMechanicStaff())
                    .action(action)
                    .statusFrom(statusFrom)
                    .statusTo(statusTo != null ? statusTo : order.getStatus())
                    .actor(actor)
                    .actorRole(actorRole != null ? actorRole : (actor != null && actor.getRole() != null ? actor.getRole().name() : "SYSTEM"))
                    .notes(notes)
                    .latitude(latitude != null ? latitude : order.getFinalMechanicLatitude())
                    .longitude(longitude != null ? longitude : order.getFinalMechanicLongitude())
                    .evidencePhotoUrl(evidencePhotoUrl != null ? evidencePhotoUrl : order.getCompletionPhotoUrl())
                    .createdAt(LocalDateTime.now())
                    .build();

            auditLogRepository.save(logEntry);
            log.debug("Recorded audit log for order {}: action={}", order.getOrderCode(), action);
        } catch (Exception e) {
            log.warn("Failed to record order audit log for {}: {}", order.getOrderCode(), e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueOrderAuditLogResponse> getOrderAuditLogs(Long orderId) {
        return auditLogRepository.findByOrderIdOrderByCreatedAtAsc(orderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescueOrderAuditLogResponse> getOrderAuditLogsByCode(String orderCode) {
        return auditLogRepository.findByOrderCodeOrderByCreatedAtAsc(orderCode)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private RescueOrderAuditLogResponse mapToResponse(RescueOrderAuditLog log) {
        return RescueOrderAuditLogResponse.builder()
                .id(log.getId())
                .orderId(log.getOrder() != null ? log.getOrder().getId() : null)
                .orderCode(log.getOrderCode())
                .mechanicStaffId(log.getMechanicStaff() != null ? log.getMechanicStaff().getId() : null)
                .mechanicFullName(log.getMechanicStaff() != null && log.getMechanicStaff().getUser() != null
                        ? log.getMechanicStaff().getUser().getFullName() : null)
                .action(log.getAction())
                .statusFrom(log.getStatusFrom())
                .statusTo(log.getStatusTo())
                .actorId(log.getActor() != null ? log.getActor().getId() : null)
                .actorName(log.getActor() != null ? log.getActor().getFullName() : "Hệ thống")
                .actorRole(log.getActorRole())
                .notes(log.getNotes())
                .latitude(log.getLatitude())
                .longitude(log.getLongitude())
                .evidencePhotoUrl(log.getEvidencePhotoUrl())
                .createdAt(log.getCreatedAt())
                .build();
    }
}

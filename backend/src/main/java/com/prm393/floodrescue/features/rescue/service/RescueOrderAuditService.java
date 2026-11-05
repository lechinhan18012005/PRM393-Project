package com.prm393.floodrescue.features.rescue.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.rescue.dto.RescueOrderAuditLogResponse;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;

import java.util.List;

public interface RescueOrderAuditService {

    void recordOrderEvent(
            RescueOrder order,
            String action,
            RescueOrderStatus statusFrom,
            RescueOrderStatus statusTo,
            User actor,
            String actorRole,
            String notes,
            Double latitude,
            Double longitude,
            String evidencePhotoUrl
    );

    List<RescueOrderAuditLogResponse> getOrderAuditLogs(Long orderId);

    List<RescueOrderAuditLogResponse> getOrderAuditLogsByCode(String orderCode);
}

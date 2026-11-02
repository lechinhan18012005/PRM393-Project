package com.prm393.floodrescue.features.kyc.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.kyc.entity.KycAuditAction;
import jakarta.servlet.http.HttpServletRequest;

public interface KycAuditService {

    /**
     * Records an immutable audit log entry for Decree 13/2023/ND-CP compliance.
     */
    void recordAccess(
            User operator,
            Long garageId,
            KycAuditAction action,
            String resourceAccessed,
            HttpServletRequest request,
            String details
    );
}

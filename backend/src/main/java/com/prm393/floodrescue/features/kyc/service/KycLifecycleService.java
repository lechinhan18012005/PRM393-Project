package com.prm393.floodrescue.features.kyc.service;

import com.prm393.floodrescue.features.auth.entity.User;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Manages the data lifecycle and right to erasure (Article 9, Decree 13/2023/ND-CP).
 * - Automatic purging of raw CCCD files after retention period (e.g. 30-60 days).
 * - On-demand Right to Erasure for garage owners requesting account termination.
 */
public interface KycLifecycleService {

    /**
     * Automatic purge scheduler running once every 24 hours at 2:00 AM.
     */
    void purgeExpiredCccdFiles();

    /**
     * Fulfills Data Subject's Right to Erasure (Quyền xóa dữ liệu - Điều 9 NĐ 13/2023/NĐ-CP).
     */
    void fulfillErasureRequest(User caller, Long garageId, HttpServletRequest request);
}

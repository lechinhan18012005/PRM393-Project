package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.features.garage.entity.*;

import org.springframework.security.access.AccessDeniedException;

public final class GarageAccess {
    private GarageAccess() {}

    public static void requireApproved(Garage garage) {
        if (garage.getStatus() != GarageStatus.APPROVED)
            throw new AccessDeniedException("Gara chưa được phê duyệt hoặc đã bị đình chỉ");
    }
}

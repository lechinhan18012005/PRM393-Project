package com.prm393.floodrescue.features.kyc.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.kyc.entity.KycAuditAction;
import com.prm393.floodrescue.features.kyc.service.KycAuditService;
import com.prm393.floodrescue.features.kyc.service.KycLifecycleService;
import com.prm393.floodrescue.features.kyc.service.SecureStorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Manages the data lifecycle and right to erasure (Article 9, Decree 13/2023/ND-CP).
 * - Automatic purging of raw CCCD files after retention period (e.g. 30-60 days).
 * - On-demand Right to Erasure for garage owners requesting account termination.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KycLifecycleServiceImpl implements KycLifecycleService {

    private final GarageRepository garageRepo;
    private final SecureStorageService secureStorageService;
    private final KycAuditService auditService;

    /**
     * Automatic purge scheduler running once every 24 hours at 2:00 AM.
     */
    @Override
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void purgeExpiredCccdFiles() {
        LocalDateTime now = LocalDateTime.now();
        List<Garage> expiredGarages = garageRepo.findAll().stream()
                .filter(g -> !Boolean.TRUE.equals(g.getIdCardPurged())
                        && g.getKycRetentionUntil() != null
                        && g.getKycRetentionUntil().isBefore(now))
                .toList();

        for (Garage garage : expiredGarages) {
            try {
                if (garage.getIdCardStorageKey() != null) {
                    secureStorageService.deleteSecureFile(garage.getIdCardStorageKey());
                }
                garage.setIdCardPurged(true);
                garage.setIdCardUrl(null);
                garage.setIdCardStorageKey(null);
                garageRepo.save(garage);

                log.info("[ND13-PURGE] Tự động xóa vĩnh viễn tệp ảnh CCCD hết hạn lưu trữ cho Garage ID={}", garage.getId());
            } catch (Exception e) {
                log.error("Lỗi khi purge CCCD của Garage ID={}: {}", garage.getId(), e.getMessage());
            }
        }
    }

    /**
     * Fulfills Data Subject's Right to Erasure (Quyền xóa dữ liệu - Điều 9 NĐ 13/2023/NĐ-CP).
     */
    @Override
    @Transactional
    public void fulfillErasureRequest(User caller, Long garageId, HttpServletRequest request) {
        Garage garage = garageRepo.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Garage với ID: " + garageId));

        // Check permission: Owner of garage OR Super Admin
        boolean isOwner = garage.getOwner() != null && garage.getOwner().getId().equals(caller.getId());
        boolean isAdmin = "ADMIN".equals(caller.getRole().name()) || "SUPER_ADMIN".equals(caller.getRole().name());

        if (!isOwner && !isAdmin) {
            throw new BadRequestException("Bạn không có quyền yêu cầu xóa dữ liệu của Garage này.");
        }

        // Delete CCCD physical file
        if (garage.getIdCardStorageKey() != null) {
            secureStorageService.deleteSecureFile(garage.getIdCardStorageKey());
        }

        // Delete Business license file if terminated
        if (garage.getBusinessLicenseStorageKey() != null) {
            secureStorageService.deleteSecureFile(garage.getBusinessLicenseStorageKey());
        }

        // Wipe sensitive columns in DB
        garage.setIdCardStorageKey(null);
        garage.setIdCardUrl(null);
        garage.setIdCardNumber(null);
        garage.setIdCardNumberHash(null);
        garage.setBusinessLicenseStorageKey(null);
        garage.setBusinessLicenseUrl(null);
        garage.setIdCardPurged(true);
        garageRepo.save(garage);

        auditService.recordAccess(
                caller,
                garageId,
                KycAuditAction.ERASURE_REQUEST_FULFILLED,
                "ALL_KYC_DOCUMENTS",
                request,
                "Chủ thể dữ liệu yêu cầu thực hiện quyền xóa dữ liệu cá nhân (Right to Erasure)."
        );

        log.info("[ND13-ERASURE] Thực hiện xóa vĩnh viễn toàn bộ dữ liệu KYC cho Garage ID={} bởi User={}",
                garageId, caller.getUsername());
    }
}

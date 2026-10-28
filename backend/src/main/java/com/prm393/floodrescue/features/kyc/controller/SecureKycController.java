package com.prm393.floodrescue.features.kyc.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.kyc.entity.KycAuditAction;
import com.prm393.floodrescue.features.kyc.service.EncryptedLocalStorageServiceImpl;
import com.prm393.floodrescue.features.kyc.service.KycAuditService;
import com.prm393.floodrescue.features.kyc.service.KycLifecycleService;
import com.prm393.floodrescue.features.kyc.service.SecureStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/kyc")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Secure KYC Management", description = "Quản lý và lưu trữ hồ sơ KYC bảo mật theo Nghị định 13/2023/NĐ-CP")
public class SecureKycController {

    private final SecureStorageService secureStorageService;
    private final EncryptedLocalStorageServiceImpl encryptedStorageImpl;
    private final KycAuditService auditService;
    private final KycLifecycleService lifecycleService;
    private final GarageRepository garageRepo;

    /**
     * Upload an encrypted sensitive document (CCCD or Business License).
     * Validates magic bytes, enforces <= 5MB, encrypts at rest with AES-256.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải lên tài liệu bảo mật mã hóa AES-256 (Magic byte check, max 5MB, No Public URL)")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadSecureDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "docType", defaultValue = "id-cards") String docType
    ) {
        String safeFolder = "business-license".equalsIgnoreCase(docType) ? "licenses" : "id-cards";
        String storageKey = secureStorageService.storeSecureFile(file, safeFolder);

        // Pre-signed preview URL (valid for 10 minutes only for the uploader session)
        String previewUrl = secureStorageService.generateTemporaryAccessUrl(storageKey, Duration.ofMinutes(10));

        return ResponseEntity.ok(ApiResponse.success(
                "Tải lên và mã hóa tệp bảo mật thành công.",
                Map.of(
                        "storageKey", storageKey,
                        "previewUrl", previewUrl
                )
        ));
    }

    /**
     * Generate temporary Pre-signed URL for CCCD viewing by Admin / KYC Verifier.
     * Records an immutable Audit Log entry.
     */
    @GetMapping("/garages/{id}/cccd-access")
    @PreAuthorize("hasAnyRole('KYC_VERIFIER', 'SUPER_ADMIN', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Lấy link Pre-signed URL xem ảnh CCCD (Chỉ KYC_VERIFIER / SUPER_ADMIN, hiệu lực 5-10 phút, ghi Audit Log)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCccdPresignedUrl(
            @PathVariable("id") Long garageId,
            @AuthenticationPrincipal User operator,
            HttpServletRequest request
    ) {
        Garage garage = garageRepo.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Garage với ID: " + garageId));

        if (Boolean.TRUE.equals(garage.getIdCardPurged()) || garage.getIdCardStorageKey() == null) {
            throw new BadRequestException("Tài liệu CCCD đã bị hủy vĩnh viễn theo chính sách bảo vệ dữ liệu hoặc chưa được tải lên.");
        }

        // Generate 5-minute pre-signed URL
        String presignedUrl = secureStorageService.generateTemporaryAccessUrl(garage.getIdCardStorageKey(), Duration.ofMinutes(5));

        // Immutable Audit Log
        auditService.recordAccess(
                operator,
                garageId,
                KycAuditAction.VIEW_CCCD,
                garage.getIdCardStorageKey(),
                request,
                "Xem tài liệu CCCD chủ gara để xác thực KYC."
        );

        return ResponseEntity.ok(ApiResponse.success(
                "Tạo liên kết xem CCCD tạm thời thành công (Hiệu lực: 5 phút).",
                Map.of(
                        "garageId", garageId,
                        "presignedUrl", presignedUrl,
                        "expiresInSeconds", 300,
                        "actionLogged", true
                )
        ));
    }

    /**
     * Generate temporary Pre-signed URL for Business License viewing by Admin.
     */
    @GetMapping("/garages/{id}/license-access")
    @PreAuthorize("hasAnyRole('KYC_VERIFIER', 'SUPER_ADMIN', 'ADMIN', 'STAFF')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Lấy link Pre-signed URL xem Giấy phép kinh doanh (Hiệu lực 10 phút, ghi Audit Log)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLicensePresignedUrl(
            @PathVariable("id") Long garageId,
            @AuthenticationPrincipal User operator,
            HttpServletRequest request
    ) {
        Garage garage = garageRepo.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Garage với ID: " + garageId));

        String key = garage.getBusinessLicenseStorageKey() != null
                ? garage.getBusinessLicenseStorageKey()
                : garage.getBusinessLicenseUrl();

        if (key == null || key.isBlank()) {
            throw new BadRequestException("Chưa có thông tin giấy phép kinh doanh.");
        }

        String presignedUrl = secureStorageService.generateTemporaryAccessUrl(key, Duration.ofMinutes(10));

        auditService.recordAccess(
                operator,
                garageId,
                KycAuditAction.VIEW_BUSINESS_LICENSE,
                key,
                request,
                "Xem giấy phép kinh doanh của gara."
        );

        return ResponseEntity.ok(ApiResponse.success(
                "Tạo liên kết xem giấy phép kinh doanh thành công.",
                Map.of("garageId", garageId, "presignedUrl", presignedUrl)
        ));
    }

    /**
     * Streams decrypted file content using valid Pre-signed URL signature and expiration.
     */
    @GetMapping("/files/view")
    @Operation(summary = "Xem tài liệu tạm thời qua Pre-signed signature (Zero public access, No-cache headers)")
    public ResponseEntity<byte[]> streamFileWithPresignedUrl(
            @RequestParam("key") String encodedKey,
            @RequestParam("expires") long expiresAtEpoch,
            @RequestParam("sig") String signature
    ) {
        String storageKey = new String(Base64.getUrlDecoder().decode(encodedKey), StandardCharsets.UTF_8);

        // Verify cryptographic signature and TTL
        if (!encryptedStorageImpl.validatePresignedSignature(storageKey, expiresAtEpoch, signature)) {
            return ResponseEntity.status(403).build();
        }

        byte[] decryptedBytes = secureStorageService.retrieveDecryptedFile(storageKey);

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (storageKey.endsWith(".jpg.enc") || storageKey.endsWith(".jpeg.enc")) {
            mediaType = MediaType.IMAGE_JPEG;
        } else if (storageKey.endsWith(".png.enc")) {
            mediaType = MediaType.IMAGE_PNG;
        } else if (storageKey.endsWith(".webp.enc")) {
            mediaType = MediaType.parseMediaType("image/webp");
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, private")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header("X-Content-Type-Options", "nosniff")
                .body(decryptedBytes);
    }

    /**
     * Data Subject Right to Erasure (Điều 9 Nghị định 13/2023/NĐ-CP).
     */
    @DeleteMapping("/garages/{id}/erasure")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Quyền xóa dữ liệu cá nhân theo Điều 9 Nghị định 13: Xóa vĩnh viễn tệp ảnh và thông tin CCCD")
    public ResponseEntity<ApiResponse<String>> requestDataErasure(
            @PathVariable("id") Long garageId,
            @AuthenticationPrincipal User user,
            HttpServletRequest request
    ) {
        lifecycleService.fulfillErasureRequest(user, garageId, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Đã xóa vĩnh viễn dữ liệu CCCD và tài liệu cá nhân theo yêu cầu tuân thủ Nghị định 13/2023/NĐ-CP."
        ));
    }
}

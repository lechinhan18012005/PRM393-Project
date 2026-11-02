package com.prm393.floodrescue.features.garage.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.dto.ApproveGarageRequest;
import com.prm393.floodrescue.features.garage.dto.GarageResponse;
import com.prm393.floodrescue.features.garage.dto.RegisterGarageRequest;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.service.GarageService;
import com.prm393.floodrescue.features.kyc.service.SecureStorageService;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GarageServiceImpl implements GarageService {

    private final GarageRepository garageRepository;
    private final GarageBranchRepository branchRepository;
    private final MechanicStaffRepository mechanicRepository;
    private final UserRepository userRepository;
    private final SecureStorageService secureStorageService;

    /**
     * Trích xuất storageKey thực tế nếu URL là link Pre-signed KYC (/api/v1/kyc/files/view?key=...)
     */
    private String extractStorageKeyFromUrl(String url) {
        if (url == null || !url.contains("/api/v1/kyc/files/view")) {
            return null;
        }
        try {
            int keyIndex = url.indexOf("key=");
            if (keyIndex == -1) return null;
            int ampersandIndex = url.indexOf('&', keyIndex);
            String encodedKey = ampersandIndex == -1
                    ? url.substring(keyIndex + 4)
                    : url.substring(keyIndex + 4, ampersandIndex);
            byte[] decoded = Base64.getUrlDecoder().decode(encodedKey);
            String key = new String(decoded, StandardCharsets.UTF_8);
            if (key.startsWith("id-cards/") || key.startsWith("licenses/") || key.startsWith("general/")) {
                return key;
            }
        } catch (Exception e) {
            log.debug("Không thể trích xuất storageKey từ url {}: {}", url, e.getMessage());
        }
        return null;
    }

    /**
     * Luôn sinh Pre-signed URL mới còn hạn (2 giờ) để người dùng xem ảnh không bao giờ bị 403 Forbidden.
     */
    private String resolveFreshUrl(String storageKey, String originalUrl) {
        String key = (storageKey != null && !storageKey.isBlank())
                ? storageKey
                : extractStorageKeyFromUrl(originalUrl);

        if (key != null && !key.isBlank() && secureStorageService != null) {
            try {
                // Tạo Pre-signed URL mới có hiệu lực 2 giờ cho phiên xem của người dùng
                return secureStorageService.generateTemporaryAccessUrl(key, Duration.ofHours(2));
            } catch (Exception e) {
                log.warn("Không thể sinh Pre-signed URL cho key {}: {}", key, e.getMessage());
            }
        }
        return originalUrl;
    }

    @Override
    @Transactional
    public GarageResponse registerGarage(User user, RegisterGarageRequest request) {
        if (garageRepository.existsByOwnerId(user.getId())) {
            throw new BadRequestException("Bạn đã có hồ sơ garage trên hệ thống!");
        }

        if (user.getRole() != Role.GARAGE_OWNER)
            throw new org.springframework.security.access.AccessDeniedException(
                    "Chỉ chủ gara được nộp hồ sơ");

        String licenseKey = request.getBusinessLicenseStorageKey();
        if (licenseKey == null || licenseKey.isBlank()) {
            licenseKey = extractStorageKeyFromUrl(request.getBusinessLicenseUrl());
        }

        String idCardKey = request.getIdCardStorageKey();
        if (idCardKey == null || idCardKey.isBlank()) {
            idCardKey = extractStorageKeyFromUrl(request.getIdCardUrl());
        }

        Garage garage =
                Garage.builder()
                        .owner(user)
                        .garageName(request.getGarageName())
                        .phone(request.getPhone() != null ? request.getPhone() : user.getPhone())
                        .businessLicenseUrl(request.getBusinessLicenseUrl())
                        .idCardUrl(request.getIdCardUrl())
                        .businessLicenseStorageKey(licenseKey)
                        .idCardStorageKey(idCardKey)
                        .idCardNumber(request.getIdCardNumber())
                        .nd13Consent(request.getNd13Consent() != null ? request.getNd13Consent() : true)
                        .nd13ConsentedAt(java.time.LocalDateTime.now())
                        .idCardPurged(false)
                        .status(GarageStatus.PENDING)
                        .walletBalance(BigDecimal.ZERO)
                        .build();

        garage = garageRepository.save(garage);

        // Optionally create first branch if provided
        if (request.getFirstBranchAddress() != null && !request.getFirstBranchAddress().isBlank()) {
            GarageBranch branch =
                    GarageBranch.builder()
                            .garage(garage)
                            .branchName(
                                    request.getFirstBranchName() != null
                                            ? request.getFirstBranchName()
                                            : garage.getGarageName() + " (Trụ sở chính)")
                            .address(request.getFirstBranchAddress())
                            .latitude(
                                    request.getFirstBranchLatitude() != null
                                            ? request.getFirstBranchLatitude()
                                            : 10.7381)
                            .longitude(
                                    request.getFirstBranchLongitude() != null
                                            ? request.getFirstBranchLongitude()
                                            : 106.7212)
                            .phoneNumber(
                                    request.getFirstBranchPhone() != null
                                            ? request.getFirstBranchPhone()
                                            : garage.getPhone())
                            .rescueVehicles(
                                    request.getFirstBranchVehicles() != null
                                            ? request.getFirstBranchVehicles()
                                            : "1 Xe tải nhẹ + 2 Xe máy chuyên dụng")
                            .operatingStatus(BranchStatus.OPEN)
                            .build();
            branchRepository.save(branch);
        }

        log.info(
                "Garage registered successfully with id: {} by user: {}",
                garage.getId(),
                user.getUsername());
        return mapToResponse(garage);
    }

    @Override
    @Transactional
    public GarageResponse resubmit(User user, RegisterGarageRequest request) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gara"));
        if (garage.getStatus() == GarageStatus.APPROVED
                || garage.getStatus() == GarageStatus.SUSPENDED)
            throw new BadRequestException("Không thể nộp lại hồ sơ ở trạng thái hiện tại");
        if (request.getBusinessLicenseUrl() == null
                || request.getBusinessLicenseUrl().isBlank()
                || request.getIdCardUrl() == null
                || request.getIdCardUrl().isBlank())
            throw new BadRequestException("Vui lòng cung cấp giấy phép kinh doanh và CCCD");

        garage.setGarageName(request.getGarageName());
        garage.setPhone(request.getPhone());
        garage.setBusinessLicenseUrl(request.getBusinessLicenseUrl());
        garage.setIdCardUrl(request.getIdCardUrl());

        String licenseKey = request.getBusinessLicenseStorageKey();
        if (licenseKey == null || licenseKey.isBlank()) {
            licenseKey = extractStorageKeyFromUrl(request.getBusinessLicenseUrl());
        }
        if (licenseKey != null && !licenseKey.isBlank()) {
            garage.setBusinessLicenseStorageKey(licenseKey);
        }

        String idCardKey = request.getIdCardStorageKey();
        if (idCardKey == null || idCardKey.isBlank()) {
            idCardKey = extractStorageKeyFromUrl(request.getIdCardUrl());
        }
        if (idCardKey != null && !idCardKey.isBlank()) {
            garage.setIdCardStorageKey(idCardKey);
        }

        garage.setStatus(GarageStatus.PENDING);
        garage.setRejectionReason(null);
        return mapToResponse(garageRepository.save(garage));
    }

    @Override
    @Transactional
    public GarageResponse getCurrentGarage(User user) {
        Garage garage =
                garageRepository
                        .findByOwnerId(user.getId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Chưa tìm thấy hồ sơ garage cho tài khoản này!"));

        // Tự động kiểm tra và cập nhật storageKey nếu bản ghi cũ thiếu
        boolean updated = false;
        if (garage.getIdCardStorageKey() == null && garage.getIdCardUrl() != null) {
            String extracted = extractStorageKeyFromUrl(garage.getIdCardUrl());
            if (extracted != null) {
                garage.setIdCardStorageKey(extracted);
                updated = true;
            }
        }
        if (garage.getBusinessLicenseStorageKey() == null && garage.getBusinessLicenseUrl() != null) {
            String extracted = extractStorageKeyFromUrl(garage.getBusinessLicenseUrl());
            if (extracted != null) {
                garage.setBusinessLicenseStorageKey(extracted);
                updated = true;
            }
        }
        if (updated) {
            garage = garageRepository.save(garage);
        }

        return mapToResponse(garage);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GarageResponse> getPendingGarages() {
        return garageRepository.findByStatus(GarageStatus.PENDING).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GarageResponse> getAllGarages() {
        return garageRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GarageResponse getGarageById(Long id) {
        Garage garage =
                garageRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy garage với id: " + id));
        return mapToResponse(garage);
    }

    @Override
    @Transactional
    public GarageResponse moderateGarage(Long garageId, ApproveGarageRequest request) {
        Garage garage =
                garageRepository
                        .findById(garageId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy garage với id: " + garageId));

        if (request.getStatus() == GarageStatus.PENDING
                && garage.getStatus() != GarageStatus.PENDING)
            throw new BadRequestException("Dùng quy trình nộp lại hồ sơ để chuyển về chờ duyệt");
        if (request.getStatus() == GarageStatus.APPROVED
                && (garage.getBusinessLicenseUrl() == null
                        || garage.getBusinessLicenseUrl().isBlank()
                        || garage.getIdCardUrl() == null
                        || garage.getIdCardUrl().isBlank()))
            throw new BadRequestException(
                    "Không thể duyệt hồ sơ thiếu giấy phép kinh doanh hoặc CCCD");
        if ((request.getStatus() == GarageStatus.REJECTED
                        || request.getStatus() == GarageStatus.SUSPENDED)
                && (request.getNote() == null || request.getNote().isBlank()))
            throw new BadRequestException("Vui lòng ghi rõ lý do từ chối hoặc đình chỉ");
        garage.setStatus(request.getStatus());
        if (request.getStatus() == GarageStatus.APPROVED) {
            garage.setKycRetentionUntil(java.time.LocalDateTime.now().plusDays(60));
        }
        if (request.getNote() != null) {
            garage.setRejectionReason(request.getNote());
        }

        garage = garageRepository.save(garage);
        log.info("Garage id: {} moderated to status: {}", garageId, request.getStatus());
        return mapToResponse(garage);
    }

    @Override
    public GarageResponse mapToResponse(Garage garage) {
        List<GarageBranch> branches =
                branchRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId());
        int branchCount = branches.size();
        int mechanicCount = (int) mechanicRepository.countByGarageId(garage.getId());

        // Sinh link Pre-signed mới còn hạn (2 giờ) cho người xem
        String freshBusinessLicenseUrl = resolveFreshUrl(garage.getBusinessLicenseStorageKey(), garage.getBusinessLicenseUrl());
        String freshIdCardUrl = resolveFreshUrl(garage.getIdCardStorageKey(), garage.getIdCardUrl());

        return GarageResponse.builder()
                .id(garage.getId())
                .ownerId(garage.getOwner() != null ? garage.getOwner().getId() : null)
                .ownerName(garage.getOwner() != null ? garage.getOwner().getFullName() : null)
                .ownerEmail(garage.getOwner() != null ? garage.getOwner().getEmail() : null)
                .garageName(garage.getGarageName())
                .phone(garage.getPhone())
                .businessLicenseUrl(freshBusinessLicenseUrl)
                .idCardUrl(freshIdCardUrl)
                .idCardNumber(garage.getIdCardNumber())
                .status(garage.getStatus())
                .walletBalance(garage.getWalletBalance())
                .rejectionReason(garage.getRejectionReason())
                .createdAt(garage.getCreatedAt())
                .address(branches.isEmpty() ? null : branches.get(0).getAddress())
                .branchCount(branchCount)
                .mechanicCount(mechanicCount)
                .build();
    }
}

package com.prm393.floodrescue.features.onboarding;

import com.prm393.floodrescue.common.exception.*;
import com.prm393.floodrescue.common.security.RateLimiterService;
import com.prm393.floodrescue.features.auth.dto.*;
import com.prm393.floodrescue.features.auth.entity.*;
import com.prm393.floodrescue.features.auth.repository.*;
import com.prm393.floodrescue.features.auth.service.*;
import com.prm393.floodrescue.features.garage.dto.*;
import com.prm393.floodrescue.features.garage.entity.*;
import com.prm393.floodrescue.features.garage.repository.*;
import com.prm393.floodrescue.features.garage.service.*;
import com.prm393.floodrescue.features.mechanic.entity.*;
import com.prm393.floodrescue.features.mechanic.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OnboardingService {
    private final AuthServiceImpl auth;
    private final UserRepository users;
    private final GarageService garages;
    private final GarageRepository garageRepo;
    private final GarageBranchRepository branches;
    private final MechanicStaffRepository mechanics;
    private final InvitationRepository invitations;
    private final RateLimiterService rateLimiterService;

    @Transactional
    public AuthResponse registerGarage(RegisterRequest account, RegisterGarageRequest application) {
        if (application.getBusinessLicenseUrl() == null
                || application.getBusinessLicenseUrl().isBlank()
                || application.getIdCardUrl() == null
                || application.getIdCardUrl().isBlank())
            throw new BadRequestException("Vui lòng cung cấp giấy phép kinh doanh và CCCD");
        AuthResponse response = auth.registerOwner(account);
        garages.registerGarage(
                users.findByUsername(response.getUser().getUsername()).orElseThrow(), application);
        return response;
    }

    @Transactional
    public Map<String, Object> invite(User issuer, String email, Long branchId, boolean staff) {
        email = email.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) throw new BadRequestException("Email đã được đăng ký");

        // Giới hạn tần suất tạo lời mời để chống lạm dụng
        rateLimiterService.checkRateLimit("invite_issuer_" + issuer.getId(), 25, 300, "tạo mã mời");

        AccountInvitation invitation = new AccountInvitation();
        invitation.setIssuedBy(issuer);
        if (staff) {
            if (issuer.getRole() != Role.ADMIN)
                throw new AccessDeniedException("Chỉ Admin được mời Staff");
            invitation.setRole(Role.STAFF);

            // Thu hồi các mã mời staff cũ chưa kích hoạt cho email này
            List<AccountInvitation> existingStaffInvites =
                    invitations.findByEmailIgnoreCaseAndRoleAndUsedFalseAndRevokedFalse(email, Role.STAFF);
            for (AccountInvitation old : existingStaffInvites) {
                old.setRevoked(true);
                old.setRevokedAt(LocalDateTime.now());
            }
            if (!existingStaffInvites.isEmpty()) {
                invitations.saveAll(existingStaffInvites);
            }
        } else {
            if (issuer.getRole() != Role.GARAGE_OWNER)
                throw new AccessDeniedException("Chỉ chủ gara được mời thợ");
            Garage garage =
                    garageRepo
                            .findByOwnerId(issuer.getId())
                            .orElseThrow(() -> new BadRequestException("Không tìm thấy gara"));
            GarageAccess.requireApproved(garage);

            // Kiểm tra số lượng lời mời đang chờ xử lý của gara (tối đa 50)
            long pendingCount = invitations.countByGarageIdAndUsedFalseAndRevokedFalse(garage.getId());
            if (pendingCount >= 50) {
                throw new BadRequestException("Garage đã đạt giới hạn tối đa 50 lời mời đang chờ xử lý!");
            }

            GarageBranch branch =
                    branches.findById(Objects.requireNonNull(branchId))
                            .orElseThrow(() -> new BadRequestException("Không tìm thấy chi nhánh"));
            if (!branch.getGarage().getId().equals(garage.getId()))
                throw new AccessDeniedException("Chi nhánh không thuộc gara của bạn");

            if (branch.getOperatingStatus() != BranchStatus.OPEN) {
                throw new BadRequestException("Chi nhánh đang tạm đóng cửa hoặc bảo trì, không thể phân bổ thợ vào lúc này");
            }

            // Thu hồi mã mời cũ chưa dùng của email này tại gara để ngăn replay token cũ
            List<AccountInvitation> existingInvites =
                    invitations.findByGarageIdAndEmailIgnoreCaseAndUsedFalseAndRevokedFalse(garage.getId(), email);
            for (AccountInvitation old : existingInvites) {
                old.setRevoked(true);
                old.setRevokedAt(LocalDateTime.now());
            }
            if (!existingInvites.isEmpty()) {
                invitations.saveAll(existingInvites);
            }

            invitation.setGarage(garage);
            invitation.setBranch(branch);
            invitation.setRole(Role.FIELD_MECHANIC);
        }
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        invitation.setTokenHash(hash(code));
        invitation.setEmail(email);
        invitation.setExpiresAt(LocalDateTime.now().plusHours(48));
        invitation.setRevoked(false);
        invitations.save(invitation);
        return Map.of(
                "code",
                code,
                "email",
                email,
                "expiresAt",
                invitation.getExpiresAt(),
                "role",
                invitation.getRole());
    }

    @Transactional
    public Map<String, String> activate(String code, RegisterRequest account) {
        String tokenHash = hash(code);
        // Chống brute-force mã kích hoạt: tối đa 10 lần thử trên mỗi mã trong 60 giây
        rateLimiterService.checkRateLimit("activate_hash_" + tokenHash, 10, 60, "thử kích hoạt");

        AccountInvitation invitation =
                invitations
                        .findForActivation(tokenHash)
                        .orElseThrow(() -> new BadRequestException("Mã mời không hợp lệ"));
        if (invitation.isUsed() || invitation.isRevoked() || !invitation.getExpiresAt().isAfter(LocalDateTime.now()))
            throw new BadRequestException("Mã mời đã dùng, đã bị thu hồi hoặc đã hết hạn");
        if (!invitation.getEmail().equalsIgnoreCase(account.getEmail().trim()))
            throw new BadRequestException("Email không khớp lời mời");
        if (invitation.getGarage() != null) GarageAccess.requireApproved(invitation.getGarage());

        // Kiểm tra chi nhánh còn hoạt động không
        if (invitation.getBranch() != null && invitation.getBranch().getOperatingStatus() != BranchStatus.OPEN) {
            throw new BadRequestException("Chi nhánh phân bổ hiện đang đóng cửa hoặc bảo trì, chưa thể kích hoạt thợ");
        }

        account.setRole(null);
        AuthResponse response = auth.register(account);
        User user = users.findByUsername(response.getUser().getUsername()).orElseThrow();
        user.setRole(invitation.getRole());
        users.save(user);
        if (invitation.getRole() == Role.FIELD_MECHANIC)
            mechanics.save(
                    MechanicStaff.builder()
                            .user(user)
                            .garage(invitation.getGarage())
                            .branch(invitation.getBranch())
                            .workingStatus(MechanicStatus.OFFLINE)
                            .build());
        invitation.setUsed(true);
        invitations.save(invitation);
        return Map.of("message", "Kích hoạt thành công. Vui lòng đăng nhập.");
    }

    private String hash(String code) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                     .digest(code.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}

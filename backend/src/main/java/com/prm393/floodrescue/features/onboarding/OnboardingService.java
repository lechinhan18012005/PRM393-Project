package com.prm393.floodrescue.features.onboarding;

import com.prm393.floodrescue.common.exception.*;
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
        AccountInvitation invitation = new AccountInvitation();
        invitation.setIssuedBy(issuer);
        if (staff) {
            if (issuer.getRole() != Role.ADMIN)
                throw new AccessDeniedException("Chỉ Admin được mời Staff");
            invitation.setRole(Role.STAFF);
        } else {
            if (issuer.getRole() != Role.GARAGE_OWNER)
                throw new AccessDeniedException("Chỉ chủ gara được mời thợ");
            Garage garage =
                    garageRepo
                            .findByOwnerId(issuer.getId())
                            .orElseThrow(() -> new BadRequestException("Không tìm thấy gara"));
            GarageAccess.requireApproved(garage);
            GarageBranch branch =
                    branches.findById(Objects.requireNonNull(branchId))
                            .orElseThrow(() -> new BadRequestException("Không tìm thấy chi nhánh"));
            if (!branch.getGarage().getId().equals(garage.getId()))
                throw new AccessDeniedException("Chi nhánh không thuộc gara của bạn");
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
        AccountInvitation invitation =
                invitations
                        .findForActivation(hash(code))
                        .orElseThrow(() -> new BadRequestException("Mã mời không hợp lệ"));
        if (invitation.isUsed() || !invitation.getExpiresAt().isAfter(LocalDateTime.now()))
            throw new BadRequestException("Mã mời đã dùng hoặc hết hạn");
        if (!invitation.getEmail().equalsIgnoreCase(account.getEmail().trim()))
            throw new BadRequestException("Email không khớp lời mời");
        if (invitation.getGarage() != null) GarageAccess.requireApproved(invitation.getGarage());
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

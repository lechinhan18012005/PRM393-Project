package com.prm393.floodrescue.features.auth.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.common.exception.UnauthorizedException;
import com.prm393.floodrescue.config.JwtProperties;
import com.prm393.floodrescue.config.JwtService;
import com.prm393.floodrescue.features.auth.dto.AuthResponse;
import com.prm393.floodrescue.features.auth.dto.LoginRequest;
import com.prm393.floodrescue.features.auth.dto.RegisterRequest;
import com.prm393.floodrescue.features.auth.dto.TokenRefreshRequest;
import com.prm393.floodrescue.features.auth.dto.UserProfileResponse;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final AuthenticationManager authenticationManager;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        return registerAs(request, Role.CUSTOMER);
    }

    @Transactional
    public AuthResponse registerOwner(RegisterRequest request) {
        return registerAs(request, Role.GARAGE_OWNER);
    }

    private AuthResponse registerAs(RegisterRequest request, Role assignedRole) {
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new BadRequestException(
                    "Tên đăng nhập đã được sử dụng: " + request.getUsername());
        }

        if (userRepository.existsByEmail(
                request.getEmail().trim().toLowerCase(java.util.Locale.ROOT))) {
            throw new BadRequestException("Email đã được đăng ký: " + request.getEmail());
        }

        if (request.getPhone() != null
                && !request.getPhone().isBlank()
                && userRepository.existsByPhone(request.getPhone().trim())) {
            throw new BadRequestException("Số điện thoại đã được đăng ký: " + request.getPhone());
        }

        if (request.getRole() != null && request.getRole() != Role.CUSTOMER) {
            throw new BadRequestException("Đăng ký công khai chỉ dành cho khách hàng");
        }

        User user =
                User.builder()
                        .username(request.getUsername().trim())
                        .email(request.getEmail().trim().toLowerCase(java.util.Locale.ROOT))
                        .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                        .password(passwordEncoder.encode(request.getPassword()))
                        .fullName(request.getFullName().trim())
                        .role(assignedRole)
                        .active(true)
                        .build();

        User savedUser = userRepository.save(user);

        String accessToken = jwtService.generateToken(savedUser);
        String refreshToken = jwtService.generateRefreshToken(savedUser);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getExpiration() / 1000)
                .user(UserProfileResponse.fromEntity(savedUser))
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user =
                userRepository
                        .findByIdentifier(request.getIdentifier().trim())
                        .orElseThrow(
                                () ->
                                        new BadCredentialsException(
                                                "Tài khoản hoặc mật khẩu không chính xác"));

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            user.getUsername(), request.getPassword()));
        } catch (Exception e) {
            throw new BadCredentialsException("Tài khoản hoặc mật khẩu không chính xác");
        }

        if (!user.isActive()) {
            throw new UnauthorizedException("Tài khoản của bạn đã bị vô hiệu hóa");
        }

        if (request.getPlatform() == LoginRequest.ClientPlatform.MOBILE
                && user.getRole() != Role.CUSTOMER
                && user.getRole() != Role.FIELD_MECHANIC)
            throw new org.springframework.security.access.AccessDeniedException(
                    "Tài khoản này vui lòng đăng nhập trên Web");
        if (request.getPlatform() == LoginRequest.ClientPlatform.WEB
                && user.getRole() != Role.ADMIN
                && user.getRole() != Role.STAFF
                && user.getRole() != Role.GARAGE_OWNER)
            throw new org.springframework.security.access.AccessDeniedException(
                    "Tài khoản này vui lòng đăng nhập trên Mobile");
        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getExpiration() / 1000)
                .user(UserProfileResponse.fromEntity(user))
                .build();
    }

    @Override
    public AuthResponse refreshToken(TokenRefreshRequest request) {
        String refreshToken = request.getRefreshToken();
        try {
            String username = jwtService.extractUsername(refreshToken);
            User user =
                    userRepository
                            .findByUsername(username)
                            .orElseThrow(
                                    () -> new UnauthorizedException("Người dùng không tồn tại"));

            if (!user.isActive() || !jwtService.isRefreshTokenValid(refreshToken, user)) {
                throw new UnauthorizedException("Refresh token không hợp lệ hoặc đã hết hạn");
            }

            String newAccessToken = jwtService.generateToken(user);

            return AuthResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(jwtProperties.getExpiration() / 1000)
                    .user(UserProfileResponse.fromEntity(user))
                    .build();
        } catch (Exception e) {
            throw new UnauthorizedException("Refresh token không hợp lệ: " + e.getMessage());
        }
    }

    @Override
    public UserProfileResponse getCurrentUserProfile(String usernameOrIdentifier) {
        User user =
                userRepository
                        .findByIdentifier(usernameOrIdentifier)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy thông tin người dùng"));
        return UserProfileResponse.fromEntity(user);
    }
}

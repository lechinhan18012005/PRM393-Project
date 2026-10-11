package com.prm393.floodrescue.features.auth.service;

import com.prm393.floodrescue.features.auth.dto.AuthResponse;
import com.prm393.floodrescue.features.auth.dto.LoginRequest;
import com.prm393.floodrescue.features.auth.dto.RegisterRequest;
import com.prm393.floodrescue.features.auth.dto.TokenRefreshRequest;
import com.prm393.floodrescue.features.auth.dto.UserProfileResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(TokenRefreshRequest request);

    UserProfileResponse getCurrentUserProfile(String usernameOrIdentifier);
}

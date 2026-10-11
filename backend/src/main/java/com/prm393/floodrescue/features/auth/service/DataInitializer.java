package com.prm393.floodrescue.features.auth.service;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.demo.seed-users", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUserIfNotExists("admin", "admin@floodrescue.vn", "0900000001", "Password@123", "Nguyễn Quản Trị (Financial Admin)", Role.ADMIN);
        seedUserIfNotExists("staff", "staff@floodrescue.vn", "0900000002", "Password@123", "Trần Điều Hành (Operations Staff)", Role.STAFF);
        seedUserIfNotExists("garage_owner", "garage@floodrescue.vn", "0900000003", "Password@123", "Lê Văn Gara (Chủ Gara Sài Gòn Rescue)", Role.GARAGE_OWNER);
        seedUserIfNotExists("field_mechanic", "mechanic@floodrescue.vn", "0900000004", "Password@123", "Phạm Thợ Cứu Hộ (Đội Cơ Động 01)", Role.FIELD_MECHANIC);
        seedUserIfNotExists("customer", "customer@floodrescue.vn", "0900000005", "Password@123", "Hoàng Văn Khách (Chủ xe máy Honda SH)", Role.CUSTOMER);

        log.info("Initialized demo users");
    }

    private void seedUserIfNotExists(String username, String email, String phone, String rawPassword, String fullName, Role role) {
        if (!userRepository.existsByUsername(username)) {
            User user = User.builder()
                    .username(username)
                    .email(email)
                    .phone(phone)
                    .password(passwordEncoder.encode(rawPassword))
                    .fullName(fullName)
                    .role(role)
                    .active(true)
                    .avatarUrl("https://ui-avatars.com/api/?name=" + fullName.replace(" ", "+") + "&background=random")
                    .build();
            userRepository.save(user);
            log.info("Initialized demo account: {} ({}) with role {}", username, email, role);
        }
    }
}

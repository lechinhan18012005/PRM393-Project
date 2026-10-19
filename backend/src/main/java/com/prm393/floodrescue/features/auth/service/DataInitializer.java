package com.prm393.floodrescue.features.auth.service;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
@ConditionalOnProperty(name = "app.demo.seed-users", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final GarageRepository garageRepository;
    private final GarageBranchRepository branchRepository;
    private final MechanicStaffRepository mechanicRepository;

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Seed demo users
        User admin = seedUserIfNotExists("admin", "admin@floodrescue.vn", "0900000001", "Password@123", "Nguyễn Quản Trị (Financial Admin)", Role.ADMIN);
        User staff = seedUserIfNotExists("staff", "staff@floodrescue.vn", "0900000002", "Password@123", "Trần Điều Hành (Operations Staff)", Role.STAFF);
        User garageOwner = seedUserIfNotExists("garage_owner", "garage@floodrescue.vn", "0900000003", "Password@123", "Lê Văn Gara (Chủ Gara Sài Gòn Rescue)", Role.GARAGE_OWNER);
        User fieldMechanic = seedUserIfNotExists("field_mechanic", "mechanic@floodrescue.vn", "0900000004", "Password@123", "Phạm Thợ Cứu Hộ (Đội Cơ Động 01)", Role.FIELD_MECHANIC);
        User customer = seedUserIfNotExists("customer", "customer@floodrescue.vn", "0900000005", "Password@123", "Hoàng Văn Khách (Chủ xe máy Honda SH)", Role.CUSTOMER);

        User mechanic2 = seedUserIfNotExists("mechanic_02", "mechanic2@floodrescue.vn", "0900000012", "Password@123", "Nguyễn Văn Cường (Đội 2 Q.7)", Role.FIELD_MECHANIC);
        User mechanic3 = seedUserIfNotExists("mechanic_03", "mechanic3@floodrescue.vn", "0900000013", "Password@123", "Đặng Hữu Tài (Đội 3 Q.8)", Role.FIELD_MECHANIC);
        User mechanic4 = seedUserIfNotExists("mechanic_04", "mechanic4@floodrescue.vn", "0900000014", "Password@123", "Trần Hùng (Đội 4 Bình Thạnh)", Role.FIELD_MECHANIC);

        log.info("Initialized demo users");

        // 2. Seed Garage profile for garage_owner
        if (garageOwner != null) {
            Garage garage = garageRepository.findByOwnerId(garageOwner.getId()).orElseGet(() -> {
                Garage newGara = Garage.builder()
                        .owner(garageOwner)
                        .garageName("Gara Cứu Hộ Toàn Thắng Sài Gòn")
                        .phone("0900000003")
                        .businessLicenseUrl("https://res.cloudinary.com/demo/image/upload/sample_license.jpg")
                        .idCardUrl("https://res.cloudinary.com/demo/image/upload/sample_cccd.jpg")
                        .status(GarageStatus.APPROVED)
                        .walletBalance(new BigDecimal("24850000"))
                        .build();
                newGara = garageRepository.save(newGara);
                log.info("Seeded Garage profile: {} for owner: {}", newGara.getGarageName(), garageOwner.getUsername());
                return newGara;
            });

            // 3. Seed initial branches for garage
            List<GarageBranch> existingBranches = branchRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId());
            GarageBranch branch1, branch2, branch3;

            if (existingBranches.isEmpty()) {
                branch1 = GarageBranch.builder()
                        .garage(garage)
                        .branchName("Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)")
                        .address("85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7, TP.HCM")
                        .latitude(10.7380)
                        .longitude(106.7210)
                        .phoneNumber("0903.111.222")
                        .rescueVehicles("1 Xe tải nhẹ + 2 Xe máy chuyên dụng")
                        .operatingStatus(BranchStatus.OPEN)
                        .build();
                branch1 = branchRepository.save(branch1);

                branch2 = GarageBranch.builder()
                        .garage(garage)
                        .branchName("Chi nhánh 2 (Q.8 - Phạm Thế Hiển)")
                        .address("340 Phạm Thế Hiển, Phường 3, Quận 8, TP.HCM")
                        .latitude(10.7420)
                        .longitude(106.6850)
                        .phoneNumber("0903.111.333")
                        .rescueVehicles("2 Xe máy cứu hộ ngập")
                        .operatingStatus(BranchStatus.OPEN)
                        .build();
                branch2 = branchRepository.save(branch2);

                branch3 = GarageBranch.builder()
                        .garage(garage)
                        .branchName("Chi nhánh 3 (Bình Thạnh - Ung Văn Khiêm)")
                        .address("45 Ung Văn Khiêm, Phường 25, Bình Thạnh, TP.HCM")
                        .latitude(10.8030)
                        .longitude(106.7150)
                        .phoneNumber("0903.111.444")
                        .rescueVehicles("1 Xe bán tải + 3 Xe máy")
                        .operatingStatus(BranchStatus.OPEN)
                        .build();
                branch3 = branchRepository.save(branch3);

                log.info("Seeded 3 rescue branches for garage id: {}", garage.getId());
            } else {
                branch1 = existingBranches.get(0);
                branch2 = existingBranches.size() > 1 ? existingBranches.get(1) : branch1;
                branch3 = existingBranches.size() > 2 ? existingBranches.get(2) : branch1;
            }

            // 4. Seed mechanic staff allocations
            seedMechanicStaffIfNotExists(fieldMechanic, garage, branch1, "Ca trực bão Q7", "Sửa bugi ngập, kích bình, thay nhớt hút chân không");
            seedMechanicStaffIfNotExists(mechanic2, garage, branch1, "Ca sáng", "Cứu hộ kéo xe máy ngập sâu");
            seedMechanicStaffIfNotExists(mechanic3, garage, branch2, "Ca trực bão Q8", "Xử lý thủy kích xe tay ga");
            seedMechanicStaffIfNotExists(mechanic4, garage, branch3, "Ca đêm Bình Thạnh", "Xe chở gom vượt ngập");
        }
    }

    private User seedUserIfNotExists(String username, String email, String phone, String rawPassword, String fullName, Role role) {
        return userRepository.findByUsername(username).orElseGet(() -> {
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
            user = userRepository.save(user);
            log.info("Initialized demo account: {} ({}) with role {}", username, email, role);
            return user;
        });
    }

    private void seedMechanicStaffIfNotExists(User user, Garage garage, GarageBranch branch, String shiftName, String speciality) {
        if (user != null && mechanicRepository.findByUserId(user.getId()).isEmpty()) {
            MechanicStaff mechanic = MechanicStaff.builder()
                    .user(user)
                    .garage(garage)
                    .branch(branch)
                    .workingStatus(MechanicStatus.AVAILABLE)
                    .shiftName(shiftName)
                    .ratingAvg(5.0)
                    .speciality(speciality)
                    .currentLatitude(branch.getLatitude())
                    .currentLongitude(branch.getLongitude())
                    .build();
            mechanicRepository.save(mechanic);
            log.info("Seeded mechanic staff {} allocated to branch {}", user.getUsername(), branch.getBranchName());
        }
    }
}

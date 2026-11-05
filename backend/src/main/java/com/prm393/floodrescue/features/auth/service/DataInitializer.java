package com.prm393.floodrescue.features.auth.service;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.finance.entity.*;
import com.prm393.floodrescue.features.finance.repository.CommissionConfigRepository;
import com.prm393.floodrescue.features.finance.repository.PayoutRequestRepository;
import com.prm393.floodrescue.features.finance.repository.ServiceDisputeRepository;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.entity.ServiceItem;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStatus;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.payment.entity.PaymentMethod;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rating.entity.ServiceRating;
import com.prm393.floodrescue.features.rating.repository.ServiceRatingRepository;
import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * =================================================================================================
 * TÀI LIỆU KỸ THUẬT & GIẢI THÍCH MÃ NGUỒN (TECHNICAL DOCUMENTATION)
 * =================================================================================================
 * Phân hệ (Module): Khởi tạo Dữ liệu Nền tảng & Hạt giống Cơ sở dữ liệu (Database Seeding)
 * Tác giả phụ trách: Nguyễn Hoàng Long
 *
 * Cơ chế hoạt động:
 *   - Chỉ kích hoạt khi cấu hình `app.demo.seed-users=true` (được tắt hoàn toàn `false` trong
 *     `application-test.yml` để đảm bảo 100% tính độc lập của các bộ kiểm thử `@SpringBootTest`).
 *   - Mọi bước khởi tạo đều được thiết kế theo nguyên lý Lũy đẳng (Idempotent Seeding): kiểm tra
 *     sự tồn tại của bản ghi hoặc `repository.count() == 0` trước khi chèn, đảm bảo khởi động lại
 *     ứng dụng nhiều lần không bao giờ gây lỗi trùng khóa (`Duplicate Key`).
 *   - Cung cấp dữ liệu thực tế tiếng Việt đầy đủ cho toàn bộ các bảng:
 *       1. Tài khoản người dùng (`users`): Admin, Staff, Chủ Gara, Thợ cứu hộ, Khách hàng.
 *       2. Hồ sơ Gara (`garages`), Chi nhánh (`garage_branches`), Danh mục dịch vụ (`garage_service_catalog`)
 *          và Tỷ lệ chiết khấu hoa hồng riêng (`commissionRate`) cho 4 đối tác Gara tiêu biểu tại TP.HCM.
 *       3. Lịch sử cấu hình hoa hồng nền tảng (`commission_configs` - UC-24).
 *       4. Đơn cứu hộ (`rescue_orders`) & Giao dịch thanh toán PayOS VietQR / Tiền mặt (`payment_transactions` - UC-18, UC-25).
 *       5. Sổ cái biến động số dư ví Gara (`wallet_transactions` - UC-26).
 *       6. Yêu cầu rút tiền của Gara (`payout_requests` - UC-26).
 *       7. Hồ sơ khiếu nại & hoàn tiền (`service_disputes` - UC-23, UC-27).
 *       8. Đánh giá chất lượng dịch vụ 1-5 sao (`service_ratings` - UC-19).
 * =================================================================================================
 */
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
    private final ServiceItemRepository serviceItemRepository;

    @Autowired(required = false)
    private CommissionConfigRepository commissionConfigRepository;

    @Autowired(required = false)
    private RescueOrderRepository rescueOrderRepository;

    @Autowired(required = false)
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired(required = false)
    private WalletTransactionRepository walletTransactionRepository;

    @Autowired(required = false)
    private PayoutRequestRepository payoutRequestRepository;

    @Autowired(required = false)
    private ServiceDisputeRepository serviceDisputeRepository;

    @Autowired(required = false)
    private ServiceRatingRepository serviceRatingRepository;

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Seed demo users (Admin, Staffs, Garage Owners, Field Mechanics, Customers)
        User admin = seedUserIfNotExists("admin", "admin@floodrescue.vn", "0900000001", "Password@123", "Nguyễn Quản Trị (Financial Admin)", Role.ADMIN);
        User staff = seedUserIfNotExists("staff", "staff@floodrescue.vn", "0900000002", "Password@123", "Trần Điều Hành (Operations Staff)", Role.STAFF);
        User staff2 = seedUserIfNotExists("staff_cskh", "cskh.mai@floodrescue.vn", "0900000022", "Password@123", "Nguyễn Thị Mai (Thanh Tra CSKH & SLA)", Role.STAFF);
        User staff3 = seedUserIfNotExists("staff_kyc", "kyc.nam@floodrescue.vn", "0900000023", "Password@123", "Lê Hoàng Nam (Thẩm Định Hồ Sơ Gara)", Role.STAFF);

        User garageOwner = seedUserIfNotExists("garage_owner", "garage@floodrescue.vn", "0900000003", "Password@123", "Lê Văn Gara (Chủ Gara Toàn Thắng Sài Gòn)", Role.GARAGE_OWNER);
        User garageOwner2 = seedUserIfNotExists("garage_thanhcong", "thanhcong.garage@floodrescue.vn", "0900000032", "Password@123", "Đỗ Minh Thành (Chủ Trạm Sửa Xe Thành Công)", Role.GARAGE_OWNER);
        User garageOwner3 = seedUserIfNotExists("garage_saigon247", "saigon247.garage@floodrescue.vn", "0900000033", "Password@123", "Võ Quốc Bảo (Chủ Gara Lưu Động Sài Gòn 24/7)", Role.GARAGE_OWNER);
        User garageOwner4 = seedUserIfNotExists("garage_tuankiet", "tuankiet.garage@floodrescue.vn", "0900000034", "Password@123", "Phan Tuấn Kiệt (Chủ Gara Tuấn Kiệt Thủ Đức)", Role.GARAGE_OWNER);

        User fieldMechanic = seedUserIfNotExists("field_mechanic", "mechanic@floodrescue.vn", "0900000004", "Password@123", "Phạm Thợ Cứu Hộ (Đội Cơ Động 01)", Role.FIELD_MECHANIC);
        User customer = seedUserIfNotExists("customer", "customer@floodrescue.vn", "0900000005", "Password@123", "Hoàng Văn Khách (Chủ xe máy Honda SH)", Role.CUSTOMER);
        User customer2 = seedUserIfNotExists("customer_02", "khachhang.lan@floodrescue.vn", "0900000015", "Password@123", "Trần Ngọc Lan (Chủ xe Vespa Sprint)", Role.CUSTOMER);
        User customer3 = seedUserIfNotExists("customer_03", "khachhang.hung@floodrescue.vn", "0900000016", "Password@123", "Phạm Minh Hùng (Chủ xe Yamaha NVX)", Role.CUSTOMER);

        User mechanic2 = seedUserIfNotExists("mechanic_02", "mechanic2@floodrescue.vn", "0900000012", "Password@123", "Nguyễn Văn Cường (Đội 2 Q.7)", Role.FIELD_MECHANIC);
        User mechanic3 = seedUserIfNotExists("mechanic_03", "mechanic3@floodrescue.vn", "0900000013", "Password@123", "Đặng Hữu Tài (Đội 3 Q.8)", Role.FIELD_MECHANIC);
        User mechanic4 = seedUserIfNotExists("mechanic_04", "mechanic4@floodrescue.vn", "0900000014", "Password@123", "Trần Hùng (Đội 4 Bình Thạnh)", Role.FIELD_MECHANIC);

        log.info("Initialized demo users");

        // 2. Seed Garage #1 (Gara Cứu Hộ Toàn Thắng Sài Gòn)
        Garage garage1 = null;
        ServiceItem g1CrossingService = null;
        ServiceItem g1RepairService = null;
        MechanicStaff primaryMechanic = null;

        if (garageOwner != null) {
            garage1 = garageRepository.findByOwnerId(garageOwner.getId()).orElseGet(() -> {
                Garage newGara = Garage.builder()
                        .owner(garageOwner)
                        .garageName("Gara Cứu Hộ Toàn Thắng Sài Gòn")
                        .phone("0900000003")
                        .businessLicenseUrl("https://res.cloudinary.com/demo/image/upload/sample_license.jpg")
                        .idCardUrl("https://res.cloudinary.com/demo/image/upload/sample_cccd.jpg")
                        .status(GarageStatus.APPROVED)
                        .commissionRate(new BigDecimal("12.50"))
                        .walletBalance(new BigDecimal("24850000.00"))
                        .build();
                newGara = garageRepository.save(newGara);
                log.info("Seeded Garage profile: {} for owner: {}", newGara.getGarageName(), garageOwner.getUsername());
                return newGara;
            });

            if (garage1.getCommissionRate() == null) {
                garage1.setCommissionRate(new BigDecimal("12.50"));
                garage1 = garageRepository.save(garage1);
            }

            // 3. Seed initial branches for garage 1
            List<GarageBranch> existingBranches = branchRepository.findByGarageIdOrderByCreatedAtAsc(garage1.getId());
            GarageBranch branch1, branch2, branch3;

            if (existingBranches.isEmpty()) {
                branch1 = GarageBranch.builder()
                        .garage(garage1)
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
                        .garage(garage1)
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
                        .garage(garage1)
                        .branchName("Chi nhánh 3 (Bình Thạnh - Ung Văn Khiêm)")
                        .address("45 Ung Văn Khiêm, Phường 25, Bình Thạnh, TP.HCM")
                        .latitude(10.8030)
                        .longitude(106.7150)
                        .phoneNumber("0903.111.444")
                        .rescueVehicles("1 Xe bán tải + 3 Xe máy")
                        .operatingStatus(BranchStatus.OPEN)
                        .build();
                branch3 = branchRepository.save(branch3);

                log.info("Seeded 3 rescue branches for garage id: {}", garage1.getId());
            } else {
                branch1 = existingBranches.get(0);
                branch2 = existingBranches.size() > 1 ? existingBranches.get(1) : branch1;
                branch3 = existingBranches.size() > 2 ? existingBranches.get(2) : branch1;
            }

            // 4. Seed mechanic staff allocations
            primaryMechanic = seedMechanicStaffIfNotExists(fieldMechanic, garage1, branch1, "Ca trực bão Q7", "Sửa bugi ngập, kích bình, thay nhớt hút chân không");
            seedMechanicStaffIfNotExists(mechanic2, garage1, branch1, "Ca sáng", "Cứu hộ kéo xe máy ngập sâu");
            seedMechanicStaffIfNotExists(mechanic3, garage1, branch2, "Ca trực bão Q8", "Xử lý thủy kích xe tay ga");
            seedMechanicStaffIfNotExists(mechanic4, garage1, branch3, "Ca đêm Bình Thạnh", "Xe chở gom vượt ngập");

            // 5. Seed service catalog for garage 1
            g1CrossingService = seedServiceItemIfNotExists(garage1, "Chở xe qua ngập (Chuyến riêng)", ServiceType.CROSSING, new BigDecimal("120000"), "Chở riêng 1 xe máy và khách qua đoạn đường ngập sâu bằng phương tiện chuyên dụng đến nơi khô ráo");
            g1RepairService = seedServiceItemIfNotExists(garage1, "Sấy bugi & Xả nước buồng đốt", ServiceType.REPAIR_ONSITE, new BigDecimal("80000"), "Khắc phục xe chết máy do ngập nước tại chỗ");
            ServiceItem towingService = seedServiceItemIfNotExists(
                    garage1,
                    "Kéo xe ngập nước về gara",
                    ServiceType.TOWING,
                    new BigDecimal("120000"),
                    "Kéo xe ngập nước về chi nhánh gara và bàn giao; không bao gồm sửa chữa"
            );
            BigDecimal towingPrice = new BigDecimal("120000");
            if (towingService.getStandardPrice() == null
                    || towingService.getStandardPrice().compareTo(towingPrice) != 0) {
                towingService.setStandardPrice(towingPrice);
                towingService.setMinPrice(towingPrice.multiply(BigDecimal.valueOf(0.9)));
                towingService.setMaxPrice(towingPrice.multiply(BigDecimal.valueOf(1.2)));
                serviceItemRepository.save(towingService);
            }
            seedServiceItemIfNotExists(garage1, "Cứu hộ xe ngập nước tận nơi 24/7", ServiceType.REPAIR_ONSITE, new BigDecimal("180000"), "Combo hút nước ống xả, vệ sinh họng ga, thay bugi chống ẩm tại hiện trường");
        }

        // 6. Seed Garage #2, #3, #4 so Web Admin has 4 rich partner garages with distinct commission rates & services
        Garage garage2 = seedPartnerGarageWithBranchAndServices(
                garageOwner2,
                "Trạm Sửa Xe Ngập Nước Thành Công",
                "0900000032",
                new BigDecimal("10.00"),
                new BigDecimal("18400000.00"),
                "Trụ sở Quận 3 (Nguyễn Thị Minh Khai)",
                "112 Nguyễn Thị Minh Khai, Phường Võ Thị Sáu, Quận 3, TP.HCM",
                10.7795, 106.6915,
                "Súc rửa động cơ thủy kích", ServiceType.REPAIR_ONSITE, new BigDecimal("350000"),
                "Thay bugi & lọc gió chính hãng", ServiceType.REPAIR_ONSITE, new BigDecimal("140000")
        );

        Garage garage3 = seedPartnerGarageWithBranchAndServices(
                garageOwner3,
                "Gara Lưu Động Sài Gòn 24/7",
                "0900000033",
                new BigDecimal("15.00"),
                new BigDecimal("14250000.00"),
                "Trạm Cứu Hộ Khu Đông (Võ Văn Ngân)",
                "218 Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP.HCM",
                10.8505, 106.7640,
                "Kéo xe cứu hộ khẩn cấp", ServiceType.TOWING, new BigDecimal("220000"),
                "Xử lý chết máy & thay nhớt hộp số ngập nước", ServiceType.REPAIR_ONSITE, new BigDecimal("190000")
        );

        Garage garage4 = seedPartnerGarageWithBranchAndServices(
                garageOwner4,
                "Gara Tuấn Kiệt Thủ Đức",
                "0900000034",
                new BigDecimal("12.00"),
                new BigDecimal("9600000.00"),
                "Chi nhánh Hiệp Bình Chánh (Kha Vạn Cân)",
                "56 Kha Vạn Cân, Phường Hiệp Bình Chánh, TP. Thủ Đức, TP.HCM",
                10.8280, 106.7235,
                "Cứu hộ xe ngập nước tận nơi", ServiceType.CROSSING, new BigDecimal("150000"),
                "Sấy khô hệ thống đánh lửa & ECU", ServiceType.REPAIR_ONSITE, new BigDecimal("250000")
        );

        // 7. Seed Finance, Payment, Dispute & Rating records for Web Admin dashboards
        try {
            seedFinanceAndOperationalData(
                    admin, staff, staff2,
                    customer, customer2, customer3,
                    garage1, garage2, garage3, garage4,
                    g1CrossingService, g1RepairService,
                    primaryMechanic
            );
        } catch (Exception e) {
            log.warn("Could not seed auxiliary finance demo data: {}", e.getMessage());
        }
    }

    private Garage seedPartnerGarageWithBranchAndServices(
            User owner,
            String garageName,
            String phone,
            BigDecimal commissionRate,
            BigDecimal walletBalance,
            String branchName,
            String address,
            Double lat,
            Double lng,
            String service1Name,
            ServiceType service1Type,
            BigDecimal service1Price,
            String service2Name,
            ServiceType service2Type,
            BigDecimal service2Price
    ) {
        if (owner == null) return null;
        Garage garage = garageRepository.findByOwnerId(owner.getId()).orElseGet(() -> {
            Garage g = Garage.builder()
                    .owner(owner)
                    .garageName(garageName)
                    .phone(phone)
                    .businessLicenseUrl("https://res.cloudinary.com/demo/image/upload/sample_license.jpg")
                    .idCardUrl("https://res.cloudinary.com/demo/image/upload/sample_cccd.jpg")
                    .status(GarageStatus.APPROVED)
                    .commissionRate(commissionRate)
                    .walletBalance(walletBalance)
                    .build();
            return garageRepository.save(g);
        });

        if (garage.getCommissionRate() == null) {
            garage.setCommissionRate(commissionRate);
            garage = garageRepository.save(garage);
        }

        if (branchRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId()).isEmpty()) {
            branchRepository.save(GarageBranch.builder()
                    .garage(garage)
                    .branchName(branchName)
                    .address(address)
                    .latitude(lat)
                    .longitude(lng)
                    .phoneNumber(phone)
                    .rescueVehicles("1 Xe bán tải chuyên dụng + 2 Xe máy cứu hộ")
                    .operatingStatus(BranchStatus.OPEN)
                    .build());
        }

        seedServiceItemIfNotExists(garage, service1Name, service1Type, service1Price, "Dịch vụ cứu hộ và khắc phục sự cố ngập nước theo tiêu chuẩn niêm yết");
        seedServiceItemIfNotExists(garage, service2Name, service2Type, service2Price, "Bảo hành 7 ngày sau khi xử lý ngập nước");
        return garage;
    }

    private void seedFinanceAndOperationalData(
            User admin,
            User staff,
            User staff2,
            User customer1,
            User customer2,
            User customer3,
            Garage garage1,
            Garage garage2,
            Garage garage3,
            Garage garage4,
            ServiceItem g1CrossingService,
            ServiceItem g1RepairService,
            MechanicStaff primaryMechanic
    ) {
        if (garage1 == null || customer1 == null) {
            return;
        }
        Garage g2 = garage2 != null ? garage2 : garage1;
        Garage g3 = garage3 != null ? garage3 : garage1;
        Garage g4 = garage4 != null ? garage4 : garage1;
        User c2 = customer2 != null ? customer2 : customer1;
        User c3 = customer3 != null ? customer3 : customer1;
        ServiceItem defaultService = g1CrossingService != null
                ? g1CrossingService
                : serviceItemRepository.findByGarageIdOrderByCreatedAtAsc(garage1.getId()).stream().findFirst().orElse(null);
        ServiceItem repairService = g1RepairService != null ? g1RepairService : defaultService;

        // A. Seed CommissionConfig history (3 versions) if empty
        if (commissionConfigRepository != null && commissionConfigRepository.count() == 0) {
            commissionConfigRepository.save(CommissionConfig.builder()
                    .globalRate(new BigDecimal("15.00"))
                    .singleCrossingRate(new BigDecimal("15.00"))
                    .batchCrossingRate(new BigDecimal("12.00"))
                    .waterloggedRepairRate(new BigDecimal("16.00"))
                    .surgeHoursRate(new BigDecimal("10.00"))
                    .subsidyRate(new BigDecimal("12.00"))
                    .baseFee(new BigDecimal("25000.00"))
                    .perKmFee(new BigDecimal("10000.00"))
                    .versionCode("v2.2")
                    .changeSummary("Cấu hình phí hoa hồng giai đoạn vận hành đầu mùa mưa")
                    .approvalReason("Quyết định phê duyệt khung phí ban đầu của Ban Giám đốc")
                    .active(false)
                    .updatedBy(admin)
                    .build());

            commissionConfigRepository.save(CommissionConfig.builder()
                    .globalRate(new BigDecimal("13.50"))
                    .singleCrossingRate(new BigDecimal("13.50"))
                    .batchCrossingRate(new BigDecimal("10.50"))
                    .waterloggedRepairRate(new BigDecimal("15.00"))
                    .surgeHoursRate(new BigDecimal("9.00"))
                    .subsidyRate(new BigDecimal("14.00"))
                    .baseFee(new BigDecimal("25000.00"))
                    .perKmFee(new BigDecimal("10000.00"))
                    .versionCode("v2.3")
                    .changeSummary("Điều chỉnh giảm 1.5% phí sàn hỗ trợ Gara đối tác mở rộng đội xe cứu hộ")
                    .approvalReason("Biên bản họp điều hành tài chính quý III/2026")
                    .active(false)
                    .updatedBy(admin)
                    .build());

            commissionConfigRepository.save(CommissionConfig.builder()
                    .globalRate(new BigDecimal("12.50"))
                    .singleCrossingRate(new BigDecimal("12.50"))
                    .batchCrossingRate(new BigDecimal("10.00"))
                    .waterloggedRepairRate(new BigDecimal("15.00"))
                    .surgeHoursRate(new BigDecimal("8.00"))
                    .subsidyRate(new BigDecimal("15.00"))
                    .baseFee(new BigDecimal("25000.00"))
                    .perKmFee(new BigDecimal("10000.00"))
                    .versionCode("v2.4")
                    .changeSummary("Khởi tạo cấu hình hoa hồng chuẩn 12.5% cao điểm triều cường & mưa ngập")
                    .approvalReason("Triển khai đồng bộ toàn hệ sinh thái cứu hộ TP.HCM")
                    .active(true)
                    .updatedBy(admin)
                    .build());
            log.info("Seeded 3 CommissionConfig history entries");
        }

        // B. Seed sample RescueOrders & PaymentTransactions if paymentTransactionRepository is empty
        if (paymentTransactionRepository != null && rescueOrderRepository != null
                && paymentTransactionRepository.count() == 0 && defaultService != null) {

            RescueOrder order1 = createSampleRescueOrder(
                    "SOS-2026-8801", customer1, garage1, primaryMechanic, defaultService,
                    OrderType.SINGLE_CROSSING, RescueOrderStatus.COMPLETED,
                    "59-T2 688.12", "180 Huỳnh Tấn Phát, Quận 7", "Khu chế xuất Tân Thuận, Quận 7",
                    new BigDecimal("350000.00"), "PAYOS", 2610198801L
            );
            RescueOrder order2 = createSampleRescueOrder(
                    "SOS-2026-8802", c2, g2, primaryMechanic, repairService,
                    OrderType.ONSITE_REPAIR, RescueOrderStatus.COMPLETED,
                    "59-F1 452.90", "240 Nguyễn Hữu Cảnh, Bình Thạnh", "268 Điện Biên Phủ, Bình Thạnh",
                    new BigDecimal("520000.00"), "PAYOS", 2610198802L
            );
            RescueOrder order3 = createSampleRescueOrder(
                    "SOS-2026-8803", c3, g3, primaryMechanic, repairService,
                    OrderType.ONSITE_REPAIR, RescueOrderStatus.COMPLETED,
                    "59-X3 119.45", "Ngã tư Thủ Đức, Võ Văn Ngân", "218 Võ Văn Ngân, TP. Thủ Đức",
                    new BigDecimal("850000.00"), "PAYOS", 2610198803L
            );
            RescueOrder order4 = createSampleRescueOrder(
                    "SOS-2026-8804", customer1, garage1, primaryMechanic, defaultService,
                    OrderType.SINGLE_CROSSING, RescueOrderStatus.COMPLETED,
                    "59-P2 773.01", "Cầu Kênh Tẻ, Quận 4", "Lotte Mart Quận 7, Nguyễn Hữu Thọ",
                    new BigDecimal("420000.00"), "CASH", 2610198804L
            );
            RescueOrder order5 = createSampleRescueOrder(
                    "SOS-2026-8805", c2, g3, primaryMechanic, repairService,
                    OrderType.ONSITE_REPAIR, RescueOrderStatus.COMPLETED,
                    "59-D1 908.34", "Đường Quốc Hương, Thảo Điền, TP. Thủ Đức", "Trạm Cứu Hộ Thảo Điền",
                    new BigDecimal("680000.00"), "PAYOS", 2610198805L
            );
            RescueOrder order6 = createSampleRescueOrder(
                    "SOS-2026-8806", c3, g4, primaryMechanic, defaultService,
                    OrderType.SINGLE_CROSSING, RescueOrderStatus.PAYMENT_PENDING,
                    "59-S2 334.77", "Chợ Thủ Đức, Kha Vạn Cân", "Ngã tư Bình Triệu, Hiệp Bình Chánh",
                    new BigDecimal("450000.00"), null, 2610198806L
            );

            PaymentTransaction tx1 = paymentTransactionRepository.save(PaymentTransaction.builder()
                    .rescueOrderId(order1.getId())
                    .rescueCode(order1.getOrderCode())
                    .orderType("SINGLE_CROSSING")
                    .garage(garage1)
                    .customer(customer1)
                    .payosOrderCode(2610198801L)
                    .amount(new BigDecimal("350000.00"))
                    .commissionRate(new BigDecimal("12.50"))
                    .platformFee(new BigDecimal("43750.00"))
                    .netGarageAmount(new BigDecimal("306250.00"))
                    .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                    .status(PaymentStatus.SUCCESS)
                    .reconciled(true)
                    .checksumValid(true)
                    .webhookSignature("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08")
                    .bankName("MB Bank (Ngân hàng Quân Đội)")
                    .accountNumber("038299482910")
                    .accountHolder("HE THONG CUU HO HYDRORESCUE")
                    .paymentContent("RESCUE 2610198801")
                    .paidAt(LocalDateTime.now().minusHours(18))
                    .reconciledAt(LocalDateTime.now().minusHours(18))
                    .build());

            PaymentTransaction tx2 = paymentTransactionRepository.save(PaymentTransaction.builder()
                    .rescueOrderId(order2.getId())
                    .rescueCode(order2.getOrderCode())
                    .orderType("ONSITE_REPAIR")
                    .garage(g2)
                    .customer(c2)
                    .payosOrderCode(2610198802L)
                    .amount(new BigDecimal("520000.00"))
                    .commissionRate(new BigDecimal("10.00"))
                    .platformFee(new BigDecimal("52000.00"))
                    .netGarageAmount(new BigDecimal("468000.00"))
                    .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                    .status(PaymentStatus.SUCCESS)
                    .reconciled(true)
                    .checksumValid(true)
                    .webhookSignature("4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a")
                    .bankName("MB Bank (Ngân hàng Quân Đội)")
                    .accountNumber("038299482910")
                    .accountHolder("HE THONG CUU HO HYDRORESCUE")
                    .paymentContent("RESCUE 2610198802")
                    .paidAt(LocalDateTime.now().minusHours(12))
                    .reconciledAt(LocalDateTime.now().minusHours(12))
                    .build());

            PaymentTransaction tx3 = paymentTransactionRepository.save(PaymentTransaction.builder()
                    .rescueOrderId(order3.getId())
                    .rescueCode(order3.getOrderCode())
                    .orderType("ONSITE_REPAIR")
                    .garage(g3)
                    .customer(c3)
                    .payosOrderCode(2610198803L)
                    .amount(new BigDecimal("850000.00"))
                    .commissionRate(new BigDecimal("15.00"))
                    .platformFee(new BigDecimal("127500.00"))
                    .netGarageAmount(new BigDecimal("722500.00"))
                    .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                    .status(PaymentStatus.SUCCESS)
                    .reconciled(true)
                    .checksumValid(true)
                    .webhookSignature("ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d")
                    .bankName("MB Bank (Ngân hàng Quân Đội)")
                    .accountNumber("038299482910")
                    .accountHolder("HE THONG CUU HO HYDRORESCUE")
                    .paymentContent("RESCUE 2610198803")
                    .paidAt(LocalDateTime.now().minusHours(8))
                    .reconciledAt(LocalDateTime.now().minusHours(8))
                    .build());

            PaymentTransaction tx4 = paymentTransactionRepository.save(PaymentTransaction.builder()
                    .rescueOrderId(order4.getId())
                    .rescueCode(order4.getOrderCode())
                    .orderType("SINGLE_CROSSING")
                    .garage(garage1)
                    .customer(customer1)
                    .payosOrderCode(2610198804L)
                    .amount(new BigDecimal("420000.00"))
                    .commissionRate(new BigDecimal("12.50"))
                    .platformFee(new BigDecimal("52500.00"))
                    .netGarageAmount(new BigDecimal("367500.00"))
                    .paymentMethod(PaymentMethod.CASH)
                    .status(PaymentStatus.SUCCESS)
                    .reconciled(true)
                    .checksumValid(true)
                    .paymentContent("CASH 2610198804")
                    .paidAt(LocalDateTime.now().minusHours(5))
                    .reconciledAt(LocalDateTime.now().minusHours(5))
                    .build());

            PaymentTransaction tx5 = paymentTransactionRepository.save(PaymentTransaction.builder()
                    .rescueOrderId(order5.getId())
                    .rescueCode(order5.getOrderCode())
                    .orderType("ONSITE_REPAIR")
                    .garage(g3)
                    .customer(c2)
                    .payosOrderCode(2610198805L)
                    .amount(new BigDecimal("680000.00"))
                    .commissionRate(new BigDecimal("15.00"))
                    .platformFee(new BigDecimal("102000.00"))
                    .netGarageAmount(new BigDecimal("578000.00"))
                    .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                    .status(PaymentStatus.REFUNDED)
                    .reconciled(true)
                    .checksumValid(true)
                    .webhookSignature("e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683")
                    .bankName("MB Bank (Ngân hàng Quân Đội)")
                    .accountNumber("038299482910")
                    .accountHolder("HE THONG CUU HO HYDRORESCUE")
                    .paymentContent("RESCUE 2610198805")
                    .paidAt(LocalDateTime.now().minusHours(24))
                    .reconciledAt(LocalDateTime.now().minusHours(20))
                    .build());

            paymentTransactionRepository.save(PaymentTransaction.builder()
                    .rescueOrderId(order6.getId())
                    .rescueCode(order6.getOrderCode())
                    .orderType("SINGLE_CROSSING")
                    .garage(g4)
                    .customer(c3)
                    .payosOrderCode(2610198806L)
                    .amount(new BigDecimal("450000.00"))
                    .commissionRate(new BigDecimal("12.00"))
                    .platformFee(new BigDecimal("54000.00"))
                    .netGarageAmount(new BigDecimal("396000.00"))
                    .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                    .status(PaymentStatus.PENDING)
                    .reconciled(false)
                    .checksumValid(true)
                    .bankName("MB Bank (Ngân hàng Quân Đội)")
                    .accountNumber("038299482910")
                    .accountHolder("HE THONG CUU HO HYDRORESCUE")
                    .paymentContent("RESCUE 2610198806")
                    .build());

            log.info("Seeded 6 sample RescueOrders and PaymentTransactions");

            // C. Seed WalletTransactions if empty
            if (walletTransactionRepository != null && walletTransactionRepository.count() == 0) {
                walletTransactionRepository.save(WalletTransaction.builder()
                        .garage(garage1)
                        .amount(new BigDecimal("306250.00"))
                        .balanceAfter(new BigDecimal("29902500.00"))
                        .transactionType(WalletTransactionType.ORDER_INCOME)
                        .referenceCode("PAYOS-2610198801")
                        .description("Thu hộ VietQR PayOS đơn cứu hộ SOS-2026-8801 (Đã trừ phí sàn 12.5%)")
                        .build());

                walletTransactionRepository.save(WalletTransaction.builder()
                        .garage(garage1)
                        .amount(new BigDecimal("-52500.00"))
                        .balanceAfter(new BigDecimal("29850000.00"))
                        .transactionType(WalletTransactionType.COMMISSION_DEDUCT)
                        .referenceCode("CASH-2610198804")
                        .description("Khấu trừ hoa hồng nền tảng (12.5%) cho đơn thu tiền mặt SOS-2026-8804")
                        .build());

                walletTransactionRepository.save(WalletTransaction.builder()
                        .garage(garage1)
                        .amount(new BigDecimal("-5000000.00"))
                        .balanceAfter(new BigDecimal("24850000.00"))
                        .transactionType(WalletTransactionType.PAYOUT_WITHDRAW)
                        .referenceCode("PO-2026-A81901")
                        .description("Giải ngân rút tiền về TK VCB - 0071000892831 (UNC: TXN-NAPAS-2026881)")
                        .build());

                walletTransactionRepository.save(WalletTransaction.builder()
                        .garage(g2)
                        .amount(new BigDecimal("468000.00"))
                        .balanceAfter(new BigDecimal("18400000.00"))
                        .transactionType(WalletTransactionType.ORDER_INCOME)
                        .referenceCode("PAYOS-2610198802")
                        .description("Thu hộ VietQR PayOS đơn cứu hộ SOS-2026-8802 (Chiết khấu ưu đãi 10%)")
                        .build());

                walletTransactionRepository.save(WalletTransaction.builder()
                        .garage(g3)
                        .amount(new BigDecimal("-250000.00"))
                        .balanceAfter(new BigDecimal("14250000.00"))
                        .transactionType(WalletTransactionType.DISPUTE_REFUND_DEDUCT)
                        .referenceCode("REF-880501")
                        .description("Khấu trừ hoàn tiền khiếu nại REF-880501 cho đơn SOS-2026-8805 (Hoàn khách: 250.000 đ)")
                        .build());
                log.info("Seeded 5 sample WalletTransactions");
            }

            // D. Seed PayoutRequests if empty
            if (payoutRequestRepository != null && payoutRequestRepository.count() == 0) {
                payoutRequestRepository.save(PayoutRequest.builder()
                        .requestCode("PO-2026-A81901")
                        .garage(garage1)
                        .bankCode("VCB")
                        .bankName("Vietcombank - CN Nam Sài Gòn")
                        .accountNumber("0071000892831")
                        .accountHolderName("LE VAN GARA")
                        .requestedAmount(new BigDecimal("5000000.00"))
                        .walletBalanceSnapshot(new BigDecimal("29850000.00"))
                        .status(PayoutStatus.TRANSFERRED)
                        .adminReviewer(admin)
                        .transactionReference("TXN-NAPAS-2026881")
                        .adminNote("Đã kiểm tra đối soát hợp lệ và giải ngân thành công qua cổng Napas247")
                        .processedAt(LocalDateTime.now().minusHours(4))
                        .build());

                payoutRequestRepository.save(PayoutRequest.builder()
                        .requestCode("PO-2026-B92014")
                        .garage(g2)
                        .bankCode("ACB")
                        .bankName("Ngân hàng Á Châu (ACB)")
                        .accountNumber("19882736451")
                        .accountHolderName("DO MINH THANH")
                        .requestedAmount(new BigDecimal("4500000.00"))
                        .walletBalanceSnapshot(new BigDecimal("18400000.00"))
                        .status(PayoutStatus.PENDING)
                        .adminNote("Đang chờ Admin Tài chính phê duyệt phiên giải ngân chiều")
                        .build());

                payoutRequestRepository.save(PayoutRequest.builder()
                        .requestCode("PO-2026-C33108")
                        .garage(g3)
                        .bankCode("MB")
                        .bankName("MB Bank (Ngân hàng Quân Đội)")
                        .accountNumber("090333888999")
                        .accountHolderName("VO QUOC BAO")
                        .requestedAmount(new BigDecimal("3200000.00"))
                        .walletBalanceSnapshot(new BigDecimal("14250000.00"))
                        .status(PayoutStatus.APPROVED)
                        .adminReviewer(admin)
                        .adminNote("Hồ sơ eKYC và số dư hợp lệ, đã duyệt lệnh chờ kế toán chuyển khoản")
                        .processedAt(LocalDateTime.now().minusHours(1))
                        .build());

                payoutRequestRepository.save(PayoutRequest.builder()
                        .requestCode("PO-2026-D41029")
                        .garage(g4)
                        .bankCode("TCB")
                        .bankName("Techcombank")
                        .accountNumber("19034455667788")
                        .accountHolderName("PHAN TUAN KIET")
                        .requestedAmount(new BigDecimal("2000000.00"))
                        .walletBalanceSnapshot(new BigDecimal("9600000.00"))
                        .status(PayoutStatus.REJECTED)
                        .adminReviewer(admin)
                        .adminNote("Tên chủ tài khoản ngân hàng chưa khớp dấu với giấy phép đăng ký hộ kinh doanh, vui lòng cập nhật lại")
                        .processedAt(LocalDateTime.now().minusHours(10))
                        .build());
                log.info("Seeded 4 sample PayoutRequests");
            }

            // E. Seed ServiceDisputes if empty
            if (serviceDisputeRepository != null && serviceDisputeRepository.count() == 0) {
                serviceDisputeRepository.save(ServiceDispute.builder()
                        .disputeCode("REF-880301")
                        .rescueOrderId(order3.getId())
                        .rescueCode(order3.getOrderCode())
                        .paymentTransaction(tx3)
                        .payosOrderCode(tx3.getPayosOrderCode())
                        .customer(c3)
                        .garage(g3)
                        .disputeType(DisputeType.OVERCHARGE)
                        .originalAmount(new BigDecimal("850000.00"))
                        .requestedRefundAmount(new BigDecimal("200000.00"))
                        .proposedRefundAmount(new BigDecimal("200000.00"))
                        .customerReason("Thợ cứu hộ tính thêm 200.000đ phí phụ tùng lọc gió nhưng chưa thông báo trước trên báo giá điện tử.")
                        .evidenceImageUrls("https://res.cloudinary.com/demo/image/upload/sample_receipt_1.jpg")
                        .status(DisputeStatus.ADMIN_APPROVAL)
                        .staffReviewer(staff2 != null ? staff2 : staff)
                        .staffFindingNote("Đã đối chiếu biên lai hiện trường và lịch sử báo giá. Xác nhận Gara thu vượt 200.000đ ngoài danh mục đã duyệt, đề xuất Admin duyệt hoàn 200.000đ.")
                        .staffReviewedAt(LocalDateTime.now().minusHours(2))
                        .refundSource(RefundSource.GARAGE_WALLET)
                        .build());

                serviceDisputeRepository.save(ServiceDispute.builder()
                        .disputeCode("REF-880402")
                        .rescueOrderId(order4.getId())
                        .rescueCode(order4.getOrderCode())
                        .paymentTransaction(tx4)
                        .payosOrderCode(tx4.getPayosOrderCode())
                        .customer(customer1)
                        .garage(garage1)
                        .disputeType(DisputeType.POOR_QUALITY)
                        .originalAmount(new BigDecimal("420000.00"))
                        .requestedRefundAmount(new BigDecimal("150000.00"))
                        .proposedRefundAmount(new BigDecimal("150000.00"))
                        .customerReason("Xe sau khi sấy bugi đi được khoảng 1km thì có hiện tượng hụt ga nhẹ, đề nghị kiểm tra bảo hành hoặc hoàn một phần phí.")
                        .evidenceImageUrls("https://res.cloudinary.com/demo/image/upload/sample_engine_check.jpg")
                        .status(DisputeStatus.STAFF_REVIEW)
                        .refundSource(RefundSource.GARAGE_WALLET)
                        .build());

                serviceDisputeRepository.save(ServiceDispute.builder()
                        .disputeCode("REF-880501")
                        .rescueOrderId(order5.getId())
                        .rescueCode(order5.getOrderCode())
                        .paymentTransaction(tx5)
                        .payosOrderCode(tx5.getPayosOrderCode())
                        .customer(c2)
                        .garage(g3)
                        .disputeType(DisputeType.OVERCHARGE)
                        .originalAmount(new BigDecimal("680000.00"))
                        .requestedRefundAmount(new BigDecimal("250000.00"))
                        .proposedRefundAmount(new BigDecimal("250000.00"))
                        .approvedRefundAmount(new BigDecimal("250000.00"))
                        .customerReason("Phí kéo xe ban đêm tính cao hơn mức trần quy định cho quãng đường dưới 3km tại Thảo Điền.")
                        .evidenceImageUrls("https://res.cloudinary.com/demo/image/upload/sample_invoice_8805.jpg")
                        .status(DisputeStatus.REFUNDED)
                        .staffReviewer(staff2 != null ? staff2 : staff)
                        .staffFindingNote("Đã kiểm tra GPS lộ trình thực tế chỉ 2.4km. Đề xuất hoàn lại phần chênh lệch 250.000đ cho khách hàng.")
                        .staffReviewedAt(LocalDateTime.now().minusHours(16))
                        .adminApprover(admin)
                        .refundSource(RefundSource.GARAGE_WALLET)
                        .refundReferenceCode("PAYOS-REV-880501")
                        .adminResolutionNote("Phê duyệt hoàn tiền 250.000đ cho khách hàng, đã cấn trừ trực tiếp từ Ví Gara Lưu Động Sài Gòn 24/7.")
                        .resolvedAt(LocalDateTime.now().minusHours(14))
                        .build());

                serviceDisputeRepository.save(ServiceDispute.builder()
                        .disputeCode("REF-880209")
                        .rescueOrderId(order2.getId())
                        .rescueCode(order2.getOrderCode())
                        .paymentTransaction(tx2)
                        .payosOrderCode(tx2.getPayosOrderCode())
                        .customer(c2)
                        .garage(g2)
                        .disputeType(DisputeType.DAMAGE)
                        .originalAmount(new BigDecimal("520000.00"))
                        .requestedRefundAmount(new BigDecimal("100000.00"))
                        .proposedRefundAmount(BigDecimal.ZERO)
                        .approvedRefundAmount(BigDecimal.ZERO)
                        .customerReason("Nghi ngờ vết xước nhỏ ở cản sau phát sinh trong lúc đưa xe lên bàn nâng.")
                        .status(DisputeStatus.REJECTED)
                        .staffReviewer(staff)
                        .staffFindingNote("Đã đối chiếu ảnh chụp nghiệm thu 4 góc trước khi cứu hộ, vết xước đã có từ trước khi thợ tiếp nhận xe.")
                        .staffReviewedAt(LocalDateTime.now().minusHours(6))
                        .adminApprover(admin)
                        .adminResolutionNote("Bác bỏ yêu cầu bồi thường do ảnh chụp hiện trường trước cứu hộ đã ghi nhận vết xước cũ.")
                        .resolvedAt(LocalDateTime.now().minusHours(5))
                        .build());
                log.info("Seeded 4 sample ServiceDisputes");
            }

            // F. Seed ServiceRatings if empty
            if (serviceRatingRepository != null && serviceRatingRepository.count() == 0) {
                serviceRatingRepository.save(ServiceRating.builder()
                        .rescueOrderId(order1.getId())
                        .rescueCode(order1.getOrderCode())
                        .customer(customer1)
                        .garage(garage1)
                        .mechanicStaff(primaryMechanic)
                        .stars(5)
                        .tags("Đến nhanh < 15p,Nhiệt tình lội nước,Đúng giá niêm yết")
                        .comment("Đường Huỳnh Tấn Phát ngập hơn nửa bánh xe nhưng anh thợ có mặt chỉ sau 12 phút, hỗ trợ chở xe qua đoạn ngập cực kỳ an toàn và chu đáo!")
                        .build());

                serviceRatingRepository.save(ServiceRating.builder()
                        .rescueOrderId(order2.getId())
                        .rescueCode(order2.getOrderCode())
                        .customer(c2)
                        .garage(g2)
                        .mechanicStaff(primaryMechanic)
                        .stars(4)
                        .tags("Tay nghề cao,Báo giá minh bạch")
                        .comment("Trạm sửa xe Thành Công xử lý thủy kích và thay nhớt rất kỹ, xe nổ máy êm trở lại ngay tại chỗ.")
                        .build());

                serviceRatingRepository.save(ServiceRating.builder()
                        .rescueOrderId(order3.getId())
                        .rescueCode(order3.getOrderCode())
                        .customer(c3)
                        .garage(g3)
                        .mechanicStaff(primaryMechanic)
                        .stars(2)
                        .tags("Thời gian chờ lâu,Phụ phí chưa rõ ràng")
                        .comment("Mưa lớn nên thợ đến trễ hơn dự kiến khoảng 15 phút và có thu thêm phí lọc gió chưa báo trước trên app.")
                        .build());
                log.info("Seeded 3 sample ServiceRatings");
            }
        }
    }

    private RescueOrder createSampleRescueOrder(
            String orderCode,
            User customer,
            Garage garage,
            MechanicStaff mechanicStaff,
            ServiceItem serviceItem,
            OrderType orderType,
            RescueOrderStatus status,
            String vehiclePlate,
            String pickupAddress,
            String dropoffAddress,
            BigDecimal totalAmount,
            String paymentMethod,
            Long paymentOrderCode
    ) {
        BigDecimal bookingFee = new BigDecimal("30000.00");
        BigDecimal basePrice = totalAmount.subtract(bookingFee).max(BigDecimal.ZERO);
        LocalDateTime now = LocalDateTime.now();

        RescueOrder order = RescueOrder.builder()
                .orderCode(orderCode)
                .customer(customer)
                .garage(garage)
                .mechanicStaff(mechanicStaff)
                .serviceItem(serviceItem)
                .orderType(orderType)
                .status(status)
                .vehiclePlate(vehiclePlate)
                .vehicleModel("Honda SH 150i")
                .vehicleType("SCOOTER")
                .pickupAddress(pickupAddress)
                .pickupLatitude(10.7380)
                .pickupLongitude(106.7210)
                .dropoffAddress(dropoffAddress)
                .dropoffLatitude(10.7450)
                .dropoffLongitude(106.7150)
                .serviceBasePrice(basePrice)
                .bookingFee(bookingFee)
                .totalAmount(totalAmount)
                .currency("VND")
                .waterLevel("NGẬP SÂU 40-50CM")
                .customerNotes("Xe bị tắt máy giữa đoạn đường ngập triều cường")
                .transportStage(status == RescueOrderStatus.COMPLETED ? TransportStage.HANDED_OVER : TransportStage.NONE)
                .requestedAt(now.minusHours(20))
                .acceptedAt(now.minusHours(19).minusMinutes(45))
                .arrivedAt(now.minusHours(19).minusMinutes(30))
                .serviceStartedAt(now.minusHours(19).minusMinutes(25))
                .serviceCompletedAt(status == RescueOrderStatus.COMPLETED ? now.minusHours(19) : null)
                .paidAt(status == RescueOrderStatus.COMPLETED ? now.minusHours(18).minusMinutes(50) : null)
                .paymentMethod(paymentMethod)
                .paymentOrderCode(paymentOrderCode)
                .build();
        return rescueOrderRepository.save(order);
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

    private MechanicStaff seedMechanicStaffIfNotExists(User user, Garage garage, GarageBranch branch, String shiftName, String speciality) {
        if (user == null) return null;
        return mechanicRepository.findByUserId(user.getId()).orElseGet(() -> {
            MechanicStaff mechanic = MechanicStaff.builder()
                    .user(user)
                    .garage(garage)
                    .branch(branch)
                    .workingStatus(MechanicStatus.AVAILABLE)
                    .shiftName(shiftName)
                    .ratingAvg(4.9)
                    .speciality(speciality)
                    .currentLatitude(branch.getLatitude())
                    .currentLongitude(branch.getLongitude())
                    .build();
            MechanicStaff saved = mechanicRepository.save(mechanic);
            log.info("Seeded mechanic staff {} allocated to branch {}", user.getUsername(), branch.getBranchName());
            return saved;
        });
    }

    private ServiceItem seedServiceItemIfNotExists(Garage garage, String serviceName, ServiceType serviceType, BigDecimal price, String description) {
        return serviceItemRepository.findByGarageIdOrderByCreatedAtAsc(garage.getId()).stream()
                .filter(s -> s.getServiceName().equalsIgnoreCase(serviceName))
                .findFirst()
                .orElseGet(() -> {
                    ServiceItem item = ServiceItem.builder()
                            .garage(garage)
                            .serviceName(serviceName)
                            .category("VƯỢT NGẬP")
                            .serviceType(serviceType)
                            .standardPrice(price)
                            .minPrice(price.multiply(BigDecimal.valueOf(0.9)))
                            .maxPrice(price.multiply(BigDecimal.valueOf(1.2)))
                            .unit("lượt")
                            .estimatedTimeMin(20)
                            .description(description)
                            .active(true)
                            .warrantyDays(3)
                            .build();
                    ServiceItem saved = serviceItemRepository.save(item);
                    log.info("Seeded ServiceItem: {} for garage id: {}", serviceName, garage.getId());
                    return saved;
                });
    }
}

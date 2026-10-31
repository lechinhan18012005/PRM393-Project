package com.prm393.floodrescue.features.garage;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.common.dto.ErrorResponse;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.GlobalExceptionHandler;
import com.prm393.floodrescue.common.security.RateLimiterService;
import com.prm393.floodrescue.common.utils.PhoneUtils;
import com.prm393.floodrescue.features.auth.dto.RegisterRequest;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.auth.service.AuthService;
import com.prm393.floodrescue.features.garage.dto.CreateBranchRequest;
import com.prm393.floodrescue.features.garage.dto.GarageBranchResponse;
import com.prm393.floodrescue.features.garage.dto.ServiceItemDto;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.garage.repository.ServiceItemRepository;
import com.prm393.floodrescue.features.garage.service.PriceCeilingService;
import com.prm393.floodrescue.features.garage.service.impl.GarageBranchServiceImpl;
import com.prm393.floodrescue.features.garage.service.impl.ServicePricingServiceImpl;
import com.prm393.floodrescue.features.mechanic.dto.CreateMechanicRequest;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.mechanic.service.impl.MechanicStaffServiceImpl;
import com.prm393.floodrescue.features.onboarding.AccountInvitation;
import com.prm393.floodrescue.features.onboarding.InvitationRepository;
import com.prm393.floodrescue.features.onboarding.OnboardingService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GarageManagementSecurityHardeningTest {

    @Nested
    @DisplayName("1. Phone Number Normalization & Validation")
    class PhoneValidationTests {

        @Test
        @DisplayName("Validates and normalizes Vietnamese mobile phones to canonical 0xxxxxxxxx")
        void shouldNormalizeVietnamesePhones() {
            assertThat(PhoneUtils.normalize("0903123456")).isEqualTo("0903123456");
            assertThat(PhoneUtils.normalize("+84903123456")).isEqualTo("0903123456");
            assertThat(PhoneUtils.normalize("84903123456")).isEqualTo("0903123456");
            assertThat(PhoneUtils.normalize("  0388123456  ")).isEqualTo("0388123456");
            assertThat(PhoneUtils.normalize("+84 912 345 678")).isEqualTo("0912345678");
        }

        @Test
        @DisplayName("Rejects invalid Vietnamese mobile phone formats")
        void shouldRejectInvalidPhones() {
            assertThat(PhoneUtils.isValidVietnamesePhone("0123456789")).isFalse(); // 01x is invalid
            assertThat(PhoneUtils.isValidVietnamesePhone("090312345")).isFalse();  // 9 digits
            assertThat(PhoneUtils.isValidVietnamesePhone("09031234567")).isFalse(); // 11 digits
            assertThat(PhoneUtils.isValidVietnamesePhone("abcd123456")).isFalse();
            assertThat(PhoneUtils.isValidVietnamesePhone(null)).isFalse();
            assertThat(PhoneUtils.isValidVietnamesePhone("")).isFalse();
        }
    }

    @Nested
    @DisplayName("2. Branch Geographic Validation & Duplicate Protection")
    class BranchValidationTests {

        @Mock private GarageBranchRepository branchRepository;
        @Mock private GarageRepository garageRepository;
        @Mock private MechanicStaffRepository mechanicRepository;
        @InjectMocks private GarageBranchServiceImpl branchService;

        private User owner;
        private Garage sampleGarage;

        @BeforeEach
        void setUp() {
            owner = User.builder().id(99L).role(Role.GARAGE_OWNER).build();
            sampleGarage = Garage.builder()
                    .id(1L)
                    .status(GarageStatus.APPROVED)
                    .garageName("Garage Sai Gon")
                    .build();
        }

        @Test
        @DisplayName("Rejects branch coordinates outside Vietnam operating territory")
        void shouldRejectCoordinatesOutsideVietnam() {
            when(garageRepository.findByOwnerId(99L)).thenReturn(Optional.of(sampleGarage));

            CreateBranchRequest request = CreateBranchRequest.builder()
                    .branchName("Chi nhanh Tokyo")
                    .address("123 Ginza, Tokyo")
                    .latitude(35.6895d)
                    .longitude(139.6917d)
                    .build();

            assertThatThrownBy(() -> branchService.createBranch(owner, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("ngoài phạm vi hoạt động tại Việt Nam");
        }

        @Test
        @DisplayName("Rejects branch with duplicate name within the same garage (case-insensitive)")
        void shouldRejectDuplicateBranchNameWithinGarage() {
            when(garageRepository.findByOwnerId(99L)).thenReturn(Optional.of(sampleGarage));
            when(branchRepository.existsByGarageIdAndBranchNameIgnoreCase(eq(1L), eq("Chi Nhanh Quan 7")))
                    .thenReturn(true);

            CreateBranchRequest request = CreateBranchRequest.builder()
                    .branchName("Chi Nhanh Quan 7")
                    .address("123 Nguyen Huu Tho, Q7")
                    .latitude(10.7320d)
                    .longitude(106.7020d)
                    .build();

            assertThatThrownBy(() -> branchService.createBranch(owner, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("đã tồn tại trong gara");
        }

        @Test
        @DisplayName("Successfully creates branch with valid Vietnam coordinates and normalizes hotline")
        void shouldCreateBranchWithValidData() {
            when(garageRepository.findByOwnerId(99L)).thenReturn(Optional.of(sampleGarage));
            when(branchRepository.existsByGarageIdAndBranchNameIgnoreCase(any(), any())).thenReturn(false);
            when(branchRepository.save(any(GarageBranch.class))).thenAnswer(invocation -> {
                GarageBranch b = invocation.getArgument(0);
                b.setId(10L);
                return b;
            });

            CreateBranchRequest request = CreateBranchRequest.builder()
                    .branchName("Chi Nhanh Thu Duc")
                    .address("1 Võ Văn Ngân, Thủ Đức")
                    .latitude(10.8505d)
                    .longitude(106.7719d)
                    .phoneNumber("+84903123456")
                    .build();

            GarageBranchResponse created = branchService.createBranch(owner, request);
            assertThat(created.getBranchName()).isEqualTo("Chi Nhanh Thu Duc");
            assertThat(created.getPhoneNumber()).isEqualTo("0903123456");
        }
    }

    @Nested
    @DisplayName("3. Mechanic Staff Allocation & Branch Operating Status Check")
    class MechanicStaffValidationTests {

        @Mock private MechanicStaffRepository mechanicStaffRepository;
        @Mock private GarageRepository garageRepository;
        @Mock private GarageBranchRepository garageBranchRepository;
        @Mock private UserRepository userRepository;
        @Mock private PasswordEncoder passwordEncoder;
        @InjectMocks private MechanicStaffServiceImpl mechanicStaffService;

        private User owner;
        private Garage garage;
        private GarageBranch closedBranch;

        @BeforeEach
        void setUp() {
            owner = User.builder().id(99L).role(Role.GARAGE_OWNER).build();
            garage = Garage.builder().id(1L).status(GarageStatus.APPROVED).build();
            closedBranch = GarageBranch.builder()
                    .id(10L)
                    .garage(garage)
                    .branchName("Branch Maintenance")
                    .operatingStatus(BranchStatus.CLOSED_MAINTENANCE)
                    .build();
        }

        @Test
        @DisplayName("Rejects creating mechanic assigned to a CLOSED_MAINTENANCE branch")
        void shouldRejectMechanicForClosedBranch() {
            when(garageRepository.findByOwnerId(99L)).thenReturn(Optional.of(garage));
            when(userRepository.existsByUsername(any())).thenReturn(false);
            when(userRepository.existsByPhone(any())).thenReturn(false);
            when(userRepository.existsByEmail(any())).thenReturn(false);
            when(garageBranchRepository.findById(10L)).thenReturn(Optional.of(closedBranch));

            CreateMechanicRequest request = CreateMechanicRequest.builder()
                    .username("tho_nguyen")
                    .fullName("Nguyen Van Thợ")
                    .phone("0909123456")
                    .password("FR@StrongPass2026")
                    .branchId(10L)
                    .build();

            assertThatThrownBy(() -> mechanicStaffService.createMechanic(owner, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("đang tạm đóng cửa hoặc bảo trì");
        }
    }

    @Nested
    @DisplayName("4. Service Pricing Validation & Platform Price Ceiling")
    class ServicePricingValidationTests {

        @Mock private ServiceItemRepository serviceItemRepository;
        @Mock private GarageRepository garageRepository;
        @Mock private PriceCeilingService priceCeilingService;
        @InjectMocks private ServicePricingServiceImpl servicePricingService;

        private User owner;
        private Garage garage;

        @BeforeEach
        void setUp() {
            owner = User.builder().id(99L).role(Role.GARAGE_OWNER).build();
            garage = Garage.builder().id(1L).status(GarageStatus.APPROVED).build();
        }

        @Test
        @DisplayName("Rejects fractional VND prices (must be integer VND)")
        void shouldRejectFractionalVndPrices() {
            when(garageRepository.findByOwnerId(99L)).thenReturn(Optional.of(garage));

            ServiceItemDto dto = ServiceItemDto.builder()
                    .serviceName("Sấy bugi")
                    .standardPrice(new BigDecimal("150000.50"))
                    .minPrice(new BigDecimal("100000.00"))
                    .maxPrice(new BigDecimal("200000.00"))
                    .category("BUG_XUC")
                    .build();

            assertThatThrownBy(() -> servicePricingService.createServiceItem(owner, dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("phải là số nguyên");
        }

        @Test
        @DisplayName("Rejects price violating price order: minPrice <= standardPrice <= maxPrice")
        void shouldRejectInvalidPriceOrder() {
            when(garageRepository.findByOwnerId(99L)).thenReturn(Optional.of(garage));

            ServiceItemDto dto = ServiceItemDto.builder()
                    .serviceName("Sấy bugi")
                    .standardPrice(new BigDecimal("150000"))
                    .minPrice(new BigDecimal("200000"))
                    .maxPrice(new BigDecimal("250000"))
                    .category("BUG_XUC")
                    .build();

            assertThatThrownBy(() -> servicePricingService.createServiceItem(owner, dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("không được lớn hơn giá chuẩn");
        }

        @Test
        @DisplayName("Enforces platform price ceiling protection against anti-gouging violations")
        void shouldEnforcePlatformCeiling() {
            when(garageRepository.findByOwnerId(99L)).thenReturn(Optional.of(garage));
            doThrow(new BadRequestException("Vượt quá giá trần quy định của sàn: 300,000 VND"))
                    .when(priceCeilingService).validatePriceAgainstCeiling(any(), any(), any(), any(), any());

            ServiceItemDto dto = ServiceItemDto.builder()
                    .serviceName("Thay nhớt cắt cổ")
                    .standardPrice(new BigDecimal("500000"))
                    .minPrice(new BigDecimal("400000"))
                    .maxPrice(new BigDecimal("600000"))
                    .category("THAY_NHOT")
                    .build();

            assertThatThrownBy(() -> servicePricingService.createServiceItem(owner, dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Vượt quá giá trần quy định của sàn");
        }
    }

    @Nested
    @DisplayName("5. Invitation Token Security & Account Activation Hardening")
    class InvitationSecurityTests {

        @Mock private InvitationRepository invitationRepository;
        @Mock private GarageRepository garageRepository;
        @Mock private GarageBranchRepository branchRepository;
        @Mock private RateLimiterService rateLimiterService;
        @Mock private UserRepository userRepository;
        @Mock private AuthService authService;
        @Mock private MechanicStaffRepository mechanicStaffRepository;
        @InjectMocks private OnboardingService onboardingService;

        private User issuer;
        private Garage garage;
        private GarageBranch branch;

        @BeforeEach
        void setUp() {
            issuer = User.builder().id(99L).role(Role.GARAGE_OWNER).build();
            garage = Garage.builder().id(1L).status(GarageStatus.APPROVED).build();
            branch = GarageBranch.builder()
                    .id(5L)
                    .garage(garage)
                    .operatingStatus(BranchStatus.OPEN)
                    .build();
        }

        @Test
        @DisplayName("Re-inviting same email revokes previous active invitation tokens")
        void shouldRevokePreviousPendingInvitationsOnReinvite() {
            when(garageRepository.findByOwnerId(99L)).thenReturn(Optional.of(garage));
            when(branchRepository.findById(5L)).thenReturn(Optional.of(branch));
            when(invitationRepository.countByGarageIdAndUsedFalseAndRevokedFalse(1L)).thenReturn(2L);

            AccountInvitation oldInvite = new AccountInvitation();
            oldInvite.setId(100L);
            oldInvite.setEmail("tho@floodrescue.vn");
            oldInvite.setGarage(garage);
            oldInvite.setUsed(false);
            oldInvite.setRevoked(false);

            when(invitationRepository.findByGarageIdAndEmailIgnoreCaseAndUsedFalseAndRevokedFalse(1L, "tho@floodrescue.vn"))
                    .thenReturn(List.of(oldInvite));
            when(invitationRepository.save(any(AccountInvitation.class))).thenAnswer(i -> i.getArgument(0));

            onboardingService.invite(issuer, "tho@floodrescue.vn", 5L, false);

            assertThat(oldInvite.isRevoked()).isTrue();
            assertThat(oldInvite.getRevokedAt()).isNotNull();
        }

        @Test
        @DisplayName("Rejects account activation if invitation has been revoked")
        void shouldRejectRevokedInvitationOnActivation() {
            AccountInvitation revokedInvite = new AccountInvitation();
            revokedInvite.setId(101L);
            revokedInvite.setEmail("tho@floodrescue.vn");
            revokedInvite.setGarage(garage);
            revokedInvite.setBranch(branch);
            revokedInvite.setUsed(false);
            revokedInvite.setRevoked(true); // Revoked!
            revokedInvite.setExpiresAt(LocalDateTime.now().plusHours(24));

            when(invitationRepository.findForActivation(anyString())).thenReturn(Optional.of(revokedInvite));

            RegisterRequest req = RegisterRequest.builder()
                    .username("thocuuho")
                    .fullName("Nguyen Van Tho")
                    .email("tho@floodrescue.vn")
                    .password("FR@ValidPass2026")
                    .build();

            assertThatThrownBy(() -> onboardingService.activate("INV-REVOKED-CODE", req))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("đã bị thu hồi");
        }

        @Test
        @DisplayName("Rate limiter blocks brute-force activation attempts")
        void shouldBlockActivationWhenRateLimitExceeded() {
            doThrow(new BadRequestException("Bạn đã gửi quá nhiều yêu cầu thử kích hoạt. Vui lòng chờ 60 giây!"))
                    .when(rateLimiterService).checkRateLimit(anyString(), anyInt(), anyLong(), anyString());

            RegisterRequest req = RegisterRequest.builder()
                    .username("attacker")
                    .fullName("Attacker")
                    .email("tho@floodrescue.vn")
                    .password("FR@ValidPass2026")
                    .build();

            assertThatThrownBy(() -> onboardingService.activate("INV-BRUTEFORCE", req))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Bạn đã gửi quá nhiều yêu cầu");
        }
    }

    @Nested
    @DisplayName("6. Global Exception Handler & Data Integrity Protection")
    class ExceptionHandlerTests {

        private final GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

        @Test
        @DisplayName("Translates DataIntegrityViolationException into 409 Conflict with clear message")
        void shouldTranslateDataIntegrityViolation() {
            DataIntegrityViolationException ex = new DataIntegrityViolationException(
                    "ERROR: duplicate key value violates unique constraint 'uk_garage_branch_name'"
            );
            HttpServletRequest request = mock(HttpServletRequest.class);

            ResponseEntity<ErrorResponse> response = exceptionHandler.handleDataIntegrityViolation(ex, request);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getMessage()).contains("vi phạm ràng buộc toàn vẹn");
        }
    }
}

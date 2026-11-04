package com.prm393.floodrescue.features.onboarding;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.dto.UserProfileResponse;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.onboarding.dto.CreateStaffAccountRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StaffAccountAdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private com.prm393.floodrescue.common.security.RateLimiterService rateLimiterService;

    @Mock
    private com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository mechanicStaffRepository;

    @InjectMocks
    private OnboardingService onboardingService;

    private User adminUser;

    @BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(onboardingService, "passwordEncoder", passwordEncoder);
        adminUser = User.builder()
                .id(1L)
                .username("admin")
                .role(Role.ADMIN)
                .build();
    }

    @Test
    @DisplayName("Admin tạo tài khoản Staff trực tiếp thành công với mật khẩu mặc định Password@123")
    void createStaffAccount_Success_DefaultPassword() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(userRepository.existsByEmailIgnoreCase("staff.cskh@hydrorescue.vn")).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.existsByPhone(anyString())).thenReturn(false);
        when(passwordEncoder.encode("Password@123")).thenReturn("ENCODED_DEFAULT_PASSWORD");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(501L);
            u.setCreatedAt(LocalDateTime.now());
            return u;
        });

        CreateStaffAccountRequest req = CreateStaffAccountRequest.builder()
                .email("staff.cskh@hydrorescue.vn")
                .fullName("Nguyễn Văn Hỗ Trợ")
                .build();

        UserProfileResponse res = onboardingService.createStaffAccount(1L, req);
        assertNotNull(res);
        assertEquals(501L, res.getId());
        assertEquals("staff.cskh@hydrorescue.vn", res.getEmail());
        assertEquals(Role.STAFF, res.getRole());
        assertTrue(res.isActive());
        verify(passwordEncoder, times(1)).encode("Password@123");
    }

    @Test
    @DisplayName("Admin tạo tài khoản Staff với mật khẩu tùy chỉnh")
    void createStaffAccount_WithCustomPassword() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(userRepository.existsByEmailIgnoreCase("staff.vip@hydrorescue.vn")).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
        when(passwordEncoder.encode("SecretPass#2026")).thenReturn("ENCODED_CUSTOM");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(502L);
            return u;
        });

        CreateStaffAccountRequest req = CreateStaffAccountRequest.builder()
                .email("staff.vip@hydrorescue.vn")
                .fullName("Trần Thị Điều Phối")
                .password("SecretPass#2026")
                .build();

        UserProfileResponse res = onboardingService.createStaffAccount(1L, req);
        assertNotNull(res);
        verify(passwordEncoder, times(1)).encode("SecretPass#2026");
    }

    @Test
    @DisplayName("Admin tạo tài khoản Staff để trống họ tên -> Tự động sinh tên từ email prefix")
    void createStaffAccount_BlankFullName_DerivesFromEmail() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(userRepository.existsByEmailIgnoreCase("le.hoang.long@rescue.vn")).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("ENCODED");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(503L);
            return u;
        });

        CreateStaffAccountRequest req = CreateStaffAccountRequest.builder()
                .email("le.hoang.long@rescue.vn")
                .fullName("")
                .build();

        UserProfileResponse res = onboardingService.createStaffAccount(1L, req);
        assertNotNull(res);
        assertTrue(res.getFullName().contains("Chuyên Viên Điều Hành"));
    }

    @Test
    @DisplayName("Admin tạo tài khoản Staff báo lỗi khi Email đã tồn tại trong hệ thống")
    void createStaffAccount_DuplicateEmail_ThrowsBadRequest() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        CreateStaffAccountRequest req = CreateStaffAccountRequest.builder()
                .email("existing@rescue.vn")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> onboardingService.createStaffAccount(1L, req));
        assertTrue(ex.getMessage().contains("đã được đăng ký"));
    }

    @Test
    @DisplayName("Tự động thêm hậu tố ngẫu nhiên khi username sinh ra bị trùng lặp")
    void createStaffAccount_UsernameCollision_GeneratesUniqueUsername() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(userRepository.existsByEmailIgnoreCase("trung.tam@rescue.vn")).thenReturn(false);
        when(userRepository.existsByUsername(anyString())).thenReturn(true, false);
        lenient().when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
        lenient().when(userRepository.existsByPhone(anyString())).thenReturn(false);
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("ENCODED");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(504L);
            return u;
        });

        CreateStaffAccountRequest req = CreateStaffAccountRequest.builder()
                .email("trung.tam@rescue.vn")
                .build();

        UserProfileResponse res = onboardingService.createStaffAccount(1L, req);
        assertNotNull(res);
        assertNotNull(res.getUsername());
    }

    @Test
    @DisplayName("Tìm kiếm danh sách tài khoản Staff theo họ tên")
    void getStaffAccounts_SearchByName() {
        User staff1 = User.builder().id(11L).username("staff1").fullName("Nguyễn Văn A").email("a@rescue.vn").role(Role.STAFF).active(true).build();
        User staff2 = User.builder().id(12L).username("staff2").fullName("Trần Thị B").email("b@rescue.vn").role(Role.STAFF).active(true).build();

        when(userRepository.findByRole(Role.STAFF)).thenReturn(List.of(staff1, staff2));

        List<UserProfileResponse> res = onboardingService.getStaffAccounts("Nguyễn", null);
        assertEquals(1, res.size());
        assertEquals("Nguyễn Văn A", res.get(0).getFullName());
    }

    @Test
    @DisplayName("Tìm kiếm danh sách tài khoản Staff theo email")
    void getStaffAccounts_SearchByEmail() {
        User staff1 = User.builder().id(11L).username("staff1").fullName("Nguyễn Văn A").email("admin.cskh@rescue.vn").role(Role.STAFF).active(true).build();
        User staff2 = User.builder().id(12L).username("staff2").fullName("Trần Thị B").email("support@rescue.vn").role(Role.STAFF).active(true).build();

        when(userRepository.findByRole(Role.STAFF)).thenReturn(List.of(staff1, staff2));

        List<UserProfileResponse> res = onboardingService.getStaffAccounts("support", null);
        assertEquals(1, res.size());
        assertEquals("support@rescue.vn", res.get(0).getEmail());
    }

    @Test
    @DisplayName("Lọc danh sách Staff chỉ lấy tài khoản Đang hoạt động (active = true)")
    void getStaffAccounts_FilterActiveTrue() {
        User staffActive = User.builder().id(11L).fullName("Staff 1").role(Role.STAFF).active(true).build();
        User staffLocked = User.builder().id(12L).fullName("Staff 2").role(Role.STAFF).active(false).build();

        when(userRepository.findByRole(Role.STAFF)).thenReturn(List.of(staffActive, staffLocked));

        List<UserProfileResponse> res = onboardingService.getStaffAccounts(null, true);
        assertEquals(1, res.size());
        assertTrue(res.get(0).isActive());
    }

    @Test
    @DisplayName("Lọc danh sách Staff chỉ lấy tài khoản Đã bị khóa (active = false)")
    void getStaffAccounts_FilterActiveFalse() {
        User staffActive = User.builder().id(11L).fullName("Staff 1").role(Role.STAFF).active(true).build();
        User staffLocked = User.builder().id(12L).fullName("Staff 2").role(Role.STAFF).active(false).build();

        when(userRepository.findByRole(Role.STAFF)).thenReturn(List.of(staffActive, staffLocked));

        List<UserProfileResponse> res = onboardingService.getStaffAccounts(null, false);
        assertEquals(1, res.size());
        assertFalse(res.get(0).isActive());
    }

    @Test
    @DisplayName("Admin gửi lời mời tạo tài khoản Staff thành công")
    void inviteStaff_Success() {
        when(userRepository.existsByEmail("staff.invite@rescue.vn")).thenReturn(false);
        when(invitationRepository.findByEmailIgnoreCaseAndRoleAndUsedFalseAndRevokedFalse("staff.invite@rescue.vn", Role.STAFF))
                .thenReturn(List.of());
        when(invitationRepository.save(any(AccountInvitation.class))).thenAnswer(inv -> {
            AccountInvitation i = inv.getArgument(0);
            i.setId(77L);
            return i;
        });

        var result = onboardingService.invite(adminUser, "staff.invite@rescue.vn", null, true);
        assertNotNull(result);
        assertEquals("staff.invite@rescue.vn", result.get("email"));
        assertEquals(Role.STAFF, result.get("role"));
    }

    @Test
    @DisplayName("Gửi lời mời Staff thất bại khi email đã được đăng ký người dùng")
    void inviteStaff_AlreadyRegistered_ThrowsBadRequest() {
        when(userRepository.existsByEmail("already@rescue.vn")).thenReturn(true);

        assertThrows(BadRequestException.class,
                () -> onboardingService.invite(adminUser, "already@rescue.vn", null, true));
    }

    @Test
    @DisplayName("Non-Admin gửi lời mời Staff bị từ chối quyền")
    void inviteStaff_NonAdmin_ThrowsAccessDenied() {
        User garageOwner = User.builder().id(99L).role(Role.GARAGE_OWNER).build();
        when(userRepository.existsByEmail("someone@rescue.vn")).thenReturn(false);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> onboardingService.invite(garageOwner, "someone@rescue.vn", null, true));
    }
}

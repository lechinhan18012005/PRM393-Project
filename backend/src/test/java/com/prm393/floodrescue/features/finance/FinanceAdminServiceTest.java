package com.prm393.floodrescue.features.finance;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.*;
import com.prm393.floodrescue.features.finance.entity.*;
import com.prm393.floodrescue.features.finance.repository.CommissionConfigRepository;
import com.prm393.floodrescue.features.finance.repository.PayoutRequestRepository;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.finance.service.FinanceAdminService;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinanceAdminServiceTest {

    @Mock
    private CommissionConfigRepository commissionConfigRepository;

    @Mock
    private PayoutRequestRepository payoutRequestRepository;

    @Mock
    private WalletTransactionRepository walletTransactionRepository;

    @Mock
    private GarageRepository garageRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @InjectMocks
    private FinanceAdminService financeAdminService;

    private User adminUser;
    private User garageOwner;
    private Garage approvedGarage;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(1L)
                .username("admin")
                .fullName("Nguyễn Quản Trị (Admin Tài Chính)")
                .role(Role.ADMIN)
                .build();

        garageOwner = User.builder()
                .id(2L)
                .username("garage_owner")
                .fullName("Lê Văn Gara")
                .role(Role.GARAGE_OWNER)
                .build();

        approvedGarage = Garage.builder()
                .id(100L)
                .owner(garageOwner)
                .garageName("Trung Tâm Cứu Hộ Nam Sài Gòn")
                .phone("0908123456")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("10000000.00"))
                .build();
        lenient().when(garageRepository.lockWalletBalance(any())).thenAnswer(inv -> Optional.of(approvedGarage.getWalletBalance()));
        lenient().when(payoutRequestRepository.findGarageIdById(any())).thenReturn(Optional.of(100L));
    }

    @Test
    @DisplayName("UC-24: Khởi tạo cấu hình hoa hồng mặc định khi hệ thống chưa có bản ghi nào")
    void getActiveCommissionConfig_CreatesDefaultWhenEmpty() {
        when(commissionConfigRepository.findFirstByActiveTrueOrderByCreatedAtDesc()).thenReturn(Optional.empty());
        when(commissionConfigRepository.save(any(CommissionConfig.class))).thenAnswer(inv -> {
            CommissionConfig cfg = inv.getArgument(0);
            cfg.setId(1L);
            return cfg;
        });

        CommissionConfigDto result = financeAdminService.getActiveCommissionConfig();

        assertNotNull(result);
        assertEquals(new BigDecimal("12.50"), result.getGlobalRate());
        assertTrue(result.isActive());
        verify(commissionConfigRepository, times(1)).save(any(CommissionConfig.class));
    }

    @Test
    @DisplayName("UC-24: Admin cập nhật tỷ lệ hoa hồng mới và lưu trữ cấu hình cũ vào lịch sử")
    void updateCommissionConfig_Success() {
        CommissionConfig oldActive = CommissionConfig.builder()
                .id(1L)
                .globalRate(new BigDecimal("12.50"))
                .active(true)
                .build();

        when(commissionConfigRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(oldActive));
        when(commissionConfigRepository.save(any(CommissionConfig.class))).thenAnswer(inv -> {
            CommissionConfig cfg = inv.getArgument(0);
            if (cfg.getId() == null) {
                cfg.setId(2L);
            }
            return cfg;
        });

        UpdateCommissionConfigRequest request = UpdateCommissionConfigRequest.builder()
                .globalRate(new BigDecimal("10.00"))
                .singleCrossingRate(new BigDecimal("10.00"))
                .batchCrossingRate(new BigDecimal("8.00"))
                .waterloggedRepairRate(new BigDecimal("14.00"))
                .surgeHoursRate(new BigDecimal("6.00"))
                .subsidyRate(new BigDecimal("20.00"))
                .changeSummary("Giảm phí sàn hỗ trợ bão số 4")
                .approvalReason("Công điện khẩn ngập úng Quận 7")
                .build();

        CommissionConfigDto updated = financeAdminService.updateCommissionConfig(adminUser, request);

        assertFalse(oldActive.isActive());
        assertNotNull(updated);
        assertEquals(2L, updated.getId());
        assertEquals(new BigDecimal("10.00"), updated.getGlobalRate());
        assertEquals(new BigDecimal("8.00"), updated.getBatchCrossingRate());
        assertEquals("Nguyễn Quản Trị (Admin Tài Chính)", updated.getUpdatedByName());
        assertTrue(updated.isActive());
    }

    @Test
    @DisplayName("UC-26: Chủ Gara tạo yêu cầu rút tiền hợp lệ khi số dư khả dụng đủ")
    void createPayoutRequest_Success() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(new BigDecimal("2000000.00")); // Đang chờ duyệt 2tr, còn khả dụng 8tr
        when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> {
            PayoutRequest p = inv.getArgument(0);
            p.setId(50L);
            return p;
        });

        CreatePayoutRequestDto dto = CreatePayoutRequestDto.builder()
                .requestedAmount(new BigDecimal("5000000.00"))
                .bankCode("VCB")
                .bankName("Vietcombank")
                .accountNumber("0071000892831")
                .accountHolderName("LE VAN GARA")
                .build();

        PayoutRequestResponse response = financeAdminService.createPayoutRequest(garageOwner, dto);

        assertNotNull(response);
        assertEquals(50L, response.getId());
        assertEquals(PayoutStatus.PENDING, response.getStatus());
        assertEquals(new BigDecimal("5000000.00"), response.getRequestedAmount());
        assertEquals(new BigDecimal("3000000.00"), response.getAvailableBalance());
    }

    @Test
    @DisplayName("UC-26: Chặn yêu cầu rút tiền khi vượt quá số dư khả dụng của ví")
    void createPayoutRequest_ExceedsAvailableBalance_ThrowsException() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(new BigDecimal("7000000.00")); // Đang giữ 7tr, chỉ còn khả dụng 3tr

        CreatePayoutRequestDto dto = CreatePayoutRequestDto.builder()
                .requestedAmount(new BigDecimal("4000000.00"))
                .bankCode("VCB")
                .accountNumber("0071000892831")
                .accountHolderName("LE VAN GARA")
                .build();

        assertThrows(BadRequestException.class, () -> financeAdminService.createPayoutRequest(garageOwner, dto));
        verify(payoutRequestRepository, never()).save(any(PayoutRequest.class));
    }

    @Test
    @DisplayName("UC-26: Phê duyệt lệnh rút (APPROVED) chưa trừ tiền ví, chỉ trừ ví khi giải ngân (TRANSFERRED)")
    void processPayoutRequest_ApproveThenTransfer() {
        PayoutRequest payout = PayoutRequest.builder()
                .id(77L)
                .requestCode("PO-2026-7777")
                .garage(approvedGarage)
                .bankCode("MB")
                .accountNumber("038299482910")
                .accountHolderName("LE VAN GARA")
                .requestedAmount(new BigDecimal("4000000.00"))
                .status(PayoutStatus.PENDING)
                .build();

        when(payoutRequestRepository.findById(77L)).thenReturn(Optional.of(payout));
        when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(new BigDecimal("4000000.00"));

        // Bước 1: Admin bấm Phê duyệt lệnh rút (APPROVED) -> Ví vẫn giữ 10tr
        ApprovePayoutDto approveStep = ApprovePayoutDto.builder()
                .status(PayoutStatus.APPROVED)
                .adminNote("Đã kiểm tra khớp eKYC, duyệt lệnh chờ chuyển khoản")
                .build();

        PayoutRequestResponse approvedRes = financeAdminService.processPayoutRequest(adminUser, 77L, approveStep);
        assertEquals(PayoutStatus.APPROVED, approvedRes.getStatus());
        assertEquals(new BigDecimal("10000000.00"), approvedGarage.getWalletBalance());
        verify(walletTransactionRepository, never()).save(any(WalletTransaction.class));

        // Bước 2: Admin xác nhận giải ngân chuyển khoản thành công (TRANSFERRED) -> Trừ ví còn 6tr và ghi sổ WalletTransaction
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(BigDecimal.ZERO);

        ApprovePayoutDto transferStep = ApprovePayoutDto.builder()
                .status(PayoutStatus.TRANSFERRED)
                .transactionReference("TXN-NAPAS-998877")
                .adminNote("Đã chuyển khoản Napas247 thành công")
                .build();

        PayoutRequestResponse transferredRes = financeAdminService.processPayoutRequest(adminUser, 77L, transferStep);
        assertEquals(PayoutStatus.TRANSFERRED, transferredRes.getStatus());
        assertEquals("TXN-NAPAS-998877", transferredRes.getTransactionReference());
        assertEquals(new BigDecimal("6000000.00"), approvedGarage.getWalletBalance());
        verify(garageRepository, times(1)).save(approvedGarage);
        verify(walletTransactionRepository, times(1)).save(any(WalletTransaction.class));
    }
}

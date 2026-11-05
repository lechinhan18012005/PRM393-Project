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
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
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
import java.time.YearMonth;
import java.time.ZoneId;

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
                .fullName("Nguyá»…n Quáº£n Trá»‹ (Admin TÃ i ChÃ­nh)")
                .role(Role.ADMIN)
                .build();

        garageOwner = User.builder()
                .id(2L)
                .username("garage_owner")
                .fullName("LÃª VÄƒn Gara")
                .role(Role.GARAGE_OWNER)
                .build();

        approvedGarage = Garage.builder()
                .id(100L)
                .owner(garageOwner)
                .garageName("Trung TÃ¢m Cá»©u Há»™ Nam SÃ i GÃ²n")
                .phone("0908123456")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("10000000.00"))
                .build();
        lenient().when(garageRepository.lockWalletBalance(any())).thenAnswer(inv -> Optional.of(approvedGarage.getWalletBalance()));
        lenient().when(payoutRequestRepository.findGarageIdById(any())).thenReturn(Optional.of(100L));
        lenient().when(commissionConfigRepository.findFirstByActiveTrueOrderByCreatedAtDesc())
                .thenReturn(Optional.of(CommissionConfig.builder().id(1L).globalRate(new BigDecimal("12.50")).active(true).build()));
    }

    @Test
    void garageRevenueOnlyIncludesSuccessfulPaymentsInCurrentMonthForOwnersGarage() {
        YearMonth month = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));
        PaymentTransaction repair = PaymentTransaction.builder().rescueOrderId(1L)
                .status(PaymentStatus.SUCCESS).paidAt(month.atDay(1).atStartOfDay())
                .orderType("ONSITE_REPAIR").netGarageAmount(new BigDecimal("90000"))
                .platformFee(new BigDecimal("10000")).build();
        PaymentTransaction towing = PaymentTransaction.builder().rescueOrderId(2L)
                .status(PaymentStatus.SUCCESS).paidAt(month.atEndOfMonth().atTime(23, 59))
                .orderType("TOWING").netGarageAmount(new BigDecimal("180000"))
                .platformFee(new BigDecimal("20000")).build();
        PaymentTransaction refunded = PaymentTransaction.builder().rescueOrderId(3L)
                .status(PaymentStatus.REFUNDED).paidAt(month.atDay(1).atStartOfDay()).build();
        PaymentTransaction previousMonth = PaymentTransaction.builder().rescueOrderId(4L)
                .status(PaymentStatus.SUCCESS).paidAt(month.minusMonths(1).atEndOfMonth().atTime(23, 59)).build();
        PaymentTransaction unpaid = PaymentTransaction.builder().status(PaymentStatus.PENDING).build();
        when(paymentTransactionRepository.findByGarageIdOrderByCreatedAtDesc(100L))
                .thenReturn(List.of(repair, towing, refunded, previousMonth, unpaid));

        GarageRevenueDto revenue = financeAdminService.getGarageWalletSummary(garageOwner).getRevenue();

        assertEquals(month.toString(), revenue.getMonth());
        assertEquals(2, revenue.getPaidOrderCount());
        assertEquals(new BigDecimal("270000"), revenue.getNetRevenue());
        assertEquals(new BigDecimal("30000"), revenue.getPlatformFee());
        assertEquals(new BigDecimal("90000"), revenue.getRevenueByService().get("ONSITE_REPAIR"));
        assertEquals(new BigDecimal("180000"), revenue.getRevenueByService().get("TOWING"));
        verify(paymentTransactionRepository).findByGarageIdOrderByCreatedAtDesc(100L);
    }

    @Test
    void garageRevenueIsZeroWhenThereAreNoPayments() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));
        GarageRevenueDto revenue = financeAdminService.getGarageWalletSummary(garageOwner).getRevenue();
        assertEquals(0, revenue.getPaidOrderCount());
        assertEquals(BigDecimal.ZERO, revenue.getNetRevenue());
        assertEquals(BigDecimal.ZERO, revenue.getPlatformFee());
        assertTrue(revenue.getRevenueByService().isEmpty());
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
    @DisplayName("UC-24: Admin cáº­p nháº­t tá»· lá»‡ hoa há»“ng má»›i vÃ  lÆ°u trá»¯ cáº¥u hÃ¬nh cÅ© vÃ o lá»‹ch sá»­")
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
                .changeSummary("Giáº£m phÃ­ sÃ n há»— trá»£ bÃ£o sá»‘ 4")
                .approvalReason("CÃ´ng Ä‘iá»‡n kháº©n ngáº­p Ãºng Quáº­n 7")
                .build();

        CommissionConfigDto updated = financeAdminService.updateCommissionConfig(adminUser, request);

        assertFalse(oldActive.isActive());
        assertNotNull(updated);
        assertEquals(2L, updated.getId());
        assertEquals(new BigDecimal("10.00"), updated.getGlobalRate());
        assertEquals(new BigDecimal("8.00"), updated.getBatchCrossingRate());
        assertEquals("Nguyá»…n Quáº£n Trá»‹ (Admin TÃ i ChÃ­nh)", updated.getUpdatedByName());
        assertTrue(updated.isActive());
    }

    @Test
    @DisplayName("UC-26: Chá»§ Gara táº¡o yÃªu cáº§u rÃºt tiá»n há»£p lá»‡ khi sá»‘ dÆ° kháº£ dá»¥ng Ä‘á»§")
    void createPayoutRequest_Success() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(new BigDecimal("2000000.00")); // Äang chá» duyá»‡t 2tr, cÃ²n kháº£ dá»¥ng 8tr
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
    @DisplayName("UC-26: Cháº·n yÃªu cáº§u rÃºt tiá»n khi vÆ°á»£t quÃ¡ sá»‘ dÆ° kháº£ dá»¥ng cá»§a vÃ­")
    void createPayoutRequest_ExceedsAvailableBalance_ThrowsException() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(new BigDecimal("7000000.00")); // Äang giá»¯ 7tr, chá»‰ cÃ²n kháº£ dá»¥ng 3tr

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
    @DisplayName("UC-26: PhÃª duyá»‡t lá»‡nh rÃºt (APPROVED) chÆ°a trá»« tiá»n vÃ­, chá»‰ trá»« vÃ­ khi giáº£i ngÃ¢n (TRANSFERRED)")
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

        // BÆ°á»›c 1: Admin báº¥m PhÃª duyá»‡t lá»‡nh rÃºt (APPROVED) -> VÃ­ váº«n giá»¯ 10tr
        ApprovePayoutDto approveStep = ApprovePayoutDto.builder()
                .status(PayoutStatus.APPROVED)
                .adminNote("ÄÃ£ kiá»ƒm tra khá»›p eKYC, duyá»‡t lá»‡nh chá» chuyá»ƒn khoáº£n")
                .build();

        PayoutRequestResponse approvedRes = financeAdminService.processPayoutRequest(adminUser, 77L, approveStep);
        assertEquals(PayoutStatus.APPROVED, approvedRes.getStatus());
        assertEquals(new BigDecimal("10000000.00"), approvedGarage.getWalletBalance());
        verify(walletTransactionRepository, never()).save(any(WalletTransaction.class));

        // BÆ°á»›c 2: Admin xÃ¡c nháº­n giáº£i ngÃ¢n chuyá»ƒn khoáº£n thÃ nh cÃ´ng (TRANSFERRED) -> Trá»« vÃ­ cÃ²n 6tr vÃ  ghi sá»• WalletTransaction
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(BigDecimal.ZERO);

        ApprovePayoutDto transferStep = ApprovePayoutDto.builder()
                .status(PayoutStatus.TRANSFERRED)
                .transactionReference("TXN-NAPAS-998877")
                .adminNote("ÄÃ£ chuyá»ƒn khoáº£n Napas247 thÃ nh cÃ´ng")
                .build();

        PayoutRequestResponse transferredRes = financeAdminService.processPayoutRequest(adminUser, 77L, transferStep);
        assertEquals(PayoutStatus.TRANSFERRED, transferredRes.getStatus());
        assertEquals("TXN-NAPAS-998877", transferredRes.getTransactionReference());
        assertEquals(new BigDecimal("6000000.00"), approvedGarage.getWalletBalance());
        verify(garageRepository, times(1)).save(approvedGarage);
        verify(walletTransactionRepository, times(1)).save(any(WalletTransaction.class));
    }

    @Test
    @DisplayName("UC-26: Tạo yêu cầu rút tiền với hạn mức tối thiểu 50.000 VNĐ thành công")
    void createPayoutRequest_MinimumThreshold50k_Success() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(BigDecimal.ZERO);
        when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> {
            PayoutRequest p = inv.getArgument(0);
            p.setId(51L);
            return p;
        });

        CreatePayoutRequestDto dto = CreatePayoutRequestDto.builder()
                .requestedAmount(new BigDecimal("50000.00"))
                .bankCode("MB")
                .bankName("MB Bank")
                .accountNumber("0987654321")
                .accountHolderName("LE VAN GARA")
                .build();

        PayoutRequestResponse response = financeAdminService.createPayoutRequest(garageOwner, dto);
        assertNotNull(response);
        assertEquals(51L, response.getId());
        assertEquals(new BigDecimal("50000.00"), response.getRequestedAmount());
        assertEquals(PayoutStatus.PENDING, response.getStatus());
    }

    @Test
    @DisplayName("UC-26: Tạo yêu cầu rút tiền với số tiền rút bằng đúng 100% số dư khả dụng")
    void createPayoutRequest_ExactMaxAvailableBalance_Success() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(BigDecimal.ZERO);
        when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> {
            PayoutRequest p = inv.getArgument(0);
            p.setId(52L);
            return p;
        });

        CreatePayoutRequestDto dto = CreatePayoutRequestDto.builder()
                .requestedAmount(new BigDecimal("10000000.00"))
                .bankCode("TCB")
                .accountNumber("19034567890123")
                .accountHolderName("LE VAN GARA")
                .build();

        PayoutRequestResponse response = financeAdminService.createPayoutRequest(garageOwner, dto);
        assertNotNull(response);
        assertEquals(new BigDecimal("10000000.00"), response.getRequestedAmount());
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getAvailableBalance()));
    }

    @Test
    @DisplayName("UC-26: Tạo yêu cầu rút tiền với số tiền bằng 0 bị từ chối")
    void createPayoutRequest_ZeroAmount_ThrowsException() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));

        CreatePayoutRequestDto dto = CreatePayoutRequestDto.builder()
                .requestedAmount(BigDecimal.ZERO)
                .bankCode("VCB")
                .accountNumber("0071000892831")
                .accountHolderName("LE VAN GARA")
                .build();

        assertThrows(BadRequestException.class, () -> financeAdminService.createPayoutRequest(garageOwner, dto));
    }

    @Test
    @DisplayName("UC-26: Tạo yêu cầu rút tiền với số tiền âm bị từ chối")
    void createPayoutRequest_NegativeAmount_ThrowsException() {
        when(garageRepository.findByOwnerId(garageOwner.getId())).thenReturn(Optional.of(approvedGarage));

        CreatePayoutRequestDto dto = CreatePayoutRequestDto.builder()
                .requestedAmount(new BigDecimal("-500000.00"))
                .bankCode("VCB")
                .accountNumber("0071000892831")
                .accountHolderName("LE VAN GARA")
                .build();

        assertThrows(BadRequestException.class, () -> financeAdminService.createPayoutRequest(garageOwner, dto));
    }

    @Test
    @DisplayName("UC-26: Từ chối lệnh rút tiền (REJECTED) giải phóng số dư đang giữ và không trừ ví Gara")
    void processPayoutRequest_Reject_ReleasesHeldBalance() {
        PayoutRequest payout = PayoutRequest.builder()
                .id(88L)
                .requestCode("PO-2026-8888")
                .garage(approvedGarage)
                .requestedAmount(new BigDecimal("2500000.00"))
                .status(PayoutStatus.PENDING)
                .build();

        when(payoutRequestRepository.findById(88L)).thenReturn(Optional.of(payout));
        when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(payoutRequestRepository.sumRequestedAmountByGarageIdAndStatuses(eq(100L), anyList()))
                .thenReturn(BigDecimal.ZERO);

        ApprovePayoutDto rejectStep = ApprovePayoutDto.builder()
                .status(PayoutStatus.REJECTED)
                .adminNote("Thông tin tài khoản ngân hàng không khớp tên chủ Gara")
                .build();

        PayoutRequestResponse rejectedRes = financeAdminService.processPayoutRequest(adminUser, 88L, rejectStep);
        assertEquals(PayoutStatus.REJECTED, rejectedRes.getStatus());
        assertEquals(new BigDecimal("10000000.00"), approvedGarage.getWalletBalance());
        verify(walletTransactionRepository, never()).save(any(WalletTransaction.class));
    }

    @Test
    @DisplayName("UC-26: Không thể tiếp tục duyệt lệnh rút tiền đã ở trạng thái TRANSFERRED")
    void processPayoutRequest_AlreadyTransferred_ThrowsException() {
        PayoutRequest completedPayout = PayoutRequest.builder()
                .id(99L)
                .garage(approvedGarage)
                .requestedAmount(new BigDecimal("1000000.00"))
                .status(PayoutStatus.TRANSFERRED)
                .build();

        when(payoutRequestRepository.findById(99L)).thenReturn(Optional.of(completedPayout));

        ApprovePayoutDto step = ApprovePayoutDto.builder()
                .status(PayoutStatus.REJECTED)
                .adminNote("Cố gắng từ chối lệnh đã giải ngân")
                .build();

        assertThrows(BadRequestException.class, () -> financeAdminService.processPayoutRequest(adminUser, 99L, step));
    }

    @Test
    @DisplayName("UC-24: Lấy danh sách Gara kèm chiết khấu hoa hồng thực tế từ Database")
    void getGarageCommissions_ReturnsMappedGarages() {
        Garage customGarage = Garage.builder()
                .id(101L)
                .garageName("Gara Sửa Xe Thủy Kích 24h")
                .phone("0912345678")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("5000000.00"))
                .commissionRate(new BigDecimal("15.00"))
                .build();

        when(garageRepository.findAll()).thenReturn(List.of(approvedGarage, customGarage));
        CommissionConfig defaultCfg = CommissionConfig.builder().globalRate(new BigDecimal("12.50")).active(true).build();
        when(commissionConfigRepository.findFirstByActiveTrueOrderByCreatedAtDesc()).thenReturn(Optional.of(defaultCfg));

        List<GarageCommissionDto> list = financeAdminService.getGarageCommissions();
        assertNotNull(list);
        assertEquals(2, list.size());
        assertEquals(new BigDecimal("12.50"), list.get(0).getCommissionRate());
        assertEquals(new BigDecimal("15.00"), list.get(1).getCommissionRate());
    }

    @Test
    @DisplayName("UC-24: Admin cập nhật chiết khấu riêng cho từng Gara thành công và ghi nhận lịch sử")
    void updateGarageCommission_Success_SetsCustomRate() {
        when(garageRepository.findById(100L)).thenReturn(Optional.of(approvedGarage));
        when(garageRepository.save(any(Garage.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateGarageCommissionRequest req = UpdateGarageCommissionRequest.builder()
                .commissionRate(new BigDecimal("8.50"))
                .notes("Ưu đãi đối tác chiến lược cứu hộ ngập lụt Quận 7")
                .build();

        GarageCommissionDto result = financeAdminService.updateGarageCommission(100L, req, "Nguyễn Quản Trị");
        assertNotNull(result);
        assertEquals(100L, result.getGarageId());
        assertEquals(new BigDecimal("8.50"), result.getCommissionRate());
        assertEquals(new BigDecimal("8.50"), approvedGarage.getCommissionRate());
        verify(garageRepository, times(1)).save(approvedGarage);
    }

    @Test
    @DisplayName("UC-24: Admin thiết lập tỷ lệ chiết khấu Gara mức biên 0.00% (Miễn phí hoa hồng)")
    void updateGarageCommission_BoundaryZeroPercent_Success() {
        when(garageRepository.findById(100L)).thenReturn(Optional.of(approvedGarage));
        when(garageRepository.save(any(Garage.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateGarageCommissionRequest req = UpdateGarageCommissionRequest.builder()
                .commissionRate(new BigDecimal("0.00"))
                .notes("Miễn phí phí sàn cho trạm cứu hộ nhân đạo")
                .build();

        GarageCommissionDto result = financeAdminService.updateGarageCommission(100L, req, "Admin");
        assertNotNull(result);
        assertEquals(new BigDecimal("0.00"), result.getCommissionRate());
    }

    @Test
    @DisplayName("UC-24: Admin thiết lập tỷ lệ chiết khấu Gara mức tối đa 100.00%")
    void updateGarageCommission_BoundaryHundredPercent_Success() {
        when(garageRepository.findById(100L)).thenReturn(Optional.of(approvedGarage));
        when(garageRepository.save(any(Garage.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateGarageCommissionRequest req = UpdateGarageCommissionRequest.builder()
                .commissionRate(new BigDecimal("100.00"))
                .notes("Cấu hình kiểm thử biên tối đa")
                .build();

        GarageCommissionDto result = financeAdminService.updateGarageCommission(100L, req, "Admin");
        assertNotNull(result);
        assertEquals(new BigDecimal("100.00"), result.getCommissionRate());
    }

    @Test
    @DisplayName("UC-24: Cập nhật chiết khấu thất bại khi không tìm thấy Gara")
    void updateGarageCommission_GarageNotFound_ThrowsException() {
        when(garageRepository.findById(999L)).thenReturn(Optional.empty());

        UpdateGarageCommissionRequest req = UpdateGarageCommissionRequest.builder()
                .commissionRate(new BigDecimal("10.00"))
                .build();

        assertThrows(com.prm393.floodrescue.common.exception.ResourceNotFoundException.class,
                () -> financeAdminService.updateGarageCommission(999L, req, "Admin"));
    }

    @Test
    @DisplayName("UC-25: Tính toán tổng hợp số liệu doanh thu nền tảng Platform Revenue Stats từ DB")
    void getPlatformRevenueStats_ComputesSummaryCorrectly() {
        CommissionConfig activeCfg = CommissionConfig.builder().globalRate(new BigDecimal("12.50")).active(true).build();
        when(commissionConfigRepository.findFirstByActiveTrueOrderByCreatedAtDesc()).thenReturn(Optional.of(activeCfg));

        PayoutRequest p1 = PayoutRequest.builder().status(PayoutStatus.PENDING).requestedAmount(new BigDecimal("5000000.00")).build();
        when(payoutRequestRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(p1));

        Garage g1 = Garage.builder().status(GarageStatus.APPROVED).walletBalance(new BigDecimal("30000000.00")).build();
        when(garageRepository.findAll()).thenReturn(List.of(g1));

        PaymentTransaction tx1 = PaymentTransaction.builder()
                .status(PaymentStatus.SUCCESS)
                .amount(new BigDecimal("50000000.00"))
                .platformFee(new BigDecimal("6250000.00"))
                .netGarageAmount(new BigDecimal("43750000.00"))
                .reconciled(true)
                .build();
        when(paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(PaymentStatus.SUCCESS))
                .thenReturn(List.of(tx1));
        when(paymentTransactionRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(tx1));

        PlatformRevenueStatsDto stats = financeAdminService.getPlatformRevenueStats();
        assertNotNull(stats);
        assertEquals(new BigDecimal("50000000.00"), stats.getTotalGmv());
        assertEquals(new BigDecimal("6250000.00"), stats.getTotalPlatformCommission());
        assertEquals(new BigDecimal("43750000.00"), stats.getTotalGarageNet());
        assertEquals(1L, stats.getPaidTransactionsCount());
        assertEquals(new BigDecimal("30000000.00"), stats.getTotalGarageWalletBalances());
        assertEquals(new BigDecimal("5000000.00"), stats.getPendingPayoutAmount());
    }
}

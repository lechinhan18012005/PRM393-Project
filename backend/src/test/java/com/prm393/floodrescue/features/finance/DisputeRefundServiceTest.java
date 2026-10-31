package com.prm393.floodrescue.features.finance;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.AdminProcessRefundRequest;
import com.prm393.floodrescue.features.finance.dto.CreateDisputeRequest;
import com.prm393.floodrescue.features.finance.dto.DisputeResponse;
import com.prm393.floodrescue.features.finance.dto.StaffReviewDisputeRequest;
import com.prm393.floodrescue.features.finance.entity.*;
import com.prm393.floodrescue.features.finance.repository.ServiceDisputeRepository;
import com.prm393.floodrescue.features.finance.repository.WalletTransactionRepository;
import com.prm393.floodrescue.features.finance.service.DisputeRefundService;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.garage.entity.GarageStatus;
import com.prm393.floodrescue.features.garage.repository.GarageRepository;
import com.prm393.floodrescue.features.payment.entity.PaymentMethod;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
class DisputeRefundServiceTest {

    @Mock
    private ServiceDisputeRepository serviceDisputeRepository;

    @Mock
    private RescueOrderRepository rescueOrderRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private GarageRepository garageRepository;

    @Mock
    private WalletTransactionRepository walletTransactionRepository;

    @InjectMocks
    private DisputeRefundService disputeRefundService;

    private User customer;
    private User staff;
    private User admin;
    private Garage garage;
    private RescueOrder completedOrder;
    private PaymentTransaction paidTransaction;

    @BeforeEach
    void setUp() {
        customer = User.builder()
                .id(10L)
                .username("customer_01")
                .fullName("Phạm Văn Hùng")
                .phone("0912334455")
                .role(Role.CUSTOMER)
                .build();

        staff = User.builder()
                .id(20L)
                .username("staff_01")
                .fullName("Nguyễn Thị Mai (CSKH)")
                .role(Role.STAFF)
                .build();

        admin = User.builder()
                .id(30L)
                .username("admin_01")
                .fullName("Trần Quản Trị")
                .role(Role.ADMIN)
                .build();

        garage = Garage.builder()
                .id(100L)
                .garageName("Cứu Hộ Nhanh Sài Gòn")
                .phone("0909112233")
                .status(GarageStatus.APPROVED)
                .walletBalance(new BigDecimal("12400000.00"))
                .build();

        completedOrder = RescueOrder.builder()
                .id(8790L)
                .orderCode("#RC-8790")
                .customer(customer)
                .garage(garage)
                .status(RescueOrderStatus.COMPLETED)
                .build();

        paidTransaction = PaymentTransaction.builder()
                .id(501L)
                .rescueOrderId(8790L)
                .rescueCode("#RC-8790")
                .payosOrderCode(2604168790L)
                .customer(customer)
                .garage(garage)
                .amount(new BigDecimal("2100000.00"))
                .commissionRate(new BigDecimal("12.50"))
                .platformFee(new BigDecimal("262500.00"))
                .netGarageAmount(new BigDecimal("1837500.00"))
                .paymentMethod(PaymentMethod.PAYOS_VIETQR)
                .status(PaymentStatus.SUCCESS)
                .reconciled(true)
                .build();
    }

    @Test
    @DisplayName("UC-23 (Input): Khách hàng gửi khiếu nại hợp lệ cho đơn đã COMPLETED & thanh toán SUCCESS")
    void createDispute_Success() {
        when(serviceDisputeRepository.existsByRescueOrderIdAndStatusIn(eq(8790L), anyList())).thenReturn(false);
        when(rescueOrderRepository.findById(8790L)).thenReturn(Optional.of(completedOrder));
        when(paymentTransactionRepository.findByRescueOrderIdOrderByCreatedAtDesc(8790L))
                .thenReturn(List.of(paidTransaction));
        when(serviceDisputeRepository.save(any(ServiceDispute.class))).thenAnswer(inv -> {
            ServiceDispute d = inv.getArgument(0);
            d.setId(1L);
            return d;
        });

        CreateDisputeRequest req = CreateDisputeRequest.builder()
                .rescueOrderId(8790L)
                .disputeType(DisputeType.OVERCHARGE)
                .requestedRefundAmount(new BigDecimal("600000.00"))
                .customerReason("Tài xế tự ý thu thêm 600.000đ tiền phụ phí ngoài báo giá trên ứng dụng")
                .evidenceImageUrls("https://img.example.com/receipt1.jpg")
                .build();

        DisputeResponse res = disputeRefundService.createDispute(customer, req);

        assertNotNull(res);
        assertEquals(1L, res.getId());
        assertEquals(DisputeStatus.STAFF_REVIEW, res.getStatus());
        assertEquals(new BigDecimal("2100000.00"), res.getOriginalAmount());
        assertEquals(new BigDecimal("600000.00"), res.getRequestedRefundAmount());
        assertEquals("Cứu Hộ Nhanh Sài Gòn", res.getGarageName());
    }

    @Test
    @DisplayName("UC-23 (Validation): Chặn gửi khiếu nại khi số tiền yêu cầu hoàn vượt quá tổng tiền đã thanh toán")
    void createDispute_ExceedsPaidAmount_ThrowsBadRequest() {
        when(serviceDisputeRepository.existsByRescueOrderIdAndStatusIn(eq(8790L), anyList())).thenReturn(false);
        when(rescueOrderRepository.findById(8790L)).thenReturn(Optional.of(completedOrder));
        when(paymentTransactionRepository.findByRescueOrderIdOrderByCreatedAtDesc(8790L))
                .thenReturn(List.of(paidTransaction));

        CreateDisputeRequest req = CreateDisputeRequest.builder()
                .rescueOrderId(8790L)
                .disputeType(DisputeType.OVERCHARGE)
                .requestedRefundAmount(new BigDecimal("2500000.00")) // Vượt quá 2.100.000đ
                .customerReason("Yêu cầu hoàn vượt mức")
                .build();

        assertThrows(BadRequestException.class, () -> disputeRefundService.createDispute(customer, req));
        verify(serviceDisputeRepository, never()).save(any());
    }

    @Test
    @DisplayName("UC-23: Staff xác minh bằng chứng và lập biên bản đề xuất Admin hoàn tiền (ADMIN_APPROVAL)")
    void reviewDisputeByStaff_ProposeRefundToAdmin_Success() {
        ServiceDispute existing = ServiceDispute.builder()
                .id(1L)
                .disputeCode("REF-2026-01")
                .rescueOrderId(8790L)
                .rescueCode("#RC-8790")
                .paymentTransaction(paidTransaction)
                .customer(customer)
                .garage(garage)
                .disputeType(DisputeType.OVERCHARGE)
                .originalAmount(new BigDecimal("2100000.00"))
                .requestedRefundAmount(new BigDecimal("600000.00"))
                .customerReason("Thu lố 600k")
                .status(DisputeStatus.STAFF_REVIEW)
                .build();

        when(serviceDisputeRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(serviceDisputeRepository.save(any(ServiceDispute.class))).thenAnswer(inv -> inv.getArgument(0));

        StaffReviewDisputeRequest staffReq = StaffReviewDisputeRequest.builder()
                .decision(DisputeStatus.ADMIN_APPROVAL)
                .proposedRefundAmount(new BigDecimal("600000.00"))
                .staffFindingNote("Đã kiểm tra biên lai viết tay và gọi xác minh Gara. Đề xuất Admin duyệt hoàn 600.000đ.")
                .build();

        DisputeResponse res = disputeRefundService.reviewDisputeByStaff(staff, 1L, staffReq);

        assertEquals(DisputeStatus.ADMIN_APPROVAL, res.getStatus());
        assertEquals(new BigDecimal("600000.00"), res.getProposedRefundAmount());
        assertEquals("Nguyễn Thị Mai (CSKH)", res.getStaffReviewerName());
        assertNotNull(res.getStaffReviewedAt());
    }

    @Test
    @DisplayName("UC-23: Chặn Staff tự ý ra quyết định REFUNDED (chỉ Admin mới được thực thi hoàn tiền)")
    void reviewDisputeByStaff_CannotDirectlyRefund_ThrowsBadRequest() {
        ServiceDispute existing = ServiceDispute.builder()
                .id(1L)
                .disputeCode("REF-2026-01")
                .originalAmount(new BigDecimal("2100000.00"))
                .requestedRefundAmount(new BigDecimal("600000.00"))
                .status(DisputeStatus.STAFF_REVIEW)
                .build();

        when(serviceDisputeRepository.findById(1L)).thenReturn(Optional.of(existing));

        StaffReviewDisputeRequest invalidStaffReq = StaffReviewDisputeRequest.builder()
                .decision(DisputeStatus.REFUNDED)
                .proposedRefundAmount(new BigDecimal("600000.00"))
                .staffFindingNote("Staff tự ý hoàn tiền")
                .build();

        assertThrows(BadRequestException.class,
                () -> disputeRefundService.reviewDisputeByStaff(staff, 1L, invalidStaffReq));
    }

    @Test
    @DisplayName("UC-27: Admin duyệt hoàn tiền -> Khấu trừ ví Gara, tạo bút toán DISPUTE_REFUND_DEDUCT & cập nhật PaymentStatus.REFUNDED")
    void processRefundByAdmin_ApproveRefund_DeductsGarageWalletAndUpdatesPayment() {
        ServiceDispute dispute = ServiceDispute.builder()
                .id(1L)
                .disputeCode("REF-2026-01")
                .rescueOrderId(8790L)
                .rescueCode("#RC-8790")
                .paymentTransaction(paidTransaction)
                .payosOrderCode(2604168790L)
                .customer(customer)
                .garage(garage)
                .disputeType(DisputeType.OVERCHARGE)
                .originalAmount(new BigDecimal("2100000.00"))
                .requestedRefundAmount(new BigDecimal("600000.00"))
                .proposedRefundAmount(new BigDecimal("600000.00"))
                .customerReason("Thu thêm phụ phí sai quy định")
                .staffReviewer(staff)
                .staffFindingNote("Xác nhận Gara thu sai 600.000đ")
                .status(DisputeStatus.ADMIN_APPROVAL)
                .build();

        when(serviceDisputeRepository.findById(1L)).thenReturn(Optional.of(dispute));
        when(garageRepository.lockWalletBalance(100L)).thenReturn(Optional.of(new BigDecimal("12400000.00")));
        when(serviceDisputeRepository.save(any(ServiceDispute.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminProcessRefundRequest adminReq = AdminProcessRefundRequest.builder()
                .decision(DisputeStatus.REFUNDED)
                .approvedRefundAmount(new BigDecimal("600000.00"))
                .refundSource(RefundSource.GARAGE_WALLET)
                .refundReferenceCode("PAYOS-REV-8790")
                .adminResolutionNote("Đồng ý biên bản của Staff. Khấu trừ 600.000đ từ ví Gara hoàn trả cho khách.")
                .build();

        DisputeResponse res = disputeRefundService.processRefundByAdmin(admin, 1L, adminReq);

        assertEquals(DisputeStatus.REFUNDED, res.getStatus());
        assertEquals(new BigDecimal("600000.00"), res.getApprovedRefundAmount());
        assertEquals("PAYOS-REV-8790", res.getRefundReferenceCode());
        // Ví Gara giảm từ 12.400.000 xuống 11.800.000
        assertEquals(new BigDecimal("11800000.00"), garage.getWalletBalance());
        assertEquals(PaymentStatus.REFUNDED, paidTransaction.getStatus());

        ArgumentCaptor<WalletTransaction> walletTxCaptor = ArgumentCaptor.forClass(WalletTransaction.class);
        verify(walletTransactionRepository, times(1)).save(walletTxCaptor.capture());
        WalletTransaction savedWalletTx = walletTxCaptor.getValue();
        assertEquals(WalletTransactionType.DISPUTE_REFUND_DEDUCT, savedWalletTx.getTransactionType());
        assertEquals(new BigDecimal("-600000.00"), savedWalletTx.getAmount());
        assertEquals(new BigDecimal("11800000.00"), savedWalletTx.getBalanceAfter());
        assertEquals("REF-2026-01", savedWalletTx.getReferenceCode());
    }
}

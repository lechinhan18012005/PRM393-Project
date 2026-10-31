package com.prm393.floodrescue.features.rating;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rating.dto.CreateRatingRequest;
import com.prm393.floodrescue.features.rating.dto.RatingResponse;
import com.prm393.floodrescue.features.rating.entity.ServiceRating;
import com.prm393.floodrescue.features.rating.repository.ServiceRatingRepository;
import com.prm393.floodrescue.features.rating.service.ServiceRatingService;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ServiceRatingServiceTest {

    @Mock
    private ServiceRatingRepository serviceRatingRepository;

    @Mock
    private RescueOrderRepository rescueOrderRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private MechanicStaffRepository mechanicStaffRepository;

    @InjectMocks
    private ServiceRatingService serviceRatingService;

    private User customer;
    private User otherCustomer;
    private Garage garage;
    private MechanicStaff mechanic;
    private RescueOrder completedOrder;

    @BeforeEach
    void setUp() {
        customer = User.builder()
                .id(10L)
                .username("customer_01")
                .fullName("Lê Hoàng Nam")
                .role(Role.CUSTOMER)
                .build();

        otherCustomer = User.builder()
                .id(11L)
                .username("customer_02")
                .fullName("Nguyễn Thị Mai")
                .role(Role.CUSTOMER)
                .build();

        garage = Garage.builder()
                .id(20L)
                .garageName("Gara Cứu Hộ Minh Phát")
                .build();

        User mechanicUser = User.builder()
                .id(30L)
                .username("mechanic_01")
                .fullName("Trần Văn Tài")
                .role(Role.FIELD_MECHANIC)
                .build();

        mechanic = MechanicStaff.builder()
                .id(40L)
                .user(mechanicUser)
                .garage(garage)
                .ratingAvg(5.0)
                .build();

        completedOrder = RescueOrder.builder()
                .id(8821L)
                .orderCode("RES-8821")
                .customer(customer)
                .garage(garage)
                .mechanicStaff(mechanic)
                .status(RescueOrderStatus.COMPLETED)
                .build();
    }

    @Test
    @DisplayName("UC-19: Khách hàng gửi đánh giá 4 sao thành công và cập nhật điểm trung bình (ratingAvg) của Thợ")
    void createRating_CompletedOrder_SuccessAndUpdatesMechanicRatingAvg() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(4)
                .tags("Đến nhanh < 15p,Nhiệt tình lội nước")
                .comment("Thợ cứu hộ đến rất nhanh dù nước ngập sâu.")
                .build();

        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(false);
        when(rescueOrderRepository.findById(8821L)).thenReturn(Optional.of(completedOrder));
        when(serviceRatingRepository.save(any(ServiceRating.class))).thenAnswer(inv -> {
            ServiceRating r = inv.getArgument(0);
            r.setId(100L);
            r.setCreatedAt(LocalDateTime.now());
            return r;
        });

        ServiceRating prevRating = ServiceRating.builder().stars(5).build();
        ServiceRating currentRating = ServiceRating.builder().stars(4).build();
        when(serviceRatingRepository.findByMechanicStaffIdOrderByCreatedAtDesc(40L))
                .thenReturn(List.of(currentRating, prevRating));

        RatingResponse res = serviceRatingService.createRating(customer, req);

        assertNotNull(res);
        assertEquals(100L, res.getId());
        assertEquals(8821L, res.getRescueOrderId());
        assertEquals(4, res.getStars());
        assertEquals("Gara Cứu Hộ Minh Phát", res.getGarageName());
        assertEquals("Trần Văn Tài", res.getMechanicName());
        assertEquals(4.5, mechanic.getRatingAvg());
        verify(mechanicStaffRepository, times(1)).save(mechanic);
    }

    @Test
    @DisplayName("UC-19: Chặn đánh giá trùng lặp trên cùng một đơn cứu hộ")
    void createRating_DuplicateRating_ThrowsBadRequest() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(5)
                .comment("Đánh giá lần 2")
                .build();

        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> serviceRatingService.createRating(customer, req));
        assertTrue(ex.getMessage().contains("đã được đánh giá trước đó"));
    }

    @Test
    @DisplayName("UC-19: Chặn đánh giá khi đơn cứu hộ chưa hoàn tất (chưa ở trạng thái COMPLETED)")
    void createRating_OrderNotCompleted_ThrowsBadRequest() {
        completedOrder.setStatus(RescueOrderStatus.IN_PROGRESS);
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(5)
                .build();

        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(false);
        when(rescueOrderRepository.findById(8821L)).thenReturn(Optional.of(completedOrder));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> serviceRatingService.createRating(customer, req));
        assertTrue(ex.getMessage().contains("COMPLETED"));
    }

    @Test
    @DisplayName("UC-19: Chặn khách hàng khác đánh giá đơn cứu hộ không thuộc sở hữu của mình")
    void createRating_WrongCustomer_ThrowsAccessDenied() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(5)
                .build();

        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(false);
        when(rescueOrderRepository.findById(8821L)).thenReturn(Optional.of(completedOrder));

        assertThrows(AccessDeniedException.class,
                () -> serviceRatingService.createRating(otherCustomer, req));
    }

    @Test
    @DisplayName("UC-19: Chặn số sao ngoài khoảng 1..5 sao")
    void createRating_InvalidStars_ThrowsBadRequest() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(6)
                .build();

        assertThrows(BadRequestException.class,
                () -> serviceRatingService.createRating(customer, req));
    }
}

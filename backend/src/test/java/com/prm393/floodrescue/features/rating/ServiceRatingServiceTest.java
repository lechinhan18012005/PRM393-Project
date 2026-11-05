package com.prm393.floodrescue.features.rating;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
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
                .fullName("LÃª HoÃ ng Nam")
                .role(Role.CUSTOMER)
                .build();

        otherCustomer = User.builder()
                .id(11L)
                .username("customer_02")
                .fullName("Nguyá»…n Thá»‹ Mai")
                .role(Role.CUSTOMER)
                .build();

        garage = Garage.builder()
                .id(20L)
                .garageName("Gara Cá»©u Há»™ Minh PhÃ¡t")
                .build();

        User mechanicUser = User.builder()
                .id(30L)
                .username("mechanic_01")
                .fullName("Tráº§n VÄƒn TÃ i")
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
    @DisplayName("UC-19: KhÃ¡ch hÃ ng gá»­i Ä‘Ã¡nh giÃ¡ 4 sao thÃ nh cÃ´ng vÃ  cáº­p nháº­t Ä‘iá»ƒm trung bÃ¬nh (ratingAvg) cá»§a Thá»£")
    void createRating_CompletedOrder_SuccessAndUpdatesMechanicRatingAvg() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(4)
                .tags("Äáº¿n nhanh < 15p,Nhiá»‡t tÃ¬nh lá»™i nÆ°á»›c")
                .comment("Thá»£ cá»©u há»™ Ä‘áº¿n ráº¥t nhanh dÃ¹ nÆ°á»›c ngáº­p sÃ¢u.")
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
        assertEquals("Gara Cá»©u Há»™ Minh PhÃ¡t", res.getGarageName());
        assertEquals("Tráº§n VÄƒn TÃ i", res.getMechanicName());
        assertEquals(4.5, mechanic.getRatingAvg());
        verify(mechanicStaffRepository, times(1)).save(mechanic);
    }

    @Test
    @DisplayName("UC-19: Cháº·n Ä‘Ã¡nh giÃ¡ trÃ¹ng láº·p trÃªn cÃ¹ng má»™t Ä‘Æ¡n cá»©u há»™")
    void createRating_DuplicateRating_ThrowsBadRequest() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(5)
                .comment("ÄÃ¡nh giÃ¡ láº§n 2")
                .build();

        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> serviceRatingService.createRating(customer, req));
        assertNotNull(ex.getMessage());
    }

    @Test
    @DisplayName("UC-19: Cháº·n Ä‘Ã¡nh giÃ¡ khi Ä‘Æ¡n cá»©u há»™ chÆ°a hoÃ n táº¥t (chÆ°a á»Ÿ tráº¡ng thÃ¡i COMPLETED)")
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
    @DisplayName("UC-19: Cháº·n khÃ¡ch hÃ ng khÃ¡c Ä‘Ã¡nh giÃ¡ Ä‘Æ¡n cá»©u há»™ khÃ´ng thuá»™c sá»Ÿ há»¯u cá»§a mÃ¬nh")
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
    @DisplayName("UC-19: Cháº·n sá»‘ sao ngoÃ i khoáº£ng 1..5 sao")
    void createRating_InvalidStars_ThrowsBadRequest() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(6)
                .build();

        assertThrows(BadRequestException.class,
                () -> serviceRatingService.createRating(customer, req));
    }

    @Test
    @DisplayName("UC-19: Khách hàng đánh giá 1 sao (Rất không hài lòng) kèm lý do")
    void createRating_1Star_Dissatisfied_Success() {
        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(false);
        when(rescueOrderRepository.findById(8821L)).thenReturn(Optional.of(completedOrder));
        when(serviceRatingRepository.save(any(ServiceRating.class))).thenAnswer(inv -> {
            ServiceRating r = inv.getArgument(0);
            r.setId(101L);
            return r;
        });

        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(1)
                .tags("Thợ đến trễ, Thái độ kém")
                .comment("Không hài lòng về thời gian chờ đợi")
                .build();

        RatingResponse res = serviceRatingService.createRating(customer, req);
        assertNotNull(res);
        assertEquals(1, res.getStars());
        assertEquals("Không hài lòng về thời gian chờ đợi", res.getComment());
    }

    @Test
    @DisplayName("UC-19: Khách hàng đánh giá 2 sao (Chưa đạt kỳ vọng)")
    void createRating_2Stars_NeedsImprovement_Success() {
        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(false);
        when(rescueOrderRepository.findById(8821L)).thenReturn(Optional.of(completedOrder));
        when(serviceRatingRepository.save(any(ServiceRating.class))).thenAnswer(inv -> {
            ServiceRating r = inv.getArgument(0);
            r.setId(102L);
            return r;
        });

        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(2)
                .tags("Giá cao hơn dự kiến")
                .build();

        RatingResponse res = serviceRatingService.createRating(customer, req);
        assertNotNull(res);
        assertEquals(2, res.getStars());
    }

    @Test
    @DisplayName("UC-19: Khách hàng đánh giá 3 sao (Bình thường)")
    void createRating_3Stars_Neutral_Success() {
        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(false);
        when(rescueOrderRepository.findById(8821L)).thenReturn(Optional.of(completedOrder));
        when(serviceRatingRepository.save(any(ServiceRating.class))).thenAnswer(inv -> {
            ServiceRating r = inv.getArgument(0);
            r.setId(103L);
            return r;
        });

        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(3)
                .comment("Dịch vụ ở mức tạm ổn")
                .build();

        RatingResponse res = serviceRatingService.createRating(customer, req);
        assertNotNull(res);
        assertEquals(3, res.getStars());
    }

    @Test
    @DisplayName("UC-19: Khách hàng đánh giá 4 sao (Hài lòng)")
    void createRating_4Stars_Good_Success() {
        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(false);
        when(rescueOrderRepository.findById(8821L)).thenReturn(Optional.of(completedOrder));
        when(serviceRatingRepository.save(any(ServiceRating.class))).thenAnswer(inv -> {
            ServiceRating r = inv.getArgument(0);
            r.setId(104L);
            return r;
        });

        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(4)
                .tags("Đến nhanh, Sửa cẩn thận")
                .build();

        RatingResponse res = serviceRatingService.createRating(customer, req);
        assertNotNull(res);
        assertEquals(4, res.getStars());
    }

    @Test
    @DisplayName("UC-19: Khách hàng đánh giá 5 sao (Xuất sắc) kèm khen ngợi")
    void createRating_5Stars_Excellent_Success() {
        when(serviceRatingRepository.existsByRescueOrderId(8821L)).thenReturn(false);
        when(rescueOrderRepository.findById(8821L)).thenReturn(Optional.of(completedOrder));
        when(serviceRatingRepository.save(any(ServiceRating.class))).thenAnswer(inv -> {
            ServiceRating r = inv.getArgument(0);
            r.setId(105L);
            return r;
        });

        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(5)
                .tags("Nhiệt tình, Kỹ thuật giỏi, Đúng giá")
                .comment("Cứu hộ xe ngập nước rất kịp thời, cảm ơn anh thợ")
                .build();

        RatingResponse res = serviceRatingService.createRating(customer, req);
        assertNotNull(res);
        assertEquals(5, res.getStars());
    }

    @Test
    @DisplayName("UC-19: Chặn đánh giá với số sao bằng 0")
    void createRating_ZeroStars_ThrowsBadRequest() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(0)
                .build();

        assertThrows(BadRequestException.class, () -> serviceRatingService.createRating(customer, req));
    }

    @Test
    @DisplayName("UC-19: Chặn đánh giá với số sao âm")
    void createRating_NegativeStars_ThrowsBadRequest() {
        CreateRatingRequest req = CreateRatingRequest.builder()
                .rescueOrderId(8821L)
                .stars(-1)
                .build();

        assertThrows(BadRequestException.class, () -> serviceRatingService.createRating(customer, req));
    }

    @Test
    @DisplayName("UC-19: Lấy thông tin đánh giá dịch vụ theo mã đơn cứu hộ thành công")
    void getRatingByRescueOrderId_Found_ReturnsDto() {
        ServiceRating rating = ServiceRating.builder()
                .id(201L)
                .rescueOrderId(8821L)
                .customer(customer)
                .garage(garage)
                .mechanicStaff(mechanic)
                .stars(5)
                .comment("Rất chuyên nghiệp")
                .createdAt(LocalDateTime.now())
                .build();

        when(serviceRatingRepository.findByRescueOrderId(8821L)).thenReturn(Optional.of(rating));

        RatingResponse res = serviceRatingService.getRatingByOrder(8821L);
        assertNotNull(res);
        assertEquals(201L, res.getId());
        assertEquals(5, res.getStars());
        assertEquals("Rất chuyên nghiệp", res.getComment());
    }

    @Test
    @DisplayName("UC-19: Lấy thông tin đánh giá theo mã đơn ném lỗi khi đơn chưa được đánh giá")
    void getRatingByRescueOrderId_NotFound_ThrowsBadRequest() {
        when(serviceRatingRepository.findByRescueOrderId(9999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> serviceRatingService.getRatingByOrder(9999L));
    }

    @Test
    @DisplayName("UC-19: Lấy danh sách toàn bộ các đánh giá của khách hàng đang đăng nhập")
    void getMyRatings_ReturnsCustomerRatingsList() {
        ServiceRating r1 = ServiceRating.builder().id(301L).rescueOrderId(8821L).customer(customer).stars(5).build();
        ServiceRating r2 = ServiceRating.builder().id(302L).rescueOrderId(8822L).customer(customer).stars(4).build();

        when(serviceRatingRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId()))
                .thenReturn(List.of(r1, r2));

        List<RatingResponse> list = serviceRatingService.getMyRatings(customer);
        assertNotNull(list);
        assertEquals(2, list.size());
        assertEquals(5, list.get(0).getStars());
        assertEquals(4, list.get(1).getStars());
    }
}

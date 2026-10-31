package com.prm393.floodrescue.features.rating.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.entity.Garage;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.payment.entity.PaymentStatus;
import com.prm393.floodrescue.features.payment.entity.PaymentTransaction;
import com.prm393.floodrescue.features.payment.repository.PaymentTransactionRepository;
import com.prm393.floodrescue.features.rating.dto.CreateRatingRequest;
import com.prm393.floodrescue.features.rating.dto.RatingResponse;
import com.prm393.floodrescue.features.rating.entity.ServiceRating;
import com.prm393.floodrescue.features.rating.repository.ServiceRatingRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceRatingService {

    private final ServiceRatingRepository serviceRatingRepository;
    private final RescueOrderRepository rescueOrderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final MechanicStaffRepository mechanicStaffRepository;

    /**
     * UC-19: Khách hàng gửi đánh giá số sao (1-5), thẻ đánh giá nhanh và nhận xét sau dịch vụ
     */
    @Transactional
    public RatingResponse createRating(User customer, CreateRatingRequest request) {
        if (customer == null) {
            throw new AccessDeniedException("Yêu cầu đăng nhập để gửi đánh giá dịch vụ");
        }

        if (request.getStars() == null || request.getStars() < 1 || request.getStars() > 5) {
            throw new BadRequestException("Số sao đánh giá phải nằm trong khoảng từ 1 đến 5 sao");
        }

        Long rescueOrderId = request.getRescueOrderId();
        if (rescueOrderId == null) {
            throw new BadRequestException("Mã đơn cứu hộ (rescueOrderId) không được để trống");
        }

        if (serviceRatingRepository.existsByRescueOrderId(rescueOrderId)) {
            throw new BadRequestException("Đơn cứu hộ này đã được đánh giá trước đó");
        }

        RescueOrder order = rescueOrderRepository.findById(rescueOrderId).orElse(null);
        Garage garage = null;
        MechanicStaff mechanicStaff = null;
        String rescueCode = "#RC-" + rescueOrderId;

        if (order != null) {
            if (order.getCustomer() != null && !order.getCustomer().getId().equals(customer.getId())) {
                throw new AccessDeniedException("Bạn chỉ có thể đánh giá đơn cứu hộ của chính mình");
            }
            if (order.getStatus() != RescueOrderStatus.COMPLETED) {
                throw new BadRequestException("Chỉ có thể gửi đánh giá khi đơn cứu hộ đã hoàn tất và thanh toán (COMPLETED)");
            }
            garage = order.getGarage();
            mechanicStaff = order.getMechanicStaff();
            if (order.getOrderCode() != null) {
                rescueCode = order.getOrderCode();
            }
        } else {
            List<PaymentTransaction> txs = paymentTransactionRepository.findByRescueOrderIdOrderByCreatedAtDesc(rescueOrderId);
            PaymentTransaction paidTx = txs.stream()
                    .filter(t -> t.getStatus() == PaymentStatus.SUCCESS || t.getStatus() == PaymentStatus.REFUNDED)
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Chỉ có thể gửi đánh giá cho đơn cứu hộ đã hoàn tất và thanh toán thành công"));

            if (paidTx.getCustomer() != null && !paidTx.getCustomer().getId().equals(customer.getId())) {
                throw new AccessDeniedException("Bạn không phải là khách hàng của đơn cứu hộ này");
            }
            garage = paidTx.getGarage();
            if (paidTx.getRescueCode() != null) {
                rescueCode = paidTx.getRescueCode();
            }
        }

        ServiceRating rating = ServiceRating.builder()
                .rescueOrderId(rescueOrderId)
                .rescueCode(rescueCode)
                .customer(customer)
                .garage(garage)
                .mechanicStaff(mechanicStaff)
                .stars(request.getStars())
                .tags(request.getTags() != null ? request.getTags().trim() : null)
                .comment(request.getComment() != null ? request.getComment().trim() : null)
                .build();

        ServiceRating saved = serviceRatingRepository.save(rating);

        // Cập nhật điểm đánh giá trung bình (ratingAvg) cho Thợ cứu hộ (MechanicStaff)
        if (mechanicStaff != null) {
            List<ServiceRating> mechanicRatings = serviceRatingRepository
                    .findByMechanicStaffIdOrderByCreatedAtDesc(mechanicStaff.getId());
            if (!mechanicRatings.isEmpty()) {
                double avg = mechanicRatings.stream()
                        .mapToInt(ServiceRating::getStars)
                        .average()
                        .orElse(request.getStars().doubleValue());
                double roundedAvg = Math.round(avg * 100.0) / 100.0;
                mechanicStaff.setRatingAvg(roundedAvg);
                mechanicStaffRepository.save(mechanicStaff);
            }
        }

        log.info("Customer {} rated rescueOrder #{} with {} stars",
                customer.getUsername(), rescueOrderId, saved.getStars());
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public RatingResponse getRatingByOrder(Long rescueOrderId) {
        ServiceRating rating = serviceRatingRepository.findByRescueOrderId(rescueOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có đánh giá cho đơn cứu hộ #" + rescueOrderId));
        return mapToResponse(rating);
    }

    @Transactional(readOnly = true)
    public List<RatingResponse> getMyRatings(User customer) {
        if (customer == null) {
            throw new AccessDeniedException("Yêu cầu đăng nhập");
        }
        return serviceRatingRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RatingResponse> getRatingsByGarage(Long garageId) {
        return serviceRatingRepository.findByGarageIdOrderByCreatedAtDesc(garageId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RatingResponse> getAllRatings() {
        return serviceRatingRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private RatingResponse mapToResponse(ServiceRating r) {
        User customer = r.getCustomer();
        Garage garage = r.getGarage();
        MechanicStaff mechanic = r.getMechanicStaff();

        return RatingResponse.builder()
                .id(r.getId())
                .rescueOrderId(r.getRescueOrderId())
                .rescueCode(r.getRescueCode())
                .customerId(customer != null ? customer.getId() : null)
                .customerName(customer != null ? customer.getFullName() : "Khách hàng")
                .garageId(garage != null ? garage.getId() : null)
                .garageName(garage != null ? garage.getGarageName() : null)
                .mechanicStaffId(mechanic != null ? mechanic.getId() : null)
                .mechanicName(mechanic != null && mechanic.getUser() != null ? mechanic.getUser().getFullName() : null)
                .mechanicRatingAvg(mechanic != null ? mechanic.getRatingAvg() : null)
                .stars(r.getStars())
                .tags(r.getTags())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}

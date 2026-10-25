package com.prm393.floodrescue.features.rescue.dto;

import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOrderStatus;
import com.prm393.floodrescue.features.rescue.entity.TransportStage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescueOrderResponse {

    private Long id;
    private String orderCode;
    private OrderType orderType;
    private RescueOrderStatus status;

    // Khách hàng
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String customerAvatar;

    // Thợ
    private Long mechanicStaffId;
    private Long mechanicUserId;
    private String mechanicName;
    private String mechanicPhone;
    private String mechanicAvatar;
    private Double mechanicRating;
    private String mechanicSpeciality;
    private Double mechanicCurrentLatitude;
    private Double mechanicCurrentLongitude;

    // Gara & Chi nhánh
    private Long garageId;
    private String garageName;
    private String garagePhone;
    private Long branchId;
    private String branchName;
    private String branchAddress;

    // Dịch vụ
    private Long serviceItemId;
    private String serviceName;

    // Xe cá nhân
    private Long vehicleId;
    private String vehiclePlate;
    private String vehicleModel;
    private String vehicleType;

    // Điểm đón & Điểm trả
    private String pickupAddress;
    private Double pickupLatitude;
    private Double pickupLongitude;

    private String dropoffAddress;
    private Double dropoffLatitude;
    private Double dropoffLongitude;

    // Snapshot giá
    private BigDecimal serviceBasePrice;
    private BigDecimal bookingFee;
    private BigDecimal totalAmount;
    private String currency;

    // Chi tiết
    private String waterLevel;
    private String customerNotes;

    // Tiến độ vận chuyển
    private TransportStage transportStage;
    private String transportNote;

    // Nghiệm thu
    private String completionPhotoUrl;
    private String handoverPhotoUrl;
    private String completionNotes;

    // Timestamps
    private LocalDateTime requestedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime arrivedAt;
    private LocalDateTime serviceStartedAt;
    private LocalDateTime serviceCompletedAt;
    private LocalDateTime cancelledAt;
    private String cancelReason;

    // Thanh toán (PayOS / Cash)
    private LocalDateTime paidAt;
    private String paymentMethod;
    private Long paymentTransactionId;
    private Long paymentOrderCode;

    // Thông tin hotline hỗ trợ nếu cần
    private String supportHotline;
}

package com.prm393.floodrescue.features.rescue.dto;

import com.prm393.floodrescue.features.rescue.entity.OrderType;
import com.prm393.floodrescue.features.rescue.entity.RescueOfferStatus;
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
public class RescueOfferResponse {

    private Long offerId;
    private Long orderId;
    private String orderCode;
    private OrderType orderType;
    private RescueOfferStatus status;

    private String customerName;
    private String customerPhone;
    private String customerAvatar;

    private String vehiclePlate;
    private String vehicleModel;
    private String vehicleType;
    private String waterLevel;

    private String pickupAddress;
    private Double pickupLatitude;
    private Double pickupLongitude;

    private String dropoffAddress;
    private Double dropoffLatitude;
    private Double dropoffLongitude;

    private BigDecimal totalAmount;

    private Double distanceMeters;
    private LocalDateTime offeredAt;
    private LocalDateTime expiresAt;
    private Long secondsRemaining;
}

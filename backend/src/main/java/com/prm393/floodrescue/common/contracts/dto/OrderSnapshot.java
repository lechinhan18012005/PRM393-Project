package com.prm393.floodrescue.common.contracts.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderSnapshot {
    private Long orderId;
    private Long customerUserId;
    private Long mechanicUserId;
    private Long mechanicStaffId;
    private Long garageId;
    private Long branchId;
    private Long batchTripId;
    private String rescueType;
    private String status;
    private String transportStage;
    private String orderCode;
    private String customerName;
    private String customerPhone;
    private String vehiclePlate;
    private String vehicleModel;
    private String pickupAddress;
    private String dropoffAddress;
    private BigDecimal bookingFee;
    private BigDecimal totalAmount;
}

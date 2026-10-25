package com.prm393.floodrescue.features.rescue.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRescueOrderRequest {

    @NotNull(message = "Vui lòng chọn gara cứu hộ")
    private Long garageId;

    @NotNull(message = "Vui lòng chọn dịch vụ vượt ngập")
    private Long serviceItemId;

    @NotNull(message = "Vui lòng chọn xe gặp nạn")
    private Long vehicleId;

    @NotBlank(message = "Địa chỉ đón không được để trống")
    private String pickupAddress;

    @NotNull(message = "Tọa độ vĩ độ đón không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ đón không hợp lệ")
    @DecimalMax(value = "90.0", message = "Vĩ độ đón không hợp lệ")
    private Double pickupLatitude;

    @NotNull(message = "Tọa độ kinh độ đón không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ đón không hợp lệ")
    @DecimalMax(value = "180.0", message = "Kinh độ đón không hợp lệ")
    private Double pickupLongitude;

    @NotBlank(message = "Địa chỉ trả xe nơi khô ráo không được để trống")
    private String dropoffAddress;

    @NotNull(message = "Tọa độ vĩ độ điểm trả không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ điểm trả không hợp lệ")
    @DecimalMax(value = "90.0", message = "Vĩ độ điểm trả không hợp lệ")
    private Double dropoffLatitude;

    @NotNull(message = "Tọa độ kinh độ điểm trả không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ điểm trả không hợp lệ")
    @DecimalMax(value = "180.0", message = "Kinh độ điểm trả không hợp lệ")
    private Double dropoffLongitude;

    private String waterLevel;

    private String customerNotes;

    // Idempotency token (chống submit nhiều lần)
    private String clientRequestId;

    // Snapshot giá khách đã xác nhận tại client (để server phát hiện thay đổi giá C01)
    private BigDecimal expectedServiceBasePrice;
    private BigDecimal expectedBookingFee;
    private BigDecimal expectedTotalAmount;
}

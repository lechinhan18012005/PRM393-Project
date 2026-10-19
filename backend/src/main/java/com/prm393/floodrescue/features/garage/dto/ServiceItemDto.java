package com.prm393.floodrescue.features.garage.dto;

import com.prm393.floodrescue.features.garage.entity.ServiceType;
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
public class ServiceItemDto {
    private Long id;

    @NotBlank(message = "Tên dịch vụ không được để trống")
    private String serviceName;

    private String category;
    private ServiceType serviceType;

    @NotNull(message = "Giá chuẩn không được để trống")
    private BigDecimal standardPrice;

    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private String unit;
    private Integer estimatedTimeMin;
    private String description;
    private boolean active;
    private Integer warrantyDays;
}

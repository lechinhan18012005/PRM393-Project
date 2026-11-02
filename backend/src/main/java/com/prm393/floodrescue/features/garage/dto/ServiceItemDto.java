package com.prm393.floodrescue.features.garage.dto;

import com.prm393.floodrescue.features.garage.entity.ApplicableVehicleType;
import com.prm393.floodrescue.features.garage.entity.ItemCategoryType;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
import jakarta.validation.constraints.*;
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
    @Size(min = 2, max = 150, message = "Tên dịch vụ phải từ 2 đến 150 ký tự")
    private String serviceName;

    @Size(max = 50, message = "Mã nhóm không quá 50 ký tự")
    private String category;

    private ServiceType serviceType;
    private ItemCategoryType itemCategoryType;
    private ApplicableVehicleType applicableVehicleType;

    @NotNull(message = "Giá chuẩn không được để trống")
    @DecimalMin(value = "1000", message = "Giá chuẩn phải tối thiểu 1.000 VNĐ")
    @DecimalMax(value = "50000000.00", message = "Giá chuẩn không được vượt quá 50.000.000 VNĐ")
    private BigDecimal standardPrice;

    @DecimalMin(value = "1000", message = "Giá tối thiểu phải ít nhất 1.000 VNĐ")
    @DecimalMax(value = "50000000.00", message = "Giá tối thiểu không được vượt quá 50.000.000 VNĐ")
    private BigDecimal minPrice;

    @DecimalMin(value = "1000", message = "Giá tối đa phải ít nhất 1.000 VNĐ")
    @DecimalMax(value = "50000000.00", message = "Giá tối đa không được vượt quá 50.000.000 VNĐ")
    private BigDecimal maxPrice;

    @Size(max = 30, message = "Đơn vị tính không quá 30 ký tự")
    private String unit;

    @Min(value = 1, message = "Thời gian ước tính tối thiểu 1 phút")
    @Max(value = 1440, message = "Thời gian ước tính tối đa 1440 phút (24 giờ)")
    private Integer estimatedTimeMin;

    @Size(max = 500, message = "Mô tả không quá 500 ký tự")
    private String description;

    private boolean active;
    private boolean deleted;
    private BigDecimal adminCeilingSnapshot;

    @Min(value = 0, message = "Thời hạn bảo hành không được âm")
    @Max(value = 365, message = "Thời hạn bảo hành tối đa 365 ngày")
    private Integer warrantyDays;
}

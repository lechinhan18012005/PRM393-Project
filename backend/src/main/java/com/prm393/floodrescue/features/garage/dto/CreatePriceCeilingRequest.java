package com.prm393.floodrescue.features.garage.dto;

import com.prm393.floodrescue.features.garage.entity.ItemCategoryType;
import com.prm393.floodrescue.features.garage.entity.ServiceType;
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
public class CreatePriceCeilingRequest {

    @NotNull(message = "Loại dịch vụ cứu hộ không được để trống")
    private ServiceType serviceType;

    @NotBlank(message = "Danh mục dịch vụ không được để trống")
    private String category;

    @NotNull(message = "Phân loại chi phí không được để trống")
    private ItemCategoryType itemCategoryType;

    @NotNull(message = "Mức giá trần không được để trống")
    @DecimalMin(value = "1000", message = "Giá trần tối thiểu 1.000 VNĐ")
    private BigDecimal maxAllowedPrice;

    private String description;

    @Builder.Default
    private boolean active = true;
}

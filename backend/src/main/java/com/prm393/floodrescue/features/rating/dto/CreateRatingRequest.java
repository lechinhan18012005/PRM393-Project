package com.prm393.floodrescue.features.rating.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRatingRequest {

    @NotNull(message = "Mã đơn cứu hộ (rescueOrderId) không được để trống")
    private Long rescueOrderId;

    @NotNull(message = "Số sao đánh giá (stars) không được để trống")
    @Min(value = 1, message = "Số sao đánh giá tối thiểu là 1 sao")
    @Max(value = 5, message = "Số sao đánh giá tối đa là 5 sao")
    private Integer stars;

    @Size(max = 500, message = "Thẻ đánh giá nhanh không được vượt quá 500 ký tự")
    private String tags;

    @Size(max = 1000, message = "Nhận xét chi tiết không được vượt quá 1000 ký tự")
    private String comment;
}

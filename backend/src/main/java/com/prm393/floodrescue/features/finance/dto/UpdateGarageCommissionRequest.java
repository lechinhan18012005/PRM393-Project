package com.prm393.floodrescue.features.finance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * =================================================================================================
 * TÀI LIỆU KỸ THUẬT & GIẢI THÍCH MÃ NGUỒN (TECHNICAL DOCUMENTATION)
 * =================================================================================================
 * Phân hệ (Module): Quản trị Tài chính & Cấu hình Chiết khấu Hoa hồng (Finance Admin)
 * Use Case liên quan:
 *   - UC-24: Configure Platform Commission Rate (Cấu hình tỷ lệ chiết khấu hoa hồng riêng cho từng đối tác Gara)
 * Luồng nghiệp vụ: Luồng 5 (Thanh toán, Đối soát PayOS & Quản trị Tài chính)
 *
 * Mục đích của lớp DTO này:
 *   - Tiếp nhận dữ liệu đầu vào (Request Body) từ API `PATCH /api/v1/finance/garages/{garageId}/commission`
 *     khi Quản trị viên (Role.ADMIN) điều chỉnh tỷ lệ phần trăm (%) chiết khấu hoa hồng của một Gara cụ thể.
 *   - Áp dụng Jakarta Bean Validation (`@NotNull`, `@DecimalMin`, `@DecimalMax`) ngay tại tầng Controller
 *     để ngăn chặn dữ liệu bất hợp lệ (tỷ lệ âm hoặc vượt quá 100%) trước khi đi vào tầng Service.
 * =================================================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGarageCommissionRequest {

    /**
     * Tỷ lệ phần trăm (%) hoa hồng nền tảng áp dụng riêng cho Gara được chọn.
     * Quy tắc kiểm tra hợp lệ (Validation Rules):
     *   - `@NotNull`: Bắt buộc phải truyền giá trị số thập phân (BigDecimal).
     *   - `@DecimalMin("0.00")`: Không cho phép tỷ lệ chiết khấu âm (tối thiểu 0% trong trường hợp miễn phí sàn hỗ trợ bão lũ).
     *   - `@DecimalMax("100.00")`: Không cho phép vượt quá 100% giá trị đơn hàng.
     */
    @NotNull(message = "Tỷ lệ chiết khấu hoa hồng không được để trống")
    @DecimalMin(value = "0.00", message = "Tỷ lệ chiết khấu hoa hồng không được nhỏ hơn 0%")
    @DecimalMax(value = "100.00", message = "Tỷ lệ chiết khấu hoa hồng không được vượt quá 100%")
    private BigDecimal commissionRate;

    /**
     * Ghi chú hoặc lý do phê duyệt điều chỉnh tỷ lệ chiết khấu (ví dụ: "Ưu đãi đối tác chiến lược khu vực ngập sâu Q7").
     * Nội dung này sẽ được lưu vào bảng lịch sử cấu hình hoa hồng (`commission_configs`) để phục vụ kiểm toán (Audit Trail).
     */
    private String notes;
}

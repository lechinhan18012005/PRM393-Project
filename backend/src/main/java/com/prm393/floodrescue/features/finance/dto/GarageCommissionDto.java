package com.prm393.floodrescue.features.finance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * =================================================================================================
 * TÀI LIỆU KỸ THUẬT & GIẢI THÍCH MÃ NGUỒN (TECHNICAL DOCUMENTATION)
 * =================================================================================================
 * Phân hệ (Module): Quản trị Tài chính & Cấu hình Chiết khấu Hoa hồng theo từng Gara (Finance Admin)
 * Use Case liên quan:
 *   - UC-24: Configure Platform Commission Rate (Cấu hình tỷ lệ hoa hồng nền tảng & chiết khấu riêng cho từng đối tác Gara)
 *   - UC-25: Monitor Cash Flow & PayOS Reconciliation (Giám sát dòng tiền & số dư ví từng đối tác Gara)
 * Luồng nghiệp vụ: Luồng 5 (Thanh toán, Đối soát PayOS & Quản trị Tài chính)
 *
 * Mục đích của lớp DTO (Data Transfer Object) này:
 *   - Đóng gói toàn bộ thông tin tài chính và danh mục dịch vụ của một đối tác Gara cứu hộ để hiển thị
 *     trên bảng "Cấu hình Chiết khấu theo Gara" của cổng Web Admin (chỉ dành riêng cho Role.ADMIN).
 *   - Kết hợp dữ liệu từ nhiều bảng thực thể (Garage, GarageBranch, ServiceItem) thành một cấu trúc phẳng
 *     và giàu ngữ cảnh giúp Admin dễ dàng đánh giá quy mô dịch vụ, trạng thái xác thực eKYC, số dư ví
 *     hiện tại và mức tỷ lệ chiết khấu hoa hồng (%) đang áp dụng cho từng Gara.
 * =================================================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageCommissionDto {

    /**
     * Mã định danh duy nhất (Primary Key) của Gara đối tác trong bảng `garages`.
     * Dùng làm khóa tham chiếu khi Admin gửi lệnh PATCH cập nhật tỷ lệ hoa hồng riêng cho Gara.
     */
    private Long garageId;

    /**
     * Tên thương mại chính thức của Gara cứu hộ (ví dụ: "Gara Cứu Hộ Toàn Thắng Sài Gòn").
     */
    private String garageName;

    /**
     * Số điện thoại đường dây nóng (Hotline) liên hệ trực tiếp với chủ Gara đối tác.
     */
    private String phone;

    /**
     * Địa chỉ trụ sở chính hoặc chi nhánh đầu tiên của Gara (trích xuất từ bảng `garage_branches`).
     * Giúp Admin nhận diện khu vực địa lý hoạt động của Gara (Quận 1, Quận 7, Thủ Đức, Bình Thạnh...).
     */
    private String address;

    /**
     * Trạng thái hồ sơ pháp lý hiện tại của Gara (PENDING, APPROVED, REJECTED, SUSPENDED).
     */
    private String status;

    /**
     * Cờ đánh dấu Gara đã hoàn tất thẩm định hồ sơ pháp lý & eKYC (Nghị định 13/2023/NĐ-CP) hay chưa.
     * Giá trị bằng `true` khi `status == GarageStatus.APPROVED`.
     */
    private Boolean isVerified;

    /**
     * Cờ đánh dấu Gara hiện có chi nhánh đang mở cửa trực chiến (BranchStatus.OPEN) để nhận đơn cứu hộ hay không.
     */
    private Boolean isOnline;

    /**
     * Tỷ lệ phần trăm (%) hoa hồng nền tảng đang áp dụng riêng cho Gara này (ví dụ: 12.50 tương ứng 12.5%).
     * Cơ chế ưu tiên (Override Mechanism):
     *   - Nếu Gara đã được Admin thiết lập mức `commissionRate` riêng khác null trong bảng `garages`, hệ thống
     *     sẽ ưu tiên sử dụng mức chiết khấu riêng này khi tính phí sàn (`platformFee`) trong `PaymentAttemptService`.
     *   - Nếu Gara chưa có mức riêng (`null`), trường này sẽ hiển thị mức `globalRate` hiện hành của toàn sàn.
     */
    private BigDecimal commissionRate;

    /**
     * Số dư ví điện tử hiện tại của Gara trên hệ thống (đơn vị: VNĐ).
     * Phản ánh tổng doanh thu ròng (`netGarageAmount`) đã đối soát trừ đi các khoản rút tiền (`PAYOUT_WITHDRAW`)
     * và khấu trừ hoàn tiền khiếu nại (`DISPUTE_REFUND_DEDUCT`).
     */
    private BigDecimal walletBalance;

    /**
     * Tổng số lượng gói dịch vụ cứu hộ đang có trong danh mục (`garage_service_catalog`) của Gara.
     */
    private Integer serviceCount;

    /**
     * Danh sách tóm tắt các dịch vụ cứu hộ tiêu biểu của Gara kèm đơn giá niêm yết cơ sở (`basePrice`).
     * Giúp Admin tham khảo mặt bằng giá dịch vụ của Gara trước khi quyết định tăng hoặc giảm tỷ lệ chiết khấu.
     */
    private List<GarageServiceSummaryDto> services;

    /**
     * Thời điểm cập nhật cấu hình hoặc hồ sơ gần nhất của Gara.
     */
    private LocalDateTime updatedAt;

    /**
     * Lớp DTO con (Nested Static Class) biểu diễn thông tin tóm tắt của một hạng mục dịch vụ cứu hộ thuộc Gara.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GarageServiceSummaryDto {

        /**
         * Mã định danh duy nhất của hạng mục dịch vụ trong bảng `garage_service_catalog`.
         */
        private Long id;

        /**
         * Tên dịch vụ cứu hộ (ví dụ: "Chở xe qua ngập", "Súc rửa động cơ thủy kích").
         */
        private String serviceName;

        /**
         * Đơn giá tiêu chuẩn (`standardPrice`) niêm yết cho dịch vụ (đơn vị: VNĐ).
         */
        private BigDecimal basePrice;

        /**
         * Trạng thái kích hoạt của dịch vụ (`true`: đang mở phục vụ khách hàng, `false`: tạm ngưng).
         */
        private Boolean isActive;
    }
}

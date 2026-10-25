# HỢP ĐỒNG TÍCH HỢP THANH TOÁN (UC-18) VÀ ĐÁNH GIÁ (UC-19)
**Dự án:** Motorbike Flood Rescue Platform (PRM393)  
**Tác giả Luồng 3 (Tích hợp):** Lê Chí Nhân  
**Chủ sở hữu Module Thanh toán (Luồng 5):** Nguyễn Hoàng Long  
**Chủ sở hữu Module Đánh giá (Luồng 9):** Bùi Hoàng Phúc  

---

## 1. Giới hạn Phạm vi Hiện tại (Scope Boundary)

- **Phạm vi của Luồng 3:**
  1. Luồng 3 đưa đơn hàng chở xe đơn lẻ (`SINGLE_CROSSING`) chạy qua các trạng thái: `REQUESTED` $\to$ `DISPATCHED` $\to$ `ARRIVED` $\to$ `IN_PROGRESS` $\to$ `PAYMENT_PENDING`.
  2. Tại trạng thái `PAYMENT_PENDING`, thợ cứu hộ đã hoàn thành chở xe và nộp ảnh nghiệm thu; thợ được giải phóng về trạng thái `AVAILABLE`.
  3. Màn hình thanh toán (UC-18) và màn hình đánh giá (UC-19) trên ứng dụng Flutter hiện tại **chỉ đóng vai trò giao diện tĩnh (Preview/Mock UI)**.
  4. Tuyệt đối không tích hợp cổng PayOS thật, không tạo mã QR chuyển khoản thật có thể thanh toán, không xử lý Webhook, không giả mạo API chuyển trạng thái sang `PAID`, không thực hiện ghi sổ giao dịch, không trừ hoa hồng và không cộng tiền vào ví gara.
  5. Tuyệt đối không gọi API lưu đánh giá thật, không thay đổi điểm uy tín trung bình (`ratingAvg`) của thợ/gara.

---

## 2. Hợp đồng Giao tiếp Tích hợp Module Thanh toán (Payment Gateway Contract)

### 2.1. Dữ liệu Đầu vào từ Đơn Cứu hộ (Input Payload)
Khi màn hình thanh toán (UC-18) được mở ra hoặc khi module thanh toán khởi tạo giao dịch, đơn cứu hộ cung cấp payload chuẩn:

```json
{
  "orderId": 105,
  "orderCode": "SOS-261022-8924",
  "orderType": "SINGLE_CROSSING",
  "orderStatus": "PAYMENT_PENDING",
  "customerId": 5,
  "customerName": "Hoàng Văn Khách",
  "customerPhone": "0900000005",
  "mechanicId": 4,
  "mechanicName": "Phạm Thợ Cứu Hộ",
  "garageId": 1,
  "garageName": "Gara Cứu Hộ Toàn Thắng Sài Gòn",
  "branchId": 1,
  "branchName": "Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)",
  "vehicleId": 1,
  "vehiclePlate": "59-B1 892.44",
  "serviceName": "Chở xe qua ngập (Chuyến riêng)",
  "serviceBasePrice": 120000.00,
  "bookingFee": 30000.00,
  "totalAmount": 150000.00,
  "currency": "VND",
  "serviceCompletedAt": "2026-10-22T21:45:00"
}
```

### 2.2. Giao thức Tích hợp Tương lai (Architecture Integration Pattern)
- **Quy tắc sở hữu bảng:** Module thanh toán (Nguyễn Hoàng Long) quản lý bảng `payment_transactions` và `garage_wallets`. Module này không được tự ý viết câu lệnh SQL sửa đổi trực tiếp các cột trên bảng `rescue_orders`.
- **Giao thức Command / Domain Event:**
  1. Khi thanh toán thành công (qua PayOS Webhook hoặc xác nhận tiền mặt):
     Module thanh toán phát ra event hoặc gọi service command:
     ```java
     rescueOrderService.markPaymentSuccessful(
         Long orderId,
         String transactionCode,
         PaymentMethod paymentMethod,
         BigDecimal paidAmount,
         LocalDateTime paidAt
     );
     ```
  2. Lớp nghiệp vụ `rescue` sẽ kiểm tra tính toàn vẹn (số tiền `paidAmount == order.totalAmount`), chuyển trạng thái đơn hàng sang `COMPLETED` (hoặc `PAID`), lưu thông tin giao dịch tham chiếu và kích hoạt quyền đánh giá cho khách.

---

## 3. Hợp đồng Giao tiếp Tích hợp Module Đánh giá (Review Gateway Contract)

### 3.1. Điều kiện Tiên quyết để Đánh giá (Review Eligibility Rules)
Module đánh giá (Bùi Hoàng Phúc) chỉ cho phép khách hàng gửi đánh giá khi thỏa mãn đồng thời các điều kiện nghiệp vụ sau (theo chuẩn SRS):
1. **Quyền sở hữu:** Tài khoản gửi đánh giá phải chính là `customer` đã tạo đơn (`authenticatedUser.id == order.customer.id`).
2. **Trạng thái đơn hàng:** Đơn cứu hộ phải ở trạng thái đã hoàn tất và đã thanh toán thành công (`paymentStatus == PAID` hoặc `status == COMPLETED`). Không cho phép đánh giá trước khi thanh toán.
3. **Số lần đánh giá:** Mỗi đơn cứu hộ chỉ được gửi đánh giá duy nhất 1 lần (quan hệ 1:1 giữa đơn và review).
4. **Cửa sổ thời gian (Time Window):** Theo đặc tả SRS, khách hàng chỉ được phép đánh giá trong vòng 48 giờ kể từ thời điểm thanh toán thành công. Sau 48 giờ, quyền đánh giá sẽ tự động hết hạn.

### 3.2. Contract Dữ liệu Đánh giá
```json
{
  "orderId": 105,
  "customerId": 5,
  "mechanicId": 4,
  "garageId": 1,
  "ratingScore": 5,
  "reviewComment": "Thợ đến nhanh, chằng buộc xe máy SH rất cẩn thận, chở an toàn qua đường Huỳnh Tấn Phát ngập lút bánh.",
  "submittedAt": "2026-10-22T22:00:00"
}
```
Sau khi lưu đánh giá, module đánh giá sẽ tính toán lại điểm trung bình cộng có trọng số cho thợ (`mechanic_staffs.rating_avg`) và chi nhánh gara.

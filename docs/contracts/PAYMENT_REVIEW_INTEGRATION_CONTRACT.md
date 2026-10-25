# HỢP ĐỒNG TÍCH HỢP THANH TOÁN (UC-18) VÀ ĐÁNH GIÁ (UC-19)
**Dự án:** Motorbike Flood Rescue Platform (PRM393)  
**Tác giả Luồng 3 (Tích hợp cứu hộ & thanh toán):** Lê Chí Nhân  
**Module Thanh toán & Đối soát (Giai đoạn 1 & 2):** Đã hợp nhất vào luồng cứu hộ đơn lẻ (SINGLE_CROSSING)  
**Chủ sở hữu Module Đánh giá (Luồng 9 / UC-19):** Bùi Hoàng Phúc  
**Cập nhật ngày:** 25/10/2026 (Phê duyệt tích hợp thanh toán PayOS thực tế)

---

## 1. Phạm vi Nghiệp vụ Đã Phê duyệt & Ranh giới Module

### 1.1. Module Thanh toán (UC-18) - ĐÃ TÍCH HỢP TOÀN DIỆN (End-to-End)
Theo yêu cầu phê duyệt mới nhất (25/10/2026), giới hạn "Preview/Mock UI" trước đây đối với **UC-18 (Thanh toán)** đã được dỡ bỏ và thay thế bằng việc tích hợp hoàn chỉnh xuyên suốt từ ứng dụng di động đến backend, cổng PayOS và kế toán ví Gara:
1. Luồng chở xe đơn lẻ (`SINGLE_CROSSING`) chạy qua các trạng thái: `REQUESTED` $\to$ `DISPATCHED` $\to$ `ARRIVED` $\to$ `IN_PROGRESS` $\to$ `PAYMENT_PENDING`.
2. Tại trạng thái `PAYMENT_PENDING`, thợ cứu hộ đã hoàn thành chở xe và nghiệm thu có ảnh bàn giao thật; thợ được giải phóng về trạng thái `AVAILABLE`.
3. Khách hàng mở màn hình thanh toán VietQR PayOS: Backend khởi tạo hoặc tái sử dụng giao dịch PayOS hợp lệ với số tiền, gara và mã đơn xác thực từ `RescueOrder`.
4. Cổng PayOS gửi Webhook có chữ ký bảo mật HMAC-SHA256: Backend xác thực chữ ký, đối chiếu số tiền, cập nhật trạng thái giao dịch `SUCCESS`, cộng tiền thực nhận vào Ví Gara, ghi sổ `WalletTransaction` và cập nhật đơn cứu hộ sang trạng thái kết thúc `COMPLETED`.
5. Đảm bảo tính toán Exactly-Once, chống lặp webhook, kiểm soát tranh chấp đồng thời và phân quyền truy cập nghiêm ngặt.

### 1.2. Module Đánh giá (UC-19) - GIỮ NGUYÊN RANH GIỚI PREVIEW
UC-19 vẫn do thành viên khác (Bùi Hoàng Phúc) phụ trách:
1. Tuyệt đối **không** viết lại backend đánh giá, không tự ý sửa đổi hoặc giả mạo điểm số đánh giá trung bình (`ratingAvg`) của thợ/gara.
2. Màn hình đánh giá trên Mobile giữ nhãn rõ ràng là xem trước UI `(Đánh giá dịch vụ - Xem trước UI)`, không tạo đánh giá giả.
3. Luồng cứu hộ và thanh toán cung cấp đầy đủ thông tin trạng thái `COMPLETED`, thời điểm thanh toán `paidAt`, mã giao dịch và dữ liệu sẵn sàng để Module đánh giá kết nối sau.

---

## 2. Vòng đời Đơn hàng và Trạng thái Kết thúc (COMPLETED)

### 2.1. Trạng thái `RescueOrderStatus.COMPLETED`
- Trạng thái `COMPLETED` đại diện cho một cuốc cứu hộ chở xe đơn lẻ đã hoàn thành vận chuyển, bàn giao xe và thanh toán thành công.
- **Hành vi hệ thống khi COMPLETED:**
  - `getActiveOrderByUser`: Trả về `null` đối với khách hàng (khách hàng được giải phóng để tạo yêu cầu SOS mới khi cần).
  - Thợ cứu hộ đã được giải phóng từ bước `PAYMENT_PENDING`, nên trạng thái `COMPLETED` tuyệt đối không chiếm dụng thợ.
  - `RescueTrackingService`: Đơn `COMPLETED` không còn nhận cập nhật GPS trực tiếp từ thợ; chỉ trả về snapshot tọa độ lưu lúc hoàn tất hành trình (`finalMechanicLatitude`, `finalMechanicLongitude`) để bảo vệ quyền riêng tư của thợ.
  - `completeOrder` (Thợ retry): Nếu đơn đã ở `PAYMENT_PENDING` hoặc `COMPLETED`, trả về kết quả hiện tại một cách idempotent, không giải phóng nhầm thợ đang nhận đơn tiếp theo hoặc ghi audit trùng lặp.

---

## 3. Giao thức Tích hợp Thanh toán (Payment Integration Protocol)

### 3.1. Nguyên tắc Sở hữu Dữ liệu và Phân ranh Kiến trúc
- Bảng `payment_transactions`, `garage_wallets`, `wallet_transactions` thuộc quyền quản lý của tính năng thanh toán/tài chính.
- Bảng `rescue_orders` và `rescue_order_audits` thuộc quyền quản lý của tính năng cứu hộ.
- **Không bao giờ** viết câu lệnh SQL trực tiếp từ controller/service thanh toán để sửa bảng `rescue_orders`. Mọi tương tác chuyển trạng thái đơn hàng bắt buộc phải thông qua domain service command:
  ```java
  @Transactional
  public RescueOrder markPaymentSuccessful(
          Long rescueOrderId,
          Long paymentTransactionId,
          Long paymentOrderCode,
          String paymentMethod,
          BigDecimal paidAmount,
          LocalDateTime paidAt
  );
  ```

### 3.2. Khởi tạo Giao dịch Thanh toán (`POST /api/v1/payments/create`)
- **Phân quyền:** Chỉ `CUSTOMER` sở hữu đơn hoặc `ADMIN` mới được phép khởi tạo thanh toán. Khách hàng khác hoặc vai trò không hợp lệ bị từ chối `403 Forbidden`.
- **Dữ liệu nguồn đáng tin cậy:** Toàn bộ thông tin Garage, Branch, Loại đơn, Tổng tiền (`totalAmount`) và Mã đơn (`orderCode`) được backend đọc từ `RescueOrder` trong cơ sở dữ liệu với khóa dòng (Pessimistic Write Lock). Backend tuyệt đối không tin tưởng client tự gửi số tiền hay tự chọn gara. Nếu client gửi kèm mà có sự sai lệch, backend từ chối `400 Bad Request`.
- **Chống tạo nghĩa vụ thu tiền trùng lặp (Idempotency):** Giữ nguyên mã của attempt `PENDING`/`FAILED` cho tới khi gateway xác nhận link đã kết thúc; không dùng hạn 15 phút local để sinh link khác. Với gateway thật, reservation và cờ `gateway_requested` được commit trước HTTP. Khi response bị mất, retry tra cứu bằng đúng mã đã lưu; nếu gateway xác nhận chưa có link thì chỉ retry CREATE với cùng mã. Khi GET không trả lại QR, dùng hosted checkout phục hồi từ link id.
- **Đơn đã hoàn tất:** Nếu đơn đã ở trạng thái `COMPLETED`, backend trả về thông tin giao dịch `SUCCESS` đã hoàn tất trước đó; không phát sinh giao dịch mới hay hạch toán mới.

### 3.3. Xử lý Webhook PayOS (`POST /api/v1/payments/payos/webhook`)
- Cổng PayOS gửi thông báo thanh toán về Webhook công khai.
- **Xác thực chữ ký:** Tính toán và so khớp chữ ký HMAC-SHA256 theo đúng chuẩn PayOS từ canonical data map. Chữ ký sai hoặc dữ liệu thiếu bị từ chối `400 Bad Request`.
- **Đối chiếu số tiền:** Số tiền thanh toán (`data.amount`) phải khớp chính xác với `transaction.amount`. Bất kỳ sự sai lệch nào cũng bị từ chối và ghi log cảnh báo.
- **Xử lý Exactly-Once:** 
  1. Xác minh chữ ký/identity, khóa đơn rồi payment trước khi cập nhật trạng thái. Callback lỗi không làm `SUCCESS`, `REFUNDED` hoặc `DUPLICATE_PAID` lùi về thất bại. Callback lặp đúng giao dịch hoàn tất đơn không ghi tiền/audit/paidAt lần hai; khoản đến muộn của attempt khác được đưa vào đối soát.
  2. Trong cùng một Database Transaction `@Transactional`:
     - Cập nhật `PaymentTransaction.status = SUCCESS`, ghi nhận `paidAt`.
     - Cộng số tiền thực nhận (`netGarageAmount`) vào `Garage.walletBalance`.
     - Tạo bản ghi `WalletTransaction` với loại `ORDER_INCOME`.
     - Gọi `rescueExecutionService.markPaymentSuccessful(...)` cập nhật `RescueOrder.status = COMPLETED`, lưu `paidAt`, `paymentMethod = "PAYOS"`, `paymentOrderCode`, và ghi log `RescueOrderAudit`.
  3. Nếu bất kỳ bước nào trong chuỗi xử lý gặp sự cố, toàn bộ transaction tự động Rollback, đảm bảo tính nhất quán tuyệt đối giữa Cứu hộ – Thanh toán – Ví tiền.
  4. Trước khi tính tiền, đọc số dư bằng `SELECT ... FOR UPDATE`; PayOS, CASH và payout dùng chung khóa ví. Payout khóa ví trước khi tải yêu cầu rút để tránh đọc trạng thái cũ khi xác nhận lặp. Khóa từng đơn không thay cho khóa ví dùng chung của gara.

### 3.4. Thanh toán Tiền mặt (Cash Payment)
- Khách hàng **không được phép** tự xác nhận nộp tiền mặt để đổi trạng thái đơn thành `COMPLETED`.
- API `confirm-cash` chỉ cho phép thợ cứu hộ được phân công chính thức cho đơn, chủ gara của đơn hoặc Admin thực hiện.
- Khi xác nhận tiền mặt: Ví Gara bị khấu trừ phí hoa hồng nền tảng (`platformFee`) vì thợ đã thu đủ 100% tiền mặt từ khách hàng; đơn cứu hộ chuyển sang `COMPLETED` với phương thức `CASH`.
- Trên ứng dụng di động thực tế, phương thức tiền mặt bị ẩn/vô hiệu hóa trong luồng khách hàng để tập trung thanh toán minh bạch qua PayOS VietQR.

---

## 4. Hợp đồng Tích hợp Đánh giá (Review Eligibility Rules)

Module Đánh giá (UC-19 do Bùi Hoàng Phúc triển khai) sẽ kết nối với hợp đồng sau:
1. **Điều kiện tiên quyết:**
   - Người gọi là khách hàng sở hữu đơn (`currentUser.id == rescueOrder.customer.id`).
   - Đơn cứu hộ phải ở trạng thái `COMPLETED` và có `paidAt != null`.
   - Đơn cứu hộ chưa từng được đánh giá (quan hệ 1:1).
   - Thời gian gửi đánh giá nằm trong vòng 48 giờ kể từ `paidAt`.
2. **Dữ liệu cung cấp sẵn sàng từ RescueOrder:**
   - `orderId`, `orderCode`
   - `customerId`, `customerName`
   - `mechanicStaffId`, `mechanicName`
   - `garageId`, `garageName`, `branchId`
   - `serviceName`, `paidAt`, `totalAmount`
3. **Màn hình Review trên Mobile:**
   - Hiển thị thông tin dịch vụ và biên nhận thật.
   - Nút đánh giá gắn nhãn rõ ràng: `(Đánh giá dịch vụ - Xem trước UI)`.

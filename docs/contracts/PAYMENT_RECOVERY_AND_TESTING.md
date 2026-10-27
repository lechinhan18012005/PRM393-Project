# Phục hồi PayOS và kiểm thử ví

## Luồng lưu dữ liệu

- `PaymentAttemptService` xác minh chủ đơn, giá/gara và lưu attempt trong transaction ngắn.
- `GatewayProvisionService` tạm ngưng transaction bên gọi khi làm việc với gateway thật. Reservation và `gateway_requested` đã commit trước HTTP, nên không giữ khóa đơn hoặc ví trong lúc chờ mạng.
- `PayOSGatewayClient` dùng API CREATE/GET tại [PayOS API chính thức](https://payos.vn/docs/api/). Retry dùng lại merchant orderCode; lỗi mạng/503 không xóa reservation. Nếu gateway chưa trả đủ kết quả thì báo chưa xác định, không đưa tài khoản mẫu vào nhánh real.
- Khi GET trả link id mà không có QR, hệ thống phục hồi hosted checkout theo định dạng PayOS đã công bố. Khách có thể dùng nút mở trang thanh toán; không render icon làm mã QR thật.
- Gateway xác nhận PAID và số tiền khớp thì xử lý qua cùng `PaymentSettlementService` với webhook. Callback đến sau không cộng ví lần nữa.
- Link PENDING được dùng lại dù đã qua 15 phút. Link CANCELLED/EXPIRED chỉ được đóng local sau khi query gateway xác nhận; lần khởi tạo tiếp theo mới tạo mã khác. Không tự tạo thêm link vì mất mạng hoặc đổi phương thức. Người dùng có thể hủy trên checkout PayOS; chưa có nút hủy gateway riêng trong app.
- Webhook vẫn là đường cập nhật chính. Với giao dịch PayOS thật còn PENDING/FAILED, API `GET /api/v1/payments/{orderCode}` cũng hỏi gateway và thực hiện settlement khi PayOS xác nhận PAID. Polling và nút kiểm tra vì thế có thể chuyển sang màn thành công ngay, không cần đóng rồi mở lại màn.
- Polling được giới hạn gọi gateway mỗi 5 giây; nút kiểm tra gửi `refresh=true`, được giới hạn mỗi 1 giây. Mỗi mã chỉ có một yêu cầu đồng bộ chạy tại một thời điểm trong một backend instance. Các request trong thời gian chờ trả trạng thái DB hiện tại. Giới hạn này là trong bộ nhớ từng instance; chống hạch toán lặp vẫn dựa vào khóa và transaction database.
- API kiểm tra xác minh quyền trên đơn trước khi gọi gateway, chỉ dùng GET và không tạo link thanh toán mới. Lỗi gateway không biến giao dịch thành SUCCESS hoặc tự tạo khoản thu khác. Giao dịch đã thành công, CASH và simulation chỉ đọc DB.

## Trạng thái và ví

Webhook đã xác minh mới được xử lý. Việc cập nhật payment, ledger, số dư và đơn nằm cùng transaction. Callback lỗi đến muộn giữ nguyên kết quả đã ghi nhận tiền; callback hợp lệ của attempt khác trên đơn COMPLETED được ghi DUPLICATE_PAID để đối soát, không cộng tiền lần hai.

Mọi writer số dư PayOS/CASH/payout dùng khóa dòng ví và đọc số dư sau khóa. `Garage` dùng DynamicUpdate để việc sửa metadata không ghi lại số dư cũ. Xác nhận payout lặp phải kiểm tra trạng thái sau khi có khóa ví.

Trong môi trường real không được giả lập giao dịch thật. Nút demo/API simulate chỉ dùng giao dịch đánh dấu simulation và cấu hình server opt-in; thiếu user hoặc thiếu quyền sẽ bị từ chối. Đổi link PayOS thật sang xác nhận CASH trực tiếp bị chặn; dùng đúng phương thức từ đầu.

## Áp dụng schema

1. Dừng backend test đang chạy để tránh sử dụng schema nửa cũ/nửa mới.
2. Kiểm tra và chạy `backend/migration_payment_integration.sql` trên database test được chọn. Script bổ sung các trường của lần tích hợp, bao gồm `is_simulation`, `gateway_requested` và `gateway_link_id`; nâng trạng thái order/payment/audit.
3. Khởi động lại backend với môi trường PayOS tương ứng. Không đưa key vào source hoặc log.
4. App cần bản Flutter mới để hiển thị lỗi/link phục hồi và bỏ QR đã kết thúc.

Script đã được kiểm tra upgrade và chạy lặp trên PostgreSQL test riêng. Không tự động chạy script trên database nhóm. Các khoản tiền/link orphan có trước bản sửa cần đối soát theo dữ liệu gateway; code không đoán hoặc sửa lịch sử tiền cũ.

## Kiểm thử

Thông thường:

```powershell
cd backend
mvn test
cd ../mobile
flutter test
flutter analyze
```

`GatewayRecoveryIntegrationTest` sử dụng HTTP server cục bộ, mô phỏng gateway nhận request nhưng đóng kết nối trước khi gửi response. Test kiểm tra reservation còn tồn tại, dùng lại code, phục hồi checkout/PAID, xác nhận CANCELLED và rollback toàn bộ khi settlement thất bại. Test API kiểm tra còn bao phủ thanh toán thành công khi chưa có webhook, giới hạn polling, kiểm tra thủ công, quyền truy cập, lỗi gateway và không ghi ledger lặp. Test Flutter xác minh cả polling lẫn bấm kiểm tra chuyển sang màn thành công. Không dùng key thật hoặc gọi gateway thật.

Kiểm thử cạnh tranh PostgreSQL là opt-in, vì tạo/xóa schema. Chỉ dùng database test riêng đã tạo, tên `payos_test_*` hoặc database mặc định `payos_wallet_fix`, trên localhost. Không trỏ vào database đang dùng bởi app/nhóm.

```powershell
$env:RUN_PAYMENT_POSTGRES_TESTS = 'true'
$env:PAYMENT_TEST_DB_URL = 'jdbc:postgresql://127.0.0.1:55439/payos_test_wallet'
$env:PAYMENT_TEST_DB_USER = 'your_local_test_user'
$env:PAYMENT_TEST_DB_PASSWORD = 'your_local_test_password'
mvn '-Dtest=PaymentConcurrencyPostgresTest' test
```

Test kiểm tra hai payment của hai đơn cùng gara, payment cạnh tranh payout và hai lần chuyển cùng một payout. Có trigger trì hoãn UPDATE trong database test để ép lịch cạnh tranh; trigger được dọn trong finally. Khi không bật opt-in, Maven bỏ qua ca PostgreSQL này. Việc callback PayOS thật tới URL public vẫn cần smoke test sau khi người dùng cấu hình credentials/webhook; các test tự động không chứng minh kết nối ngân hàng thật.

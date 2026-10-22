# Mobile Khách hàng — đồng bộ giao diện Nhân viên cứu hộ

Ngày cập nhật: 22/10/2026.

## Thiết kế và điều hướng

- Dùng chung RescuePanel, RescueLabel, RescueSection và RescueInfo với Mobile nhân viên cứu hộ. Các tên MechanicPanel/Label/Section/Info được giữ làm alias để không đổi các màn hiện có.
- Màu xanh đậm, cam, xanh ngọc; nền sáng, viền thẻ nhẹ, cùng khoảng cách và phân cấp chữ.
- Trang chủ có lời chào theo hồ sơ, thông tin xe, nút gọi cứu hộ, lối tắt dịch vụ, sơ đồ điểm ngập và báo ngập cộng đồng.
- Thanh dưới giữ liên tục giữa Trang chủ, Bản đồ, Lịch sử, Xe của tôi, Tài khoản. Các tab được mở khi cần và giữ trạng thái; bản đồ không tải lại chỉ vì chuyển tab.
- Thiết kế lại danh sách xe, bộ lọc và chi tiết lịch sử mẫu, bản đồ/danh sách điểm ngập, theo dõi cứu hộ. Đồng bộ thẻ thông tin và phần giới thiệu trong chọn dịch vụ, báo ngập, báo giá, thanh toán, hóa đơn và đánh giá.
- Màn tài khoản dùng lại API xem, cập nhật và đăng xuất hiện có, với phần đầu trang đồng bộ hai vai trò.

## Dữ liệu và chức năng

- Giữ các endpoint hiện có; không thêm API hoặc thay đổi phân quyền.
- Tab xe và trang chủ dùng cùng danh sách mẫu; chọn xe được giữ trong phiên và truyền sang màn chọn dịch vụ. Chức năng thêm/sửa/lưu xe thật chưa có API.
- Lịch sử, yêu cầu cứu hộ, sơ đồ đường đi và giao dịch mẫu được ghi nhãn minh họa. Không trình bày chúng như giao dịch thật.
- Bản đồ tiếp tục lấy danh sách điểm ngập từ FloodReportProvider. Sơ đồ không định vị theo GPS. Có trạng thái tải/lỗi/rỗng; lỗi mạng không được trình bày như đường đang an toàn.
- Luồng gửi báo ngập, tải ảnh và các giới hạn vị trí/ảnh có từ trước được giữ nguyên; đây không phải triển khai camera hoặc GPS mới.

## Kiểm tra

- `flutter analyze`: không có issue.
- `flutter test`: 55 test thành công, gồm 6 test mới kiểm tra giữ thanh dưới, tải bản đồ khi mở lần đầu, đồng bộ xe, lọc lịch sử, lỗi tải bản đồ và các tab ở chiều rộng 320px/cỡ chữ 1.6.
- Các test tài khoản và các test giao diện nhân viên cứu hộ vẫn thành công.
- Ảnh xem trước render từ widget 390×844, dùng dữ liệu/provider kiểm thử. Chưa nghiệm thu trên thiết bị Android/iOS thật.

## Xem trước

- [Trang chủ](ui-preview/customer-overview.png)
- [Xe của tôi](ui-preview/customer-vehicles.png)
- [Lịch sử](ui-preview/customer-history.png)

Dựng lại ảnh trên Windows từ thư mục mobile:

```powershell
flutter test --dart-define=CAPTURE_CUSTOMER_UI=true test/customer_workspace_test.dart
```

Các test thường không phụ thuộc font Windows; chế độ chụp ảnh dùng Segoe UI và font biểu tượng Material có sẵn.

## Sửa lỗi hot reload

Trạng thái tab có giá trị mặc định khi đọc; tập tab đã mở khởi tạo khi cần. Thay đổi áp dụng cho khách hàng và nhân viên cứu hộ, tránh gọi `contains` trên biến chưa khởi tạo trong State được giữ từ phiên trước. Bổ sung test reassemble cây widget và giữ tab đang chọn. `flutter build web --debug` thành công. Khi nâng cấp từ phiên giao diện cũ, hot restart một lần để tái tạo State đầy đủ.

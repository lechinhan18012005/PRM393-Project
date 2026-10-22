# Giao diện Web Gara và Mobile Thợ — 20/10/2026

## Thiết kế

Đồng bộ với Admin/Staff: cam #E86332, xanh đậm #182D40, xanh ngọc #168B8B, nền #F6F8FA. Giảm padding lồng nhau, phân cấp tiêu đề, thống kê và nhóm thao tác; hỗ trợ màn hình nhỏ.

| Khu vực | Thay đổi |
| --- | --- |
| Web tổng quan | Thống kê chi nhánh, đội thợ, trạng thái nhận việc, dịch vụ từ API; bảng chi nhánh; hướng dẫn thiết lập; đội thợ |
| Web chi nhánh / đội thợ | Tab, tìm kiếm, thống kê; ngăn bên thêm/sửa chi nhánh và mời thợ; phân chi nhánh, ca trực, quyền làm việc |
| Web bảng giá | Tìm kiếm, lọc trạng thái, danh mục gọn; ngăn bên thêm/sửa; hiển thị giá, khoảng giá, bảo hành, thời gian |
| Web hồ sơ gara | Giới thiệu quy trình xét duyệt và biểu mẫu giấy tờ theo hai cột |
| Web doanh thu / vận chuyển | Cấu trúc thống kê, ví, giao dịch, chuyến; trạng thái chưa có dữ liệu hoặc dữ liệu mẫu rõ ràng |
| Mobile thợ | Thanh dưới: Tổng quan, Công việc, Ca trực, Công cụ, Tài khoản; giữ thanh dưới khi chuyển các mục chính |
| Mobile nghiệp vụ | Thiết kế lại tiếp nhận, sơ đồ di chuyển, báo giá, checklist sửa chữa; tổng giá tính theo lựa chọn; hoàn tất checklist trước bước thanh toán mẫu |

## API và phạm vi

- Giữ nguyên các endpoint quản lý gara, chi nhánh, lời mời, phân công, danh mục dịch vụ.
- Hồ sơ, chi nhánh, ca được phân và trạng thái làm việc của thợ lấy từ API. Không còn trạng thái online giả lưu riêng ở trang chủ.
- Đổi trạng thái chỉ báo thành công khi provider nhận kết quả thành công. Không gửi tọa độ GPS hardcode.
- Tài khoản dùng lại màn xem / sửa thông tin và đăng xuất hiện có.
- Danh sách đơn, đường đi, báo giá, sửa chữa và thanh toán mẫu chưa được nối nghiệp vụ thật; giao diện ghi rõ mô phỏng.
- Doanh thu, rút tiền và điều phối chuyến chưa có API thật. Nút giao dịch vô hiệu hóa; chỉ hiển thị số mẫu khi bật VITE_DEMO_MODE.

## Kiểm tra

- Web: `npm run lint`, `npm run build`.
- Mobile: `flutter analyze`, `flutter test` — 49 test thành công, gồm 7 test mới cho điều hướng, trạng thái thành công/thất bại, chặn đổi khi bận, tính tổng giá, checklist và màn 320px với cỡ chữ 1.6.
- Trình duyệt: đăng nhập garage trên backend test-run với H2 riêng; xem thống kê, thêm chi nhánh, lưu ca trực, thêm dịch vụ và bật/tắt dịch vụ qua API thật của môi trường kiểm thử.
- Ảnh Web chụp từ trình duyệt với dữ liệu H2 kiểm thử; ảnh Mobile render widget ở 390×844 với provider kiểm thử. Ảnh không phải bằng chứng nghiệm thu trên thiết bị Android/iOS thật.
- Build Web còn cảnh báo bundle lớn hơn 500 kB.

## Ảnh xem trước

- [Web tổng quan](ui-preview/garage-overview.png)
- [Web đội thợ](ui-preview/garage-team.png)
- [Web dịch vụ](ui-preview/garage-services.png)
- [Mobile tổng quan và thanh dưới](ui-preview/mechanic-overview.png)

Có thể dựng lại ảnh Mobile trên Windows bằng `flutter test --dart-define=CAPTURE_UI=true test/mechanic_workspace_test.dart` trong thư mục mobile. Chế độ chụp nạp font Segoe UI từ Windows; các test thường không phụ thuộc font này.

# Thống kê API đã nối với giao diện Mobile và Web

Ngày rà soát: 20/10/2026. Chuẩn bị cho buổi trình diễn ngày 21/10/2026.

Phạm vi: mã nguồn trên nhánh `fix/auth-register`, commit `5a580d1` và thay đổi quản lý tài khoản Mobile đang nằm trong working tree. Đây là đối chiếu màn hình → service → API, không phải kết quả chạy thử toàn bộ hệ thống trên database/Cloudinary đang sử dụng.

Tất cả đường dẫn dưới đây có tiền tố `/api/v1`. “Đã nối” nghĩa là giao diện thực sự gọi API và sử dụng phản hồi; không chỉ có một hàm service chưa được màn hình sử dụng.

## 1. Phân quyền

| Nền tảng | Vai trò đăng nhập | Đăng ký/cấp tài khoản |
| --- | --- | --- |
| Mobile | CUSTOMER, FIELD_MECHANIC | CUSTOMER tự đăng ký; Thợ kích hoạt lời mời |
| Web | ADMIN, STAFF, GARAGE_OWNER | Chủ gara tự đăng ký chờ duyệt; Staff do Admin mời |

ADMIN có phân hệ quản trị và vận hành. STAFF chỉ vận hành. GARAGE_OWNER chỉ quản lý gara của mình. Gara PENDING/REJECTED chỉ được xem/bổ sung hồ sơ; gara SUSPENDED không được tự nộp lại để vượt đình chỉ. API quản lý nguồn lực kiểm tra gara APPROVED và quyền sở hữu dữ liệu.

## 2. Mobile: tài khoản và phiên đăng nhập

| Chức năng | Màn hình | API | Tình trạng |
| --- | --- | --- | --- |
| Khách hàng tự đăng ký | Đăng ký Khách hàng | POST `/auth/register` | Đã nối; chỉ cấp CUSTOMER |
| Đăng nhập Khách hàng/Thợ | Đăng nhập | POST `/auth/login` với platform=MOBILE | Đã nối, kiểm tra role |
| Khôi phục phiên, xem/tải lại tài khoản | Splash, Tài khoản | GET `/auth/me` | Đã nối |
| Cập nhật họ tên/email/số điện thoại | Tài khoản → Chỉnh sửa | PATCH `/auth/me` | Đã nối; kiểm tra trùng và dữ liệu không hợp lệ |
| Kích hoạt Thợ được mời | Kích hoạt Thợ cứu hộ | POST `/onboarding/activate` | Đã nối; người dùng tự đặt mật khẩu |
| Đăng xuất | Tài khoản; trang chủ Thợ | Không có API logout | Xóa access token, refresh token, thông tin lưu trên thiết bị và quay về đăng nhập |

Tên đăng nhập và vai trò chỉ được xem, không chỉnh sửa bằng API cập nhật hồ sơ. Logout hiện là kết thúc phiên trên thiết bị, không phải thu hồi JWT ở server. Chưa có luồng UI tự làm mới access token qua `/auth/refresh`.

## 3. Mobile: nghiệp vụ có gọi API nhưng chưa hoàn thiện

| Chức năng | API | Đã thực hiện | Phần còn thiếu |
| --- | --- | --- | --- |
| Xem hồ sơ/ca làm của thợ | GET `/mechanics/me/profile` | Đọc hồ sơ từ backend | Một số nội dung màn hình khác vẫn dùng mẫu |
| Bật/tắt trực tuyến | PATCH `/mechanics/me/status` | Cập nhật trạng thái ở backend nếu request thành công | Tọa độ gán sẵn; UI chưa kiểm tra kết quả trước thông báo thành công |
| Gửi báo cáo ngập | POST `/flood-reports` | Gửi địa chỉ, mức nước, mô tả và URL ảnh vào backend | Tọa độ tính từ mức nước; chưa dùng GPS/chọn tọa độ thật |
| Đính kèm ảnh báo ngập | POST `/upload/image` | Có đường gọi upload | Vẫn gửi bytes mô phỏng; service Mobile có thể trả URL giả khi lỗi; chưa chụp/chọn ảnh thật |
| Xem điểm ngập đã duyệt | GET `/flood-reports/active` | Danh sách và bộ lọc dùng dữ liệu API | Ghim bố trí cố định trên canvas, chưa phải bản đồ địa lý thật |

Không giới thiệu các phần này là GPS thật, chụp ảnh thật hoặc bản đồ thật trong buổi demo. Có thể trình bày riêng phần lưu/đọc dữ liệu API và nói rõ giới hạn.

## 4. Web: đăng nhập và hồ sơ Chủ gara

| Chức năng | Màn hình | API | Tình trạng |
| --- | --- | --- | --- |
| Đăng nhập Admin/Staff/Chủ gara | Đăng nhập | POST `/auth/login` với platform=WEB | Đã nối, kiểm tra role |
| Khôi phục phiên | Khi mở lại Web | GET `/auth/me` | Đã nối |
| Tạo tài khoản Chủ gara và hồ sơ | Đăng ký gara | POST `/onboarding/garage` | Đã nối; tạo tài khoản và hồ sơ PENDING trong một giao dịch |
| Tải giấy phép/CCCD thật | Đăng ký/Hồ sơ Chủ gara | POST `/upload/image` | Đã nối; cần Cloudinary hợp lệ; lỗi trả thông báo tiếng Việt |
| Xem trạng thái và lý do duyệt | Hồ sơ Chủ gara | GET `/garages/me` | Đã nối |
| Tài khoản Chủ gara cũ chưa có hồ sơ | Hồ sơ Chủ gara | POST `/garages/register` | Đã nối; không tự nâng CUSTOMER thành GARAGE_OWNER |
| Bổ sung/nộp lại hồ sơ | Hồ sơ Chủ gara | PUT `/garages/me/application` | Đã nối; chỉ PENDING/REJECTED |
| Đăng xuất | Menu tài khoản | Không có API logout | Xóa phiên lưu trong trình duyệt |

Cloud name đã được chỉnh theo thông tin người dùng cung cấp. Không coi việc đổi cấu hình là bằng chứng upload đã thành công với tài khoản thật; nên thử một ảnh trước buổi trình diễn.

## 5. Web: Chủ gara quản lý nguồn lực

| Chức năng | API | Màn hình |
| --- | --- | --- |
| Tổng quan hồ sơ, số chi nhánh/thợ | GET `/garages/me` | Quản lý gara |
| Danh sách chi nhánh | GET `/garages/branches` | Chi nhánh & đội thợ |
| Thêm chi nhánh | POST `/garages/branches` | Chi nhánh & đội thợ |
| Sửa chi nhánh | PUT `/garages/branches/{id}` | Chi nhánh & đội thợ |
| Đóng/mở chi nhánh | PATCH `/garages/branches/{id}/status` | Chi nhánh & đội thợ |
| Danh sách thợ | GET `/garages/mechanics` | Chi nhánh & đội thợ |
| Mời thợ vào một chi nhánh | POST `/garages/mechanics/invitations` | Chi nhánh & đội thợ |
| Phân chi nhánh, ca làm | PATCH `/garages/mechanics/{id}/allocate` | Chi nhánh & đội thợ |
| Khóa/mở quyền làm việc của thợ | PATCH `/garages/mechanics/{id}/status` | Chi nhánh & đội thợ |
| Danh sách dịch vụ/bảng giá | GET `/garages/services` | Dịch vụ & bảng giá |
| Thêm dịch vụ | POST `/garages/services` | Dịch vụ & bảng giá |
| Sửa giá/thông tin, bật/tắt dịch vụ | PUT `/garages/services/{id}` | Dịch vụ & bảng giá |
| Xóa dịch vụ | DELETE `/garages/services/{id}` | Dịch vụ & bảng giá |

Các chức năng trên đã nối API. Khóa thợ không cho tiếp tục dùng token khi tài khoản đang bị khóa. Không cho phân thợ sang chi nhánh gara khác.

## 6. Web: Staff/Admin duyệt gara

| Chức năng | API | Màn hình |
| --- | --- | --- |
| Danh sách hồ sơ gara, tìm/lọc | GET `/staff/garages` | Điều phối → Duyệt gara |
| Xem chi nhánh trong hồ sơ | GET `/staff/garages/{id}/branches` | Chi tiết duyệt gara |
| Xem đội thợ trong hồ sơ | GET `/staff/garages/{id}/mechanics` | Chi tiết duyệt gara |
| Duyệt/từ chối/yêu cầu bổ sung/đình chỉ/lưu ghi chú | PATCH `/staff/garages/{id}/moderate` | Duyệt gara |

Yêu cầu bổ sung trả hồ sơ về REJECTED kèm ghi chú để chủ gara nộp lại. SUSPENDED dành cho đình chỉ. Không có eKYC tự động; Staff xem giấy tờ và quyết định. Xuất CSV danh sách gara là xử lý trên trình duyệt từ dữ liệu đã tải, không phải API xuất báo cáo riêng.

## 7. Web: Admin cấp tài khoản Staff

| Chức năng | API | Màn hình |
| --- | --- | --- |
| Danh sách Staff đã kích hoạt | GET `/admin/staff` | Tài khoản Staff |
| Tạo lời mời Staff | POST `/admin/staff/invitations` | Tài khoản Staff |
| Khóa/mở Staff | PATCH `/admin/staff/{id}/status` | Tài khoản Staff |
| Người nhận kích hoạt Staff hoặc Thợ | POST `/onboarding/activate` | Kích hoạt tài khoản được mời |

Mã mời có hiệu lực 48 giờ, dùng một lần và gắn email được mời. Hiện người tạo chia sẻ mã thủ công; hệ thống chưa tự gửi email/SMS. Kích hoạt xong, Staff đăng nhập Web và Thợ đăng nhập Mobile.

## 8. Web: quản lý báo ngập — nối một phần

| Chức năng | API | Giới hạn |
| --- | --- | --- |
| Tải báo cáo ngập để Staff xem | GET `/staff/flood-reports` | Còn trộn dữ liệu API với dữ liệu mẫu |
| Duyệt hoặc loại báo cáo spam | PATCH `/staff/flood-reports/{id}/moderate` | UI có thể báo thành công kể cả khi API lỗi |
| Xác nhận nước rút | PATCH `/staff/flood-reports/{id}/resolve` | Cần sửa xử lý phản hồi lỗi và cập nhật UI |

“Phát cảnh báo tới 1.842 người” và “điều động gara lập chốt” hiện không có nghiệp vụ gửi thông báo/điều phối thật. Không trình bày như chức năng đã hoàn thiện.

## 9. Phần chưa có luồng API hoàn chỉnh

- SOS, điều phối/nhận ca cứu hộ, theo dõi/dẫn đường, thực hiện sửa hoặc kéo/chở xe, nghiệm thu.
- Lập và chốt báo giá theo từng ca cứu hộ.
- PayOS/tiền mặt, hạch toán, đối soát, ví/rút tiền/hoàn tiền.
- Khiếu nại, đánh giá và quản lý xe cá nhân: vẫn chủ yếu là UI mẫu, chưa có luồng API hoàn chỉnh.
- Bảng giá gara công khai đã có API backend nhưng chưa được nối vào màn hình khách hàng để chọn gara/dịch vụ.

Một số hàm service cũ vẫn tồn tại nhưng không còn màn hình gọi, ví dụ tạo thợ trực tiếp từ Mobile. Không tính các hàm này là chức năng UI đã nối. Chủ gara hiện dùng Web.

## 10. Kịch bản demo đề xuất

1. Mobile: đăng ký Khách hàng → đăng nhập → mở Tài khoản → sửa thông tin → tải lại/đăng nhập lại để chứng minh lưu dữ liệu → đăng xuất.
2. Web: đăng ký Chủ gara và tải giấy tờ → chỉ thấy hồ sơ chờ duyệt.
3. Web Staff/Admin: xem giấy tờ → trả hồ sơ yêu cầu bổ sung → Chủ gara nộp lại → Staff duyệt.
4. Web Chủ gara: thêm/sửa/đóng mở chi nhánh → thêm/sửa/bật tắt dịch vụ và giá.
5. Web Chủ gara: mời Thợ → kích hoạt trên Mobile → đăng nhập Thợ → xem ca làm được phân từ Web. Nếu trình diễn online/offline, nói rõ GPS hiện còn tọa độ mẫu và kiểm tra dữ liệu phía backend.
6. Web Admin: tạo lời mời Staff → kích hoạt trên Web → đăng nhập Staff → minh họa giới hạn quyền; khóa tài khoản và kiểm tra bị chặn.
7. Nếu cần, trình bày báo ngập ở mức có gọi API và lưu/đọc dữ liệu, đồng thời nói rõ phần ảnh/GPS/bản đồ còn mô phỏng.

## 11. Chuẩn bị trước buổi demo

- Khởi động lại backend để nhận PATCH `/auth/me`, sau đó chạy lại Mobile/Web từ mã nguồn hiện tại.
- Chuẩn bị tài khoản Admin/Staff hợp lệ, email riêng cho các tài khoản demo và ảnh giấy tờ mẫu phù hợp.
- Thử trước upload Cloudinary, kiểm tra API Key/Secret cùng tài khoản với Cloud name; không đưa API Secret vào slide/log trình chiếu.
- Dữ liệu demo seed mặc định tắt; không reset database hoặc tự bật seed trên database đang dùng chỉ để chuẩn bị demo.
- Dùng đúng địa chỉ backend cho thiết bị thật/Android Emulator; đảm bảo CORS đúng origin Web.
- Tính đến lần kiểm thử gần nhất: 31 test backend và 42 test Mobile đạt; Flutter analyze sạch. Không chạy lại bộ test hoặc demo toàn bộ hệ thống trong lượt lập thống kê này.
- Thay đổi quản lý tài khoản Mobile mới hiện chưa commit; bảng thống kê này bao gồm cả phần đó.

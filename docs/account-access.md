# Phân quyền và quy trình tài khoản

## Nền tảng và vai trò

| Vai trò | Nền tảng | Cấp tài khoản |
| --- | --- | --- |
| CUSTOMER | Mobile | Đăng ký công khai trên Mobile |
| FIELD_MECHANIC | Mobile | Chủ gara đã duyệt mời vào chi nhánh |
| GARAGE_OWNER | Web | Đăng ký công khai và nộp hồ sơ |
| STAFF | Web | Admin mời |
| ADMIN | Web | Cấp sẵn bởi quản trị hệ thống |

Admin có phân hệ quản trị và vận hành; Staff chỉ có vận hành; Chủ gara chỉ có gara của mình. Admin không giả làm chủ gara để sửa dữ liệu của một gara qua API dành cho owner.

## Chủ gara

Chọn **Đăng ký gara** trên Web, nhập thông tin tài khoản, tên gara và tải ảnh giấy phép kinh doanh/CCCD. Tài khoản và hồ sơ được tạo trong cùng giao dịch; hồ sơ ban đầu `PENDING`. Đăng nhập chỉ hiển thị trang trạng thái/bổ sung hồ sơ cho đến khi được duyệt.

Staff/Admin vào **Điều phối → Duyệt gara**, xem ảnh giấy tờ thật và lưu quyết định kèm lý do. Hồ sơ `REJECTED` có thể sửa và nộp lại thành `PENDING`; `SUSPENDED` phải được Staff/Admin xử lý, không tự nộp lại để vượt đình chỉ. API chi nhánh, bảng giá, đội thợ đều kiểm tra gara `APPROVED`.

Tài khoản Chủ gara cũ chưa có hồ sơ được nộp hồ sơ từ trang chờ. Tài khoản CUSTOMER không còn được tự nâng vai trò qua `/garages/register`; muốn làm chủ gara cần đăng ký tài khoản Web riêng theo quy trình mới. Không tự đổi vai trò hay duyệt dữ liệu cũ khi cập nhật ứng dụng.

## Staff và Thợ cứu hộ

1. Admin vào **Tài khoản Staff**, hoặc Chủ gara vào **Chi nhánh & đội thợ** và chọn email/chi nhánh.
2. Tạo mã mời; người tạo gửi riêng mã cho đúng người nhận. Chưa có gửi email/SMS tự động.
3. Người nhận chọn **Kích hoạt tài khoản được mời** trên Web. Thợ cũng có thể kích hoạt trực tiếp trên Mobile. Nhập mã, đúng email được mời, tên đăng nhập và mật khẩu riêng.
4. Sau kích hoạt: Staff đăng nhập Web, Thợ đăng nhập Mobile. Không tự đăng nhập hay lưu token sau khi kích hoạt.

Mã ngẫu nhiên 256 bit, lưu hash SHA-256 trong database, có người cấp, hết hạn sau 48 giờ, dùng một lần. Khóa dòng khi kích hoạt để ngăn dùng đồng thời. Email đã có tài khoản không nhận tài khoản mới qua lời mời; cần email riêng cho tài khoản công việc.

Admin khóa/mở Staff. Chủ gara khóa/mở thợ của mình, phân chi nhánh và ca làm. Khóa thợ đưa trạng thái về OFFLINE và vô hiệu quyền dùng token cũ. Không phân thợ hoặc tạo lời mời sang chi nhánh gara khác.

## API mới

- `POST /api/v1/onboarding/garage`: `{ account, application }`; tạo GARAGE_OWNER và hồ sơ PENDING.
- `PUT /api/v1/garages/me/application`: bổ sung/nộp lại hồ sơ PENDING hoặc REJECTED.
- `POST /api/v1/admin/staff/invitations`: `{ email }`; chỉ ADMIN.
- `GET /api/v1/admin/staff`; `PATCH /api/v1/admin/staff/{id}/status`: `{ active }`.
- `POST /api/v1/garages/mechanics/invitations`: `{ email, branchId }`; chủ gara APPROVED.
- `POST /api/v1/onboarding/activate`: `{ code, account }`; vai trò lấy từ lời mời, không từ body.
- `PATCH /api/v1/garages/mechanics/{id}/status`: `{ active }`; chỉ chủ gara sở hữu thợ.

API tạo tài khoản thợ trực tiếp `POST /garages/mechanics` đã được gỡ. Đăng nhập gửi `platform: MOBILE | WEB` để backend kiểm tra vai trò phù hợp; các client cũng kiểm tra role trước khi lưu phiên và khi khôi phục phiên. Client platform là thông tin định tuyến, quyền truy cập dữ liệu vẫn được quyết định bởi vai trò và chủ sở hữu tại backend.

## Cấu hình và giới hạn

- Cần cấu hình `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` thật để tải giấy tờ. Backend trả HTTP 503 khi cấu hình lưu ảnh chưa sẵn sàng hoặc dịch vụ upload bị lỗi; không trả URL ảnh giả. Chi tiết lỗi nhà cung cấp chỉ ghi ở log máy chủ, giao diện hiển thị thông báo tiếng Việt. Giới hạn upload là 5 MB/ảnh (HTTP 413 khi vượt giới hạn multipart).
- Database hiện dùng Hibernate `ddl-auto=update`; khi khởi động sẽ bổ sung bảng `account_invitation` cho mã mời. Không có thao tác xóa dữ liệu hay reset database trong thay đổi này. Nếu môi trường dùng `validate`, cần tự áp dụng schema tương ứng trước.
- Chưa tích hợp xác minh email/SMS hoặc eKYC tự động; Staff/Admin tự kiểm tra giấy tờ trước khi duyệt.
- Doanh thu, ví/rút tiền và chuyến chở xe được chuyển từ Mobile sang Web ở mức giao diện demo. Không có API/giao dịch tài chính thật; thao tác rút tiền/điều phối chuyến chưa khả dụng.

## Kiểm tra

`mvn -f backend/pom.xml test`, `npm --prefix web run lint`, `npm --prefix web run build`, `cd mobile` rồi `flutter analyze`, `flutter test`.

Integration test bao gồm ma trận vai trò/nền tảng, chặn gara chưa duyệt, vòng đời nộp lại/duyệt/đình chỉ, lời mời đúng email/hết hạn/dùng lại, quyền Admin và quyền sở hữu chi nhánh, khóa Staff/Thợ và token cũ. Mobile test kiểm tra vai trò trước lưu phiên, xóa phiên cũ không còn phù hợp và kích hoạt không lưu phiên đăng nhập.

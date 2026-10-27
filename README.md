# Motorbike Flood Rescue Platform (PRM393)

Ứng dụng gồm `backend` (Spring Boot), `web` (React/Vite) và `mobile` (Flutter). Backend hỗ trợ xác thực, hồ sơ gara/chờ duyệt, chi nhánh, dịch vụ, đội thợ và báo ngập. Web quản lý Admin/Staff/Chủ gara; Mobile dành cho Khách hàng/Thợ cứu hộ. Các nghiệp vụ thanh toán, doanh thu và chuyến chở xe còn là demo, chưa có giao dịch thật.

Xem [thiết kế phân quyền và hướng dẫn cấp tài khoản](docs/account-access.md).

## Cấu trúc

```text
backend/  Spring Boot, auth API, Flyway migration, security tests
web/      React portal, auth API client, role navigation, demo views
mobile/   Flutter app, auth API client, demo screens
```

## Chạy cục bộ

Yêu cầu JDK 17 trở lên, Maven, Node.js và Flutter SDK phù hợp với `mobile/pubspec.yaml`.

```powershell
cd backend
Copy-Item .env.example .env
# Cấu hình database và JWT trong .env trước khi chạy.
mvn spring-boot:run
```

Backend dùng database được cấu hình trong `.env`, không tự tạo tài khoản mẫu. API mặc định tại `http://localhost:8080/api/v1/auth`. H2 chỉ dùng cho bài test với profile `test`.

```powershell
cd web
npm ci
Copy-Item .env.example .env.local
# Đặt VITE_DEMO_MODE=true trong .env.local để xem giao diện nghiệp vụ mẫu.
npm run dev
```

Web tại `http://localhost:3000`. Các màn hình quản lý tài khoản, hồ sơ gara, chi nhánh, đội thợ và bảng giá gọi API thật ở cả hai chế độ. Doanh thu/ví và chuyến chở xe chỉ hiển thị dữ liệu mẫu khi bật demo. Nút đăng nhập nhanh chỉ hiện trong chế độ demo và vẫn xác thực với backend; không có đăng nhập giả khi backend không chạy.

```powershell
cd mobile
flutter pub get
flutter run --dart-define=DEMO_MODE=true
```

Mobile có nhãn `UI DEMO` trên giao diện. Nút đăng nhập nhanh chỉ hiện khi bật `DEMO_MODE`. Với thiết bị thật hoặc backend ở máy khác, truyền `--dart-define=API_BASE_URL=http://<server>:8080/api/v1`; Android Emulator mặc định dùng `10.0.2.2`, iOS Simulator và web dùng `localhost`.

## Tài khoản và phân quyền

- Mobile: chỉ `CUSTOMER` và `FIELD_MECHANIC`; đăng ký công khai chỉ tạo `CUSTOMER`.
- Web: chỉ `ADMIN`, `STAFF`, `GARAGE_OWNER`. Chủ gara đăng ký công khai và nộp giấy phép/CCCD; chỉ được vận hành sau khi Staff/Admin duyệt. Gara chờ duyệt/từ chối chỉ được xem và bổ sung hồ sơ; gara đình chỉ bị chặn vận hành.
- Admin mời Staff; Chủ gara đã duyệt mời Thợ gắn với chi nhánh. Mã mời có hiệu lực 48 giờ, dùng một lần; người nhận tự đặt mật khẩu khi kích hoạt. Mã được chia sẻ thủ công, chưa tự gửi email/SMS.
- Backend kiểm tra vai trò, trạng thái duyệt và quyền sở hữu dữ liệu. Tài khoản bị khóa không được tiếp tục dùng access token cũ.
- Các chức năng của Chủ gara đã chuyển sang Web, không còn màn hình Chủ gara trên Mobile.

## Cấu hình backend

Backend đọc `backend/.env` khi chạy từ thư mục gốc dự án (IntelliJ) và `.env` khi chạy từ thư mục `backend`.

Sao chép `backend/.env.example` thành `backend/.env` rồi đặt URL, username, password PostgreSQL và khóa JWT riêng. Không commit `.env`. `JWT_SECRET` phải là khóa ngẫu nhiên Base64 có ít nhất 32 byte. Backend mặc định không seed tài khoản và chỉ chấp nhận CORS origins trong `CORS_ALLOWED_ORIGINS`.

## Kiểm tra

### Thử API bằng Swagger

Sau khi chạy backend, mở http://localhost:8080/swagger-ui/index.html. OpenAPI JSON tại http://localhost:8080/v3/api-docs.

1. Mở `POST /api/v1/auth/register` hoặc `POST /api/v1/auth/login`, chọn **Try it out**, nhập dữ liệu và chọn **Execute**.
2. Sao chép `data.accessToken` từ phản hồi.
3. Chọn **Authorize**, dán access token (không thêm tiền tố `Bearer`) rồi xác nhận.
4. Thử `GET /api/v1/auth/me`. Với `POST /api/v1/auth/refresh`, gửi `refreshToken` trong body.

```powershell
cd backend; mvn test
cd ../web; npm run lint; npm run build
cd ../mobile; flutter analyze; flutter test
```

# Motorbike Flood Rescue Platform (PRM393)

Ứng dụng gồm ba phần: `backend` (Spring Boot), `web` (React/Vite) và `mobile` (Flutter). Backend hiện triển khai **xác thực và tài khoản**. Các màn hình cứu hộ, điều phối, tài chính và PayOS trên web/mobile là **giao diện demo dùng dữ liệu mẫu**, chưa có API nghiệp vụ hoặc tích hợp thanh toán thật. Không dùng các màn hình này để xử lý giao dịch thật.

## Cấu trúc

```text
backend/  Spring Boot, auth API, Flyway migration, security tests
web/      React portal, auth API client, role navigation, demo views
mobile/   Flutter app, auth API client, demo screens
```

## Chạy bản demo cục bộ

Yêu cầu JDK 21, Maven, Node.js và Flutter SDK phù hợp với `mobile/pubspec.yaml`.

```powershell
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

Profile `demo` dùng H2 trong bộ nhớ, tạo năm tài khoản mẫu (mật khẩu `Password@123`) và chỉ dùng cho phát triển. API mặc định tại `http://localhost:8080/api/v1/auth`.

```powershell
cd web
npm ci
Copy-Item .env.example .env.local
# Đặt VITE_DEMO_MODE=true trong .env.local để xem giao diện nghiệp vụ mẫu.
npm run dev
```

Web tại `http://localhost:3000`. Khi `VITE_DEMO_MODE=false`, web chỉ cho đăng nhập và thông báo các phân hệ nghiệp vụ chưa sẵn sàng. Nút đăng nhập nhanh chỉ hiện trong chế độ demo và vẫn xác thực với backend; không có đăng nhập giả khi backend không chạy.

```powershell
cd mobile
flutter pub get
flutter run --dart-define=DEMO_MODE=true
```

Mobile có nhãn `UI DEMO` trên giao diện. Nút đăng nhập nhanh chỉ hiện khi bật `DEMO_MODE`. Với thiết bị thật hoặc backend ở máy khác, truyền `--dart-define=API_BASE_URL=http://<server>:8080/api/v1`; Android Emulator mặc định dùng `10.0.2.2`, iOS Simulator và web dùng `localhost`.

## Tài khoản và phân quyền

Đăng ký công khai chỉ tạo tài khoản `CUSTOMER`, kể cả khi request cố gửi vai trò khác. Tài khoản `ADMIN`, `STAFF`, `GARAGE_OWNER`, `FIELD_MECHANIC` chỉ được cấp qua quy trình quản trị riêng. Quy trình cấp tài khoản đối tác/nhân viên chưa được triển khai; bản demo dùng tài khoản seed của profile `demo`.

Web chỉ hiển thị phân hệ đúng vai trò: `ADMIN` quản trị tài chính, `STAFF` vận hành, `GARAGE_OWNER` quản trị gara. `CUSTOMER` và `FIELD_MECHANIC` dùng mobile. Mọi API nghiệp vụ bổ sung sau này phải kiểm tra quyền ở backend, không dựa vào việc ẩn nút trên web.

## Cấu hình ngoài demo

Sao chép `backend/.env.example` thành `backend/.env` rồi đặt URL, username, password PostgreSQL và khóa JWT riêng. Không commit `.env`. `JWT_SECRET` phải là khóa ngẫu nhiên Base64 có ít nhất 32 byte. Backend mặc định không seed tài khoản và chỉ chấp nhận CORS origins trong `CORS_ALLOWED_ORIGINS`.

Flyway tạo schema mới qua `V1__create_users.sql`; Hibernate chỉ kiểm tra schema (`ddl-auto: validate`). Nếu đang dùng database cũ do Hibernate `update` tạo, cần sao lưu và baseline schema theo quy trình Flyway trước khi chạy phiên bản mới.

## Kiểm tra

```powershell
cd backend; mvn test
cd ../web; npm run lint; npm run build
cd ../mobile; flutter analyze; flutter test
```

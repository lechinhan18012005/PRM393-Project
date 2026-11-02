# UC-05: Quản lý Thợ Cứu hộ và Phân bổ Chi nhánh (Manage Mechanic Staff & Allocation)

**Mã Use Case:** UC-05  
**Actor chính:** Garage Owner (Chủ gara)  
**Actor phụ:** Field Mechanic (Thợ sửa xe/cứu hộ), Firebase Auth, Dịch vụ SMS / OTP  
**Phạm vi hệ thống:** Phân hệ Đối tác Garage & Điều phối Cứu hộ PRM393  
**Độ ưu tiên:** Cao (High)  
**Ngày cập nhật:** 30/10/2026  

---

## 1. Mô tả Nghiệp vụ (Business Overview)
Use Case này cho phép Chủ gara quản trị toàn bộ vòng đời nhân sự của đội ngũ thợ cứu hộ (Mechanic Staff) trực thuộc doanh nghiệp:
- Tạo mới tài khoản và cấp quyền làm việc (`FIELD_MECHANIC`).
- Phân bổ hoặc luân chuyển thợ giữa các chi nhánh hoạt động theo điểm nóng ngập lụt.
- Thiết lập chuyên môn cứu hộ (sửa buồng đốt, thay bugi, xử lý ngập nước) và năng lực chở xe vượt ngập sâu (`hasCrossingCapability`).
- Quản lý ca trực (`shiftName`), khóa/mở quyền nhận đơn (`active`), cấp lại mật khẩu tạm thời.
- Cho thôi việc (Soft delete) an toàn mà không làm gián đoạn các cuốc cứu hộ đang thực hiện hay mất dữ liệu đối soát/đánh giá cũ.

---

## 2. Điều kiện Tiền quyết (Pre-conditions)
- **PRE-1:** Garage của Chủ gara đã được Nhân viên vận hành (Staff) phê duyệt (`status = 'APPROVED'`). Garage ở trạng thái `PENDING` hoặc `SUSPENDED` sẽ bị chặn quyền quản lý nhân sự.
- **PRE-2:** Garage có ít nhất 01 chi nhánh đang ở trạng thái hoạt động (`operatingStatus = 'OPEN'`).
- **PRE-3:** Chủ gara đã đăng nhập thành công vào Cổng đối tác Web/Mobile.

---

## 3. Điều kiện Sau thực hiện (Post-conditions)
- **POST-1:** Hồ sơ thợ được tạo hoặc cập nhật và liên kết chính xác với một chi nhánh hợp lệ.
- **POST-2:** Mật khẩu tạm thời hoặc mã kích hoạt được sinh và gửi tới thợ (đồng thời hiển thị trực tiếp cho Chủ gara sao chép).
- **POST-3:** Hệ thống cập nhật hàng đợi không gian (Geospatial Dispatch Queue) sẵn sàng cho việc điều phối cuốc cứu hộ khi thợ bật `ONLINE`.

---

## 4. Các Luồng Nghiệp vụ (Use Case Flows)

### 4.1. Luồng chính (Normal Flow) — Thêm mới Thợ cứu hộ
1. Chủ gara mở màn hình **"Quản lý Đội ngũ thợ"** và bấm **"Thêm Thợ cứu hộ mới"**.
2. Chủ gara nhập thông tin: Họ tên, Số điện thoại, Tên đăng nhập (CCCD/Username), Email và Mật khẩu ban đầu.
3. Chủ gara chọn Chi nhánh trực thuộc mà thợ sẽ trực chiến.
4. Chủ gara thiết lập Ca làm việc (VD: *Ca Chiều - Trực Bão (14:00 - 22:00)*), Chuyên môn kỹ thuật và tích chọn nếu thợ có phương tiện vượt ngập sâu (`hasCrossingCapability`).
5. Hệ thống xác thực tính hợp lệ của dữ liệu đầu vào và kiểm tra không trùng lặp Username/SĐT.
6. Hệ thống tạo tài khoản User với vai trò `FIELD_MECHANIC`, khởi tạo hồ sơ `MechanicStaff` với trạng thái `OFFLINE`, liên kết vào chi nhánh chỉ định.
7. Hệ thống sinh mật khẩu / mã kích hoạt, lưu vào hệ thống và hiển thị xác nhận thành công trên giao diện kèm thông tin đăng nhập để Chủ gara bàn giao.

### 4.2. Luồng phụ (Alternative Flows)
- **5.1. Điều chuyển chi nhánh (Branch Transfer):**
  - Chủ gara chọn thợ cần luân chuyển -> Chọn chi nhánh đích (đang `OPEN`).
  - Hệ thống kiểm tra thợ không có cuốc cứu hộ dở dang (`DISPATCHED`, `ARRIVED`, `IN_PROGRESS`).
  - Hệ thống cập nhật `branch_id`, đồng thời làm mới tọa độ cơ sở của thợ phục vụ quét bán kính cứu hộ.
- **5.2. Cập nhật thông tin & ca trực (Update Profile & Shift):**
  - Chủ gara sửa đổi ca làm việc, chuyên môn kỹ thuật hoặc bật/tắt khả năng chở vượt ngập (`hasCrossingCapability`) của thợ.
  - Hệ thống lưu thay đổi và phản hồi thông tin mới nhất.
- **5.3. Khóa / Mở khóa quyền làm việc (Toggle Active Status):**
  - Chủ gara chọn Bật/Tắt quyền làm việc của thợ kèm hộp thoại xác nhận.
  - Khi khóa (`active = false`): Hệ thống kiểm tra thợ không có đơn dở dang, lập tức ép `workingStatus = OFFLINE`, ngừng phân phối đơn cứu hộ.
  - Khi mở lại (`active = true`): Thợ được phép đăng nhập lại ứng dụng mobile và bật `ONLINE` khi sẵn sàng.
- **5.4. Cho thôi việc (Soft Delete / Offboarding):**
  - Khi thợ ngừng cộng tác, Chủ gara chọn *"Cho thôi việc"*.
  - Hệ thống kiểm tra thợ không có đơn cứu hộ dở dang.
  - Hệ thống gỡ thợ khỏi chi nhánh, chuyển `active = false`, `workingStatus = OFFLINE`. Toàn bộ dữ liệu đơn cũ, doanh thu và lịch sử đánh giá sao (`ratingAvg`) được bảo toàn tuyệt đối.
- **5.5. Cấp lại mật khẩu tạm thời (Reset Password):**
  - Khi thợ quên mật khẩu hoặc chưa nhận được SMS, Chủ gara bấm *"Cấp lại mật khẩu"*.
  - Hệ thống sinh mật khẩu ngẫu nhiên bảo mật mới, cập nhật vào tài khoản thợ và hiển thị trực tiếp trên giao diện để Chủ gara gửi cho thợ.

---

## 5. Các Trường hợp Ngoại lệ (Exceptions)
- **5.0.E1 Số điện thoại / Tên đăng nhập đã tồn tại:** Hệ thống thông báo lỗi trùng lặp dữ liệu và yêu cầu Chủ gara kiểm tra lại.
- **5.0.E2 Chi nhánh đích không hợp lệ:** Chặn gán thợ vào chi nhánh đang đóng cửa bảo trì (`CLOSED_MAINTENANCE`) hoặc chi nhánh không thuộc quyền quản lý của Garage.
- **5.0.E3 Thợ đang có đơn cứu hộ chưa hoàn tất:** Hệ thống chặn điều chuyển chi nhánh, chặn khóa tài khoản hoặc chặn cho thôi việc khi thợ đang ở trạng thái `DISPATCHED`, `ARRIVED`, hoặc `IN_PROGRESS`. Thông báo lỗi rõ ràng: *"Không thể điều chuyển chi nhánh / thay đổi trạng thái khi thợ đang thực hiện đơn cứu hộ!"*.
- **5.0.E4 Lỗi dịch vụ gửi tin nhắn SMS / OTP:** Nếu dịch vụ SMS bên thứ ba gặp sự cố, hệ thống vẫn hoàn tất tạo tài khoản và hiển thị mật khẩu tạm thời trực tiếp trên giao diện Web để Chủ gara bàn giao thủ công.
- **5.0.E5 Garage chưa được duyệt / đang bị đình chỉ:** Hệ thống từ chối mọi yêu cầu tạo mới hoặc sửa đổi thông tin đội thợ nếu Garage chưa ở trạng thái `APPROVED`.

---

## 6. Quy tắc Nghiệp vụ Liên quan (Business Rules)
- **BR-MECH-001 — Ràng buộc Phân bổ Một Chi nhánh:** Mỗi thợ cứu hộ chỉ được phân bổ vào đúng một chi nhánh garage hoạt động tại một thời điểm.
- **BR-MECH-002 — Thẩm quyền Quản lý Thợ:** Chỉ Chủ gara đã được duyệt mới có quyền tạo mới, kích hoạt, chỉnh sửa hoặc điều chuyển chi nhánh cho thợ thuộc gara của mình.
- **BR-MECH-003 — Tiêu chuẩn Bằng lái và Tay nghề:** Thợ cứu hộ phải có giấy phép lái xe hợp lệ và tay nghề sửa chữa xe máy đã được Chủ gara xác thực.
- **BR-MECH-005 — Đơn Nhận Độc quyền & Ràng buộc Đơn Active:** Thợ đang trong ca cứu hộ dở dang không được phép đổi chi nhánh hoặc bị khóa quyền làm việc làm gián đoạn cuốc khách.

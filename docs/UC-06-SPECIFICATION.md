# UC-06: Thiết lập Dịch vụ Cứu hộ và Quản lý Bảng giá (Configure Rescue Service Catalog & Pricing)

**Mã Use Case:** UC-06  
**Actor chính:** Garage Owner (Chủ gara)  
**Actor liên quan / Actor phụ:** System Administrator (Quản trị viên sàn), Rescue Mechanic (Thợ cứu hộ), Customer (Khách hàng)  
**Phạm vi hệ thống:** Phân hệ Đối tác Garage, Báo giá số & Điều phối Cứu hộ PRM393  
**Độ ưu tiên:** Cao (High)  
**Ngày cập nhật:** 31/10/2026 (Phiên bản chuẩn hóa khắc phục rủi ro toàn vẹn & kiểm soát giá trần)  

---

## 1. Mô tả Nghiệp vụ (Business Overview)

Use Case này cho phép Chủ gara (`GARAGE_OWNER`) quản lý toàn diện danh mục dịch vụ cứu hộ mùa ngập lụt và niêm yết bảng giá công khai, minh bạch của doanh nghiệp:
- Cấu hình các gói dịch vụ thuộc 3 nhóm cứu hộ cốt lõi: Sửa chữa tại chỗ (`REPAIR_ONSITE`), Kéo xe về xưởng (`TOWING`), và Chở xe vượt ngập sâu (`CROSSING`).
- Phân tách rõ ràng giữa **Chi phí Tiền công kỹ thuật** (`LABOR`), **Vật tư phụ tùng thay thế** (`PART`) và **Gói cứu hộ trọn gói** (`PACKAGE`).
- Thiết lập bảng giá theo khung chuẩn: Đơn giá chuẩn (`standardPrice`), Giá tối thiểu (`minPrice`), Giá tối đa (`maxPrice`), Thời gian xử lý ước tính (`estimatedTimeMin`) và Chính sách bảo hành (`warrantyDays`).
- Áp dụng phạm vi dịch vụ theo từng loại phương tiện: Dành cho tất cả (`ALL`), Xe tay ga (`SCOOTER`), Xe số / Côn tay (`MANUAL_CLUTCH`).
- Tuân thủ nghiêm ngặt **Khung giá trần (Price Ceiling)** do Quản trị viên sàn (`ADMIN`) quy định nhằm bảo vệ quyền lợi khách hàng, chống hành vi "chặt chém", nâng giá bất chính trong điều kiện bão lũ thiên tai.
- Tạm dừng phục vụ (`active = false`) hoặc Lưu trữ/Ngừng kinh doanh dịch vụ an toàn (**Soft Delete**) mà tuyệt đối không phá vỡ tính toàn vẹn dữ liệu của các đơn cứu hộ và báo giá đã phát sinh trong quá khứ.

---

## 2. Điều kiện Tiền quyết (Pre-conditions)

- **PRE-1:** Garage của Chủ gara đã được Nhân viên vận hành (Staff) phê duyệt chính thức (`status = 'APPROVED'`). Garage ở trạng thái `PENDING`, `REJECTED` hoặc `SUSPENDED` sẽ bị chặn toàn bộ quyền thiết lập bảng giá.
- **PRE-2:** Chủ gara đã đăng nhập thành công vào Cổng đối tác Web/Mobile với vai trò `ROLE_GARAGE_OWNER`.
- **PRE-3:** Quản trị sàn đã ban hành Khung giá trần hệ thống (`platform_price_ceiling`) cho các nhóm dịch vụ cứu hộ ngập lụt tương ứng.

---

## 3. Điều kiện Sau thực hiện (Post-conditions)

- **POST-1:** Danh mục dịch vụ và bảng giá mới/chỉnh sửa được lưu trữ an toàn trong CSDL, gắn liền với định danh Garage (`garage_id`).
- **POST-2:** Dịch vụ đang kích hoạt (`active = true`, `deleted = false`) lập tức hiển thị trên ứng dụng Mobile của Thợ cứu hộ thuộc Gara khi khảo sát lập báo giá điện tử (Digital Quotation) và trên luồng khách chọn gara chở xe vượt ngập (`SINGLE_CROSSING`).
- **POST-3:** Toàn bộ đơn hàng cũ và báo giá lịch sử bảo lưu chính xác giá trị tại thời điểm lập thông qua cơ chế Snapshot, không bị ảnh hưởng khi bảng giá gốc thay đổi.

---

## 4. Các Luồng Nghiệp vụ (Use Case Flows)

### 4.0. Danh mục Mã nhóm Kỹ thuật & Đơn vị Tính Chuẩn hóa (Standard Dropdown Catalogs)

Để nâng cao trải nghiệm người dùng (UX) và chuẩn hóa dữ liệu so khớp giá trần sàn, hệ thống thiết lập sẵn danh mục chọn lựa qua Dropdown, đồng thời mở tùy chọn **"Khác (Tự nhập)"** khi Gara có nhu cầu tùy biến:

#### 1. Danh mục Mã nhóm Kỹ thuật (`category`):
* `BUG_XUC`: Sấy bugi, xả nước buồng đốt & súc xịt khô IC / bình xăng con.
* `THAY_NHOT`: Thay nhớt máy / nhớt hộp số láp xe ngập nước.
* `LOC_GIO`: Vệ sinh / thay thế tấm lọc gió xe ngập.
* `HE_THONG_DIEN`: Xịt khô, kiểm tra IC, sạc & xử lý chạm chập hệ thống điện.
* `HE_THONG_XANG`: Xả cặn nước bình xăng chính & súc rửa kim phun FI.
* `KEO_XE`: Kéo / chở xe ngập nặng, bó kẹt máy về xưởng gara.
* `VUOT_NGAP`: Chở người và xe máy vượt qua vùng ngập sâu bằng xe chuyên dụng.
* `BAO_DUONG_TOAN_DIEN`: Gói phục hồi & bảo dưỡng xe ngập nước toàn diện.
* `KHAC`: Tùy biến mã nhóm kỹ thuật khác (Mở ô text cho Gara tự do nhập mã).

#### 2. Danh mục Đơn vị Tính (`unit`):
* `lượt`: Dành cho tiền công kỹ thuật, sấy buồng đốt, vệ sinh, kiểm tra.
* `bình`: Dành cho nhớt máy, nhớt láp, dung dịch súc rửa buồng đốt.
* `cái`: Dành cho phụ tùng thay mới (bugi, tấm lọc gió, cầu chì, rơ-le).
* `gói`: Dành cho gói cứu hộ trọn gói, combo phục hồi ngập.
* `km`: Dành cho cự ly vận chuyển / kéo xe về gara.
* `bộ`: Dành cho bộ ron, bộ dây điện, phụ tùng lắp cụm.
* `Khác`: Tự nhập đơn vị đo lường khác (Mở ô text cho Gara tự do nhập: chuyến, bình 1L, giờ...).

### 4.1. Luồng chính (Normal Flow) — Thêm mới Dịch vụ vào Bảng giá

1. Chủ gara mở màn hình **"Dịch vụ & Bảng giá"** trên Web Portal và nhấn **"Thêm dịch vụ mới"**.
2. Hệ thống hiển thị biểu mẫu thiết lập dịch vụ với các trường thông tin:
   - Tên dịch vụ (`serviceName`).
   - Loại hình cứu hộ (`serviceType`: `REPAIR_ONSITE`, `TOWING`, `CROSSING`).
   - Phân loại chi phí (`itemCategoryType`: `LABOR`, `PART`, `PACKAGE`).
   - Dòng xe áp dụng (`applicableVehicleType`: `ALL`, `SCOOTER`, `MANUAL_CLUTCH`).
   - Giá chuẩn (`standardPrice`), Giá sàn (`minPrice`), Giá trần gara đề xuất (`maxPrice`).
   - Mã nhóm kỹ thuật (`category`: chọn từ dropdown chuẩn hóa như `BUG_XUC`, `THAY_NHOT`, `KEO_XE`... hoặc chọn `KHAC` để tự nhập).
   - Đơn vị tính (`unit`: chọn từ dropdown chuẩn hóa như `lượt`, `bình`, `cái`... hoặc chọn `Khác` để tự nhập).
   - Thời gian ước tính (`estimatedTimeMin`), Số ngày bảo hành (`warrantyDays`), Mô tả chi tiết.
3. Chủ gara nhập các thông số và bấm **"Lưu dịch vụ"**.
4. **Hệ thống thực hiện kiểm tra xác thực (Validation):**
   - Đảm bảo các trường bắt buộc không để trống.
   - Kiểm tra ràng buộc dải giá hợp lệ: $0 < \text{minPrice} \le \text{standardPrice} \le \text{maxPrice}$.
   - Kiểm tra tên dịch vụ không trùng lặp với dịch vụ đang hoạt động khác trong cùng gara cho cùng nhóm xe.
   - **Kiểm tra Giá trần Sàn (Price Ceiling Check):** Hệ thống đối chiếu `standardPrice` và `maxPrice` với bảng giá trần quy định của Admin. Nếu vượt quá giá trần cho phép, hệ thống từ chối và báo lỗi vi phạm chính sách giá.
5. Hệ thống lưu dịch vụ mới với trạng thái `active = true`, `deleted = false` và cập nhật danh sách hiển thị trên giao diện.

### 4.2. Luồng phụ (Alternative Flows)

- **4.2.1. Chỉnh sửa Thông tin & Đơn giá Dịch vụ (Update Service):**
  - Chủ gara chọn một dịch vụ từ danh sách và bấm *"Sửa"*.
  - Chủ gara điều chỉnh đơn giá, thời gian thực hiện, bảo hành hoặc mô tả.
  - Hệ thống kiểm tra tính hợp lệ của dải giá và đối chiếu giá trần của sàn.
  - Sau khi lưu, thông tin mới sẽ áp dụng cho các báo giá lập từ thời điểm này trở đi. Các đơn hàng/báo giá đã gửi trước đó giữ nguyên giá snapshot cũ.
- **4.2.2. Tạm tắt / Bật lại Dịch vụ (Toggle Active Status):**
  - Khi gara hết phụ tùng (ví dụ: hết nhớt xe ga) hoặc thợ kéo xe đang quá tải, Chủ gara bấm gạt nút *"Tạm tắt"*.
  - Hệ thống cập nhật `active = false`. Dịch vụ này sẽ tạm ẩn khỏi danh mục chọn trên app của thợ cứu hộ khi lập báo giá mới, nhưng vẫn bảo lưu thông tin trong kho của gara.
  - Khi có hàng trở lại, Chủ gara bấm *"Bật"* để tiếp tục cung cấp.
- **4.2.3. Ngừng kinh doanh / Xóa an toàn Dịch vụ (Soft Delete):**
  - Khi gara không còn cung ứng vĩnh viễn một dịch vụ, Chủ gara bấm *"Xóa"*.
  - Hệ thống hiển thị hộp thoại cảnh báo: *"Dịch vụ sẽ được lưu trữ và ngừng hiển thị. Toàn bộ lịch sử báo giá cũ vẫn được bảo lưu an toàn."*
  - Hệ thống kiểm tra: Nếu dịch vụ đang nằm trong các đơn cứu hộ đang thực hiện dở dang (`DISPATCHED`, `ARRIVED`, `IN_PROGRESS`), hệ thống yêu cầu hoàn tất hoặc hủy đơn trước khi lưu trữ.
  - Hệ thống cập nhật cờ `is_deleted = true`, `active = false` (tuyệt đối không dùng lệnh DELETE SQL cứng), đảm bảo toàn vẹn dữ liệu quan hệ bảng `quotation_item`.

---

## 5. Các Trường hợp Ngoại lệ (Exceptions)

- **5.1.E1 Vượt quá Giá trần của Nền tảng (Price Ceiling Exceeded):**
  - Nếu `standardPrice` hoặc `maxPrice` vượt quá ngưỡng giá trần do Admin quy định cho nhóm dịch vụ cứu hộ này, hệ thống chặn lưu và thông báo lỗi:
    *"Đơn giá thiết lập (X đ) vượt quá mức giá trần quy định của sàn (Y đ) cho dịch vụ [Tên loại dịch vụ]. Vui lòng điều chỉnh lại để bảo vệ người tiêu dùng mùa bão ngập."*
- **5.2.E2 Dải giá không hợp lệ (Invalid Price Range):**
  - Nếu $\text{minPrice} > \text{standardPrice}$ hoặc $\text{standardPrice} > \text{maxPrice}$ hoặc đơn giá $\le 0$, hệ thống báo lỗi:
    *"Khoảng giá không hợp lệ: Giá chuẩn phải lớn hơn 0 và nằm trong khoảng từ Giá tối thiểu đến Giá tối đa!"*
- **5.3.E3 Trùng lặp Dịch vụ (Duplicate Service Item):**
  - Nếu dịch vụ mới trùng tên và cùng loại phương tiện với một dịch vụ chưa xóa trong gara, hệ thống cảnh báo:
    *"Dịch vụ này đã tồn tại trong bảng giá của bạn. Vui lòng chỉnh sửa dịch vụ cũ thay vì tạo trùng lặp."*
- **5.4.E4 Garage chưa được phê duyệt / Đang bị đình chỉ:**
  - Nếu tài khoản Gara ở trạng thái `PENDING` hoặc `SUSPENDED`, hệ thống trả về mã lỗi `403 Forbidden`: *"Garage chưa được phê duyệt hoặc đang bị tạm ngưng hoạt động, không thể chỉnh sửa bảng giá."*
- **5.5.E5 Cố gắng xóa dịch vụ đang có đơn cứu hộ chưa quyết toán:**
  - Nếu có đơn hàng đang ở trạng thái `IN_PROGRESS` chứa dịch vụ này, hệ thống thông báo: *"Dịch vụ đang được thực hiện trong đơn cứu hộ dở dang # mã_đơn. Hãy hoàn tất đơn trước khi ngừng kinh doanh dịch vụ!"*

---

## 6. Quy tắc Nghiệp vụ Liên quan (Business Rules)

- **BR-PRICE-001 — Khung Giá trần Cố định Chống Thổi giá (Anti-Gouging Ceiling):** Mọi đơn giá cứu hộ niêm yết của Garage đối tác bắt buộc phải nằm dưới mức giá trần do Admin ban hành trên hệ thống theo từng danh mục sự cố.
- **BR-PRICE-002 — Tính Toán Toàn vẹn Dải giá:** Giá chuẩn, giá sàn và giá trần phải tuân thủ điều kiện toán học:
  $$0 < \text{minPrice} \le \text{standardPrice} \le \text{maxPrice}$$
  Trong trường hợp Gara không nhập `minPrice` hoặc `maxPrice`, hệ thống tự động gán mặc định:
  $$\text{minPrice} = 0.8 \times \text{standardPrice}, \quad \text{maxPrice} = 1.3 \times \text{standardPrice}$$
  (nhưng `maxPrice` tự động này cũng không được vượt qua giá trần của sàn).
- **BR-PRICE-003 — Bảo lưu Lịch sử Tuyệt đối (No Hard Delete):** Bảng `garage_service_catalog` chỉ được phép áp dụng Soft Delete (`is_deleted = true`). Nghiêm cấm mọi hành vi Hard Delete khỏi CSDL nhằm tránh lỗi khóa ngoại Foreign Key với `quotation_item` và phục vụ đối soát, khiếu nại bảo hành.
- **BR-PRICE-004 — Phân loại Phương tiện Chuyên biệt:** Các dịch vụ thay thế vật tư (nhớt, bugi, lọc gió) và tiền công rã máy xả nước phải được gắn nhãn loại xe phù hợp (`SCOOTER` cho xe ga, `MANUAL_CLUTCH` cho xe số/côn tay) để thợ tại hiện trường báo giá chính xác, minh bạch.
- **BR-PRICE-005 — Độc lập Dịch vụ Sửa tại chỗ và Kéo xe:** Thợ cứu hộ khi lập báo giá chỉ được chọn nhóm `REPAIR_ONSITE` hoặc nhóm `TOWING`, không được báo giá cả hai phương án mâu thuẫn cùng lúc trên một phương tiện.
- **BR-PRICE-006 — Snapshot Đơn giá Bất biến:** Mọi báo giá gửi cho khách hàng và đơn hàng đã xác nhận đều sao chép đơn giá cố định tại thời điểm lập. Việc chủ gara thay đổi bảng giá sau đó không làm thay đổi giá trị của các đơn hàng đã tạo.

---

## 7. Thiết kế Cấu trúc Dữ liệu & API Contracts

### 7.1. Cập nhật Bảng Cơ sở Dữ liệu (`garage_service_catalog`)

```sql
ALTER TABLE garage_service_catalog 
    ADD COLUMN IF NOT EXISTS item_category_type VARCHAR(20) DEFAULT 'LABOR', -- LABOR (Công), PART (Vật tư), PACKAGE (Trọn gói)
    ADD COLUMN IF NOT EXISTS applicable_vehicle_type VARCHAR(20) DEFAULT 'ALL', -- ALL, SCOOTER, MANUAL_CLUTCH
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS admin_ceiling_snapshot DECIMAL(12,2) NULL;

-- Bảng lưu trữ Khung giá trần của Sàn do Admin cấu hình
CREATE TABLE IF NOT EXISTS platform_price_ceiling (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    service_type VARCHAR(30) NOT NULL,
    category VARCHAR(50) NOT NULL,
    item_category_type VARCHAR(20) NOT NULL,
    max_allowed_price DECIMAL(12,2) NOT NULL,
    effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);
```

### 7.2. Đặc tả API Endpoints

| Phương thức | Đường dẫn API | Vai trò | Chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/garages/services` | `GARAGE_OWNER` | Lấy danh mục dịch vụ của gara (lọc bỏ các dịch vụ `is_deleted = true`). |
| `POST` | `/api/v1/garages/services` | `GARAGE_OWNER` | Thêm mới dịch vụ, kiểm tra hợp lệ dải giá và so khớp giá trần sàn. |
| `PUT` | `/api/v1/garages/services/{id}` | `GARAGE_OWNER` | Cập nhật thông tin dịch vụ và đơn giá mới. |
| `PATCH` | `/api/v1/garages/services/{id}/status` | `GARAGE_OWNER` | Bật/Tắt trạng thái hoạt động (`active: true/false`). |
| `DELETE` | `/api/v1/garages/services/{id}` | `GARAGE_OWNER` | Soft delete dịch vụ (`is_deleted = true`, `active = false`). |
| `GET` | `/api/v1/admin/price-ceilings` | `ADMIN`, `STAFF`, `GARAGE_OWNER` | Lấy danh sách khung giá trần của hệ thống để hiển thị tham chiếu. |
| `POST` | `/api/v1/admin/price-ceilings` | `ADMIN` | Quản trị viên cập nhật hoặc bổ sung mức giá trần mới cho từng loại dịch vụ. |

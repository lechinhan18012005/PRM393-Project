# HỢP ĐỒNG TRA CỨU XE CÁ NHÂN (VEHICLE LOOKUP CONTRACT)
**Dự án:** Motorbike Flood Rescue Platform (PRM393)  
**Phụ trách quản lý xe (FEAT-01B):** Bùi Hoàng Phúc  
**Người sử dụng tích hợp:** Lê Chí Nhân (Luồng 3 - Cứu hộ chở xe)  

---

## 1. Giới hạn Phạm vi Hiện tại (Scope Boundary)

- Module quản lý xe cá nhân (FEAT-01B) do Bùi Hoàng Phúc đảm nhận. Hiện tại phía backend chưa có API quản lý xe đầy đủ.
- Để đảm bảo tính độc lập và tôn trọng quyền sở hữu module của thành viên khác:
  1. Phía Luồng 3 xây dựng Interface `VehicleLookupService` làm hợp đồng trừu tượng (Contract Interface).
  2. Trong môi trường phát triển (`dev` / `test`), hệ thống sử dụng triển khai Fixture (`DevVehicleLookupServiceImpl`) có gắn nhãn rõ ràng (`[DEV/TEST FIXTURE]`).
  3. Fixture này xác minh chặt chẽ: Chỉ trả về danh sách xe máy cá nhân thuộc quyền sở hữu của chính User đang đăng nhập qua JWT (`customerId = authenticatedUser.id`), không cho phép nhận `vehicleId` tùy ý hoặc xe của người dùng khác.
  4. Khi Bùi Hoàng Phúc hoàn thiện bảng `vehicles` và API thật, chỉ cần thay thế triển khai của `VehicleLookupService` bằng Spring Bean kết nối cơ sở dữ liệu thật mà không làm ảnh hưởng đến luồng cứu hộ.

---

## 2. Dữ liệu Trả về (Vehicle DTO)

```java
public record VehicleDto(
    Long id,
    Long customerId,
    String licensePlate,
    String brand,
    String model,
    String vehicleType, // SCOOTER, MANUAL, CLUTCH, ELECTRIC
    String engineCapacity,
    String color,
    boolean isDefault
) {}
```

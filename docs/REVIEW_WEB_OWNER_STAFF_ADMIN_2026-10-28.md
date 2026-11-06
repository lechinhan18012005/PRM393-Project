# Rà soát Web Chủ gara, Staff, Admin — 28/10/2026

## Phạm vi và cách đọc kết quả

Kiểm tra mã hiện tại trong `motorbike_flood_rescue_platform/web/src`, đối chiếu controller/service backend. Đây là đánh giá kết nối và thiết kế nghiệp vụ từ mã nguồn; chưa đăng nhập ba tài khoản để chạy kiểm thử end-to-end với database/PayOS thật, chưa đánh giá trực quan bằng trình duyệt ở nhiều kích thước màn hình. Các thư mục prototype khác trong workspace không phải đối tượng kết luận.

- **Đã nối:** UI có gọi API và backend có xử lý tương ứng; không đồng nghĩa đã xác nhận chạy thành công trên môi trường triển khai.
- **Một phần:** có API nhưng còn dữ liệu giả, thiếu hành động hoặc ý nghĩa nghiệp vụ chưa tương xứng với nhãn UI.
- **Chưa nối:** chỉ dữ liệu cứng, state trình duyệt, toast hoặc timer.
- **Có backend, thiếu UI:** đã có endpoint nhưng web chưa sử dụng.

Kết luận: phần quản lý nền tảng của gara đã có cơ sở sử dụng thật; Staff mới mạnh ở duyệt gara và đọc đơn; Admin có quản lý Staff, cấu hình phí và dữ liệu tài chính, nhưng nhiều màn hình vẫn mô phỏng. Không nên giới thiệu toàn bộ portal là đã hoàn thiện.

## 1. Ma trận tính năng

### Dùng chung

| Tính năng | Hiện trạng | Ghi chú |
|---|---|---|
| Đăng nhập, khôi phục phiên | Đã nối | `/auth/login`, `/auth/me`; chặn vai trò Customer/Mechanic ở web. |
| Đăng ký chủ gara kèm hồ sơ | Đã nối | `/onboarding/garage`; upload qua `/upload/image`, phụ thuộc cấu hình dịch vụ lưu ảnh. |
| Kích hoạt tài khoản bằng mã mời | Đã nối | `/onboarding/activate`; lời mời chưa tự gửi email/SMS. |
| Điều hướng theo vai trò | Đã có | Admin được vào cả khu tài chính và khu Staff; Staff và Owner chỉ vào khu riêng. Backend cũng có kiểm tra vai trò. |
| Đăng xuất | Có ở client | Xóa token/local state. Không có lời gọi thu hồi phiên trên server từ web. |
| Tự gia hạn token | Có backend, thiếu UI/client | Web lưu refresh token nhưng không có luồng gọi `/auth/refresh` để phục hồi khi access token hết hạn. |
| Sửa hồ sơ cá nhân | Có backend, thiếu UI | Backend có `PATCH /auth/me`; menu tài khoản chỉ xem thông tin và đăng xuất. |
| Thông báo, đánh dấu đã đọc | Chưa nối | Ba cảnh báo cứng trong `App.tsx`; đánh dấu đã đọc chỉ toast, không giảm số chưa đọc hoặc lưu trạng thái. Mọi vai trò nhận cùng nội dung. |
| Nhãn “Trực tuyến” | Chưa kiểm tra kết nối | Header luôn hiển thị, không dựa trên health check/trạng thái API. |

### Chủ gara

| Màn hình / tính năng | Hiện trạng | API / giới hạn |
|---|---|---|
| Tổng quan gara | Đã nối | GET `/garages/me`, `/garages/branches`, `/garages/mechanics`, `/garages/services`. KPI nguồn lực lấy từ dữ liệu thật. |
| Hồ sơ chờ duyệt / bị từ chối, nộp lại giấy tờ | Đã nối | `GarageAccessGate`, PUT `/garages/me/application`; có xử lý thiếu hồ sơ và trạng thái duyệt. |
| Thêm, sửa chi nhánh | Đã nối | POST `/garages/branches`, PUT `/garages/branches/{id}`. |
| Mở / đóng bảo trì chi nhánh | Đã nối | PATCH `/garages/branches/{id}/status`. |
| Xem đội thợ, mời thợ | Đã nối | GET `/garages/mechanics`, POST `/garages/mechanics/invitations`; chia sẻ mã mời thủ công. |
| Chuyển chi nhánh, ghi tên ca | Đã nối | PATCH `/garages/mechanics/{id}/allocate`; `shiftName` là tên ca dạng text, chưa phải hệ thống lịch ca theo ngày/giờ. |
| Ngừng / mở quyền làm việc của thợ | Đã nối | PATCH `/garages/mechanics/{id}/status`; đây là quyền tài khoản, không phải thợ tự bật nhận cuốc. |
| Dịch vụ, bảng giá, bật/tắt, xóa | Đã nối | GET/POST/PUT/DELETE `/garages/services`; có loại CROSSING, TOWING, REPAIR_ONSITE. Có catalog không đồng nghĩa tất cả luồng đặt dịch vụ đã triển khai. |
| Xem chuyến chở xe | Một phần | GET `/garage/rescue/orders`, polling 10 giây. Có danh sách, tiến độ, ảnh nghiệm thu; chưa có UI xem hồ sơ đơn đầy đủ, tìm/lọc, phân trang, điều phối thực. |
| Khi không có chuyến / API lỗi | Sai cách thể hiện | Hiện hai chuyến BATCH mẫu ngay cả khi tắt demo; API lỗi bị bỏ qua. Mẫu ghép nhiều xe không khớp nhãn SINGLE_CROSSING. |
| Doanh thu & ví, rút tiền | Có backend, thiếu UI | UI production báo chưa kết nối; demo hiện số cứng và nút rút bị vô hiệu. Backend đã có GET `/garages/wallet`, GET/POST `/garages/wallet/payouts`. |
| Thiết lập thợ đủ năng lực chở xe | Thiếu luồng hoàn chỉnh | Backend bắt buộc `hasCrossingCapability=true`; model mặc định false, lời mời tạo thợ không gán true; chưa thấy UI/API quản trị để thay đổi cờ này. |

### Staff

| Màn hình / tính năng | Hiện trạng | API / giới hạn |
|---|---|---|
| Duyệt gara: danh sách, giấy tờ, chi nhánh, thợ | Đã nối | `/staff/garages`, `/{id}/branches`, `/{id}/mechanics`; màn hình không lấy applicants mẫu được truyền từ App. Có loading/error/empty. |
| Phê duyệt, từ chối, đình chỉ, mở lại, ghi chú | Đã nối | PATCH `/staff/garages/{id}/moderate`. “Yêu cầu bổ sung” lưu là REJECTED, chưa có trạng thái NEED_INFO riêng trong backend. |
| Xuất CSV danh sách gara | Có thực hiện | Tạo Blob và tải file ở client từ dữ liệu đã lấy; không cần một API xuất riêng. |
| Giám sát đơn cứu hộ | Một phần | GET `/staff/rescue/orders`, polling 10 giây, sau đó luôn ghép thêm 5 đơn mẫu. |
| Chọn thợ và điều phối | Chưa nối | Danh sách thợ gợi ý là dữ liệu cứng; `handleDispatchOrder` chỉ toast. Chưa thấy endpoint gán/đổi thợ dành cho Staff trong controller cứu hộ. |
| Khẩn cấp, thông báo cho tài xế | Chưa nối | Chỉ toast. |
| Lấy báo ngập, duyệt, loại spam, xác nhận nước rút | Một phần | GET `/staff/flood-reports`, PATCH `/{id}/moderate`, `/{id}/resolve` có backend thật; UI vẫn trộn mẫu, bỏ qua lỗi và tiếp tục báo thành công. |
| Bản đồ GIS | Chưa phải bản đồ GIS thật | Ảnh nền, hotspot đặt bằng CSS với ID cứng FL-402/398/391; không render marker theo tọa độ API. |
| Phát cảnh báo bán kính 1 km | Chưa có nghiệp vụ như UI mô tả | Chỉ gọi duyệt báo ngập APPROVED; backend lưu trạng thái/ghi chú, không gửi tới “1.842 tài xế”. Công tắc tự động chỉ là state. |
| Lập chốt vượt ngập, điều động liên minh gara | Chưa nối | Chỉ toast. |
| Tranh chấp / chống gian lận | Chưa nối | Hồ sơ mẫu; phạt 500.000đ, bác khiếu nại, đề xuất hoàn, phát ghi âm đều không có xử lý tương ứng. |
| Chất lượng dịch vụ / SLA | Chưa nối | KPI mẫu; đình chỉ chỉ đổi state màn hình, cảnh cáo chỉ toast; tải lại mất thay đổi. |

### Admin

| Màn hình / tính năng | Hiện trạng | API / giới hạn |
|---|---|---|
| Danh sách Staff, mời, khóa/mở | Đã nối | `/admin/staff`, `/admin/staff/invitations`, `/admin/staff/{id}/status`. |
| Tổng quan GMV | Có backend, thiếu kết nối màn hình | UI dữ liệu cứng, đồng bộ bằng timer. Đã có GET `/finance/stats` nhưng web chưa gọi. |
| Cấu hình phí, tỷ lệ, lịch sử | Đã nối, xử lý lỗi sai | GET/PUT `/finance/commission`, GET `/finance/commission/history`; catch khi lưu thất bại vẫn báo thành công và đồng bộ 48 gara. |
| Công cụ mô phỏng phí | Có tính toán ở client | Hợp lý nếu ghi rõ là mô phỏng, không nên hiểu là kết quả giao dịch thực. |
| Danh sách giao dịch PayOS | Một phần | GET `/finance/transactions`; luôn ghép giao dịch mẫu. Một số thông tin thiếu được điền ngân hàng/số TK/chữ ký/ảnh mẫu. |
| Đối soát | Một phần | POST `/finance/transactions/reconcile`; backend chỉ đánh dấu SUCCESS thành reconciled, không đọc sao kê hay đối chiếu ngân hàng. Lỗi hoặc kết quả rỗng có thể rơi vào timer báo khớp 1.420 bản ghi. |
| Danh sách yêu cầu rút | Một phần | GET `/finance/payouts`; luôn trộn yêu cầu mẫu; APPROVED và TRANSFERRED bị hiển thị chung một trạng thái. |
| Xử lý yêu cầu rút thật | Có cập nhật database | PATCH `/finance/payouts/{id}/process`; trừ ví, ghi ledger, cập nhật trạng thái. Không có lời gọi ngân hàng/PayOS chuyển tiền trong service này. |
| OTP, giải ngân Napas247, duyệt hàng loạt | Chưa có nghiệp vụ như UI mô tả | OTP không được gửi/kiểm tra; duyệt hàng loạt chỉ toast; mã TXN-NAPAS có thể được tự sinh bằng UUID. |
| Hoàn tiền | Chưa nối | Timer và toast, không có API xử lý hoàn từ màn hình. |
| Báo cáo tài chính | Chưa nối | Doanh thu, chi phí vận hành, quỹ bảo hiểm, lợi nhuận và số liệu 2023 đều cứng. |
| Xuất Excel/PDF/UNC/audit trên các màn tài chính | Chưa thực hiện | Chỉ toast, ngoại trừ thao tác sao chép payload có dùng clipboard thật. |
| Nghiệp vụ Staff | Truy cập được | Admin có quyền vào module Staff; vẫn chịu các hạn chế của chính các màn đó. |

## 2. Những vấn đề quan trọng nhất

### P0 — Giao diện xác nhận một việc chưa xảy ra

1. **Giải ngân không chuyển tiền thật.** `FinanceAdminService.processPayoutRequest` chỉ ghi database; khi không nhập mã chuyển khoản, tự sinh mã kiểu Napas. UI lại nói tiền đã chuyển tới ngân hàng. Cần đổi thành quy trình “duyệt → chuyển khoản ngoài hệ thống → nhập chứng từ/xác nhận đã chuyển”, hoặc triển khai tích hợp chi tiền thật trước khi dùng từ tự động giải ngân.
2. **Đối soát chưa so khớp độc lập.** `PayOSPaymentService.reconcileAllTransactions` đánh dấu tất cả SUCCESS chưa reconciled; thông báo “khớp ngân hàng/chữ ký 100%” vượt quá bằng chứng của hành động. Luồng nhận thanh toán PayOS có phần tích hợp gateway riêng; vấn đề này không có nghĩa toàn bộ thanh toán đều giả.
3. **Thất bại vẫn báo thành công.** Gặp trong lưu commission, duyệt/resolve/spam điểm ngập, từ chối payout và fallback đối soát. Cần giữ thông báo lỗi và chỉ cập nhật UI sau phản hồi thành công.
4. **Dữ liệu thật lẫn giả ở production.** Staff dispatch, GIS, Admin transactions/payouts luôn trộn mẫu; Garage transport tự hiện mẫu khi trống. Tắt VITE_DEMO_MODE không giải quyết hết. Riêng GIS, mẫu dùng ID số rồi parse để gọi API; nếu ID mẫu trùng ID bản ghi thật, thao tác có thể tác động bản ghi không đúng ý người dùng. Cần tách nguồn dữ liệu và cấm mutation với bản ghi mẫu.

### P1 — Luồng nghiệp vụ chưa khép kín

5. **Thợ mới chưa có cách được cấp năng lực chở xe.** Tạo bằng mã mời để cờ false, điều phối lại bắt buộc true. Cần một luồng xác nhận năng lực có phân quyền; hiển thị rõ các lý do chưa đủ điều kiện, gồm GPS/heartbeat, chi nhánh, năng lực và đơn đang giữ.
6. **“Sẵn sàng nhận đơn” trên dashboard gara chưa đáng tin như nhãn.** Chỉ đếm active + AVAILABLE, chưa áp đủ bộ điều kiện backend. Có thể hiện “đang bật nhận việc”, và thêm số “đủ điều kiện điều phối” lấy từ backend.
7. **Doanh thu niêm yết bị hiểu như tiền thực nhận.** Garage transport cộng cả COMPLETED và PAYMENT_PENDING theo serviceBasePrice. Đây là giá trị dịch vụ, không phải tiền đã thanh toán/đã vào ví. Cần tách giá trị đơn, đã thu, phí, thực nhận, chờ thanh toán, khả dụng.
8. **Cấu hình phí có phần có hiệu lực và phần chỉ lưu.** `PaymentAttemptService` sử dụng singleCrossingRate/globalRate cho thanh toán thật. Nhưng giá chở xe của `RescuePricingService` dùng standardPrice + booking fee từ cấu hình ứng dụng (mặc định 30.000đ), không dùng baseFee/perKmFee của màn commission. Chưa có bằng chứng trợ giá/giờ cao điểm/ghép xe áp dụng đầy đủ trong luồng hiện hành. Cần ghi phạm vi hiệu lực từng trường.
9. **Staff có nút sang Hoàn tiền nhưng không có quyền màn đó.** Nút trong tranh chấp gọi screen refunds; quyền hiện tại chỉ Admin, nên Staff bấm bị chặn âm thầm. Nên thay bằng “Gửi đề nghị hoàn cho Admin” và lưu hồ sơ đề nghị thật.
10. **Quy đổi trạng thái sai nghĩa.** Dispatch gom trạng thái không khớp vào RESOLVED, bao gồm khả năng đơn CANCELLED; PAYMENT_PENDING cũng chung nhóm này. Chở xe IN_PROGRESS được gắn tên REPAIRING, mọi đơn thật urgency HIGH và đơn DISPATCHED được gán ETA 8 phút. Cần dùng trạng thái/độ khẩn/ETA có nguồn dữ liệu rõ ràng.
11. **Nhiều bộ lọc chỉ đổi vẻ ngoài.** Đối soát có dateFilter/typeFilter nhưng hàm lọc không sử dụng; payout có activeTab/amountFilter nhưng hàm lọc chỉ dùng search/bank; báo cáo đổi kỳ nhưng không tính lại số liệu. Không nên để bộ lọc tạo cảm giác đã thay đổi tập dữ liệu.
12. **GIS chưa giữ đúng dữ liệu kiểm duyệt.** Mapper bỏ moderationStatus; duyệt xong tự tô đỏ mức 3 dù API chỉ thay trạng thái duyệt, không đổi độ sâu. Ảnh thiếu được thay bằng ảnh stock mang nhãn ảnh cộng đồng; confidenceScore=0 bị thay thành 85 do dùng `||`. Cần giữ dữ liệu gốc và hiện “chưa có ảnh/chưa đánh giá”.

## 3. Đánh giá tính hợp lý và phần nên cắt/gộp

### Chủ gara

Nên giữ cấu trúc Tổng quan → Chi nhánh & thợ → Dịch vụ & giá → Đơn cứu hộ → Ví & rút tiền. Các nhóm này phục vụ đúng nhiệm vụ vận hành và không dư thừa.

- Đổi “Chuyến chở xe” thành “Đơn chở xe” ở giai đoạn SINGLE_CROSSING. “Chuyến” có sức chứa, gom khách, ghép xe chỉ hợp lý khi có nghiệp vụ BATCH riêng.
- Thêm ví thật từ backend sẵn có trước khi mở rộng dashboard doanh thu.
- Có chi tiết đơn, tìm/lọc theo thời gian/trạng thái/chi nhánh/thợ, xem ảnh bàn giao và tình trạng thanh toán.
- Thêm quản lý thông tin gara sau duyệt; gate hiện chỉ hiện form khi chưa APPROVED.
- Nhập tọa độ chi nhánh thủ công chưa thuận tiện; nên cho chọn vị trí bản đồ. Phương tiện cứu hộ đang là trường text, chưa phải danh sách xe có sức chứa/năng lực.
- “Phân ca” hiện chỉ lưu tên ca; hoặc gọi đúng là “Ghi chú ca làm”, hoặc phát triển lịch ca thực sự khi phạm vi cần.

### Staff

Duyệt gara, kiểm duyệt báo ngập và giám sát đơn là hợp lý. Cần xác định rõ hệ thống tự điều phối offer cho thợ, Staff giám sát và xử lý ngoại lệ. Nếu cho Staff can thiệp, phải có API riêng, kiểm tra thợ đủ điều kiện, tránh trùng cuốc và ghi audit.

- Trước mắt đổi tên “Điều phối cứu hộ” thành “Giám sát cứu hộ” nếu chưa có hành động điều phối thật.
- Có thể gộp Tranh chấp và Chất lượng thành một nhóm “Hỗ trợ & vi phạm”; SLA là tab thống kê, không cần một trung tâm cảnh báo giả riêng.
- Chức năng đình chỉ ở Duyệt gara và SLA phải dùng cùng nghiệp vụ backend; hiện một bên lưu thật, một bên chỉ state.
- Gỡ/ẩn “lập chốt”, “điều động liên minh 3 gara”, “phạt tự động”, “phát tới 1.842 người” nếu chưa triển khai.
- Thay màn GIS giả bằng danh sách kiểm duyệt trung thực ngay cả trước khi có bản đồ thật. Cần thao tác duyệt/từ chối rõ ràng, phân biệt báo chờ duyệt, đang hiệu lực và đã hết hiệu lực.

### Admin

Quản lý Staff, phí, giao dịch, ví và yêu cầu rút là hợp lý. Tổng quan và Báo cáo có thể cùng một nhóm “Thống kê” với các tab, thay vì hai màn số liệu lặp và chưa có nguồn.

- Giữ quản lý hoa hồng đã dùng trong thanh toán; ẩn/ghi “chưa áp dụng” với trường chỉ lưu mà chưa tác động giá.
- Giữ duyệt yêu cầu rút theo quy trình thủ công có chứng từ, phân biệt APPROVED và TRANSFERRED.
- Hoàn tiền/tranh chấp nên có liên kết hồ sơ và ranh giới Staff đề xuất, Admin quyết định, theo dõi kết quả thực thi.
- Quỹ bảo hiểm, trợ giá mùa ngập, lợi nhuận ròng, chi phí vận hành, hóa đơn VAT, ghi âm hotline, eKYC, kiểm soát rủi ro tự động không có đủ luồng dữ liệu/hệ thống hỗ trợ trong phần được rà soát. Đây là phần quá tham vọng ở hiện trạng, nên đưa vào backlog hoặc demo có nhãn rõ.
- Không tự gắn SAFE/eKYC verified cho mọi payout từ API. Chưa kiểm tra phải hiển thị chưa kiểm tra.

## 4. Thứ tự khắc phục đề xuất

| Ưu tiên | Công việc | Kết quả mong muốn |
|---|---|---|
| P0 | Loại mock khỏi production, không fallback thành công khi API lỗi | Người dùng biết chính xác dữ liệu và hành động nào có thật. |
| P0 | Sửa tên và quy trình đối soát/giải ngân/hoàn tiền | Không xác nhận dòng tiền chưa thực hiện. |
| P1 | Khép luồng cấp năng lực cho thợ, sửa đếm đủ điều kiện | Gara mới có thể tự hoàn tất thiết lập vận hành. |
| P1 | Nối UI ví, yêu cầu rút và Admin stats vào API đã có | Hoàn thiện luồng từ doanh thu đến yêu cầu thanh toán. |
| P1 | Đơn chi tiết, trạng thái chuẩn, lỗi/empty/loading, bộ lọc thật | Giám sát được đơn thực tế, nhận biết đơn lỗi và chờ thu. |
| P2 | Bản đồ thật, hàng chờ kiểm duyệt, thông báo có nguồn | Staff có công cụ vận hành nhất quán. |
| P2 | Tranh chấp và SLA có model/API/nguồn số liệu | Chỉ mở tính năng khi lưu được quyết định và đo được kết quả. |
| P3 | Xuất báo cáo, PDF/Excel, tự động chi tiền, ghép chuyến | Làm sau khi nghiệp vụ cốt lõi đã ổn định. |

## 5. Bằng chứng mã nguồn chính

Đường dẫn dưới đây tương đối với thư mục dự án; các tên hàm giúp định vị khi số dòng thay đổi.

- `web/src/App.tsx`: INITIAL_* datasets, urgentAlerts, showToast, handleSelectScreen.
- `web/src/permissions.ts`: roleModules, screenModule.
- `web/src/components/views/GarageOwnerDashboardView.tsx`: load, cách đếm online.
- `web/src/components/views/GarageManagementView.tsx`: mutate, saveBranch, invite, allocate/status.
- `web/src/components/views/GarageServicesPricingView.tsx`: load, change, save.
- `web/src/components/views/GarageOperationsView.tsx`: fetchOrders, gate DEMO_MODE cho finance, fallback BATCH ở transport.
- `web/src/components/views/GarageVerificationView.tsx`: fetchBackendGarages, handleApprove/Reject/Suspend, handleExportAudit.
- `web/src/components/views/LiveDispatchDashboardView.tsx`: allOrders, availableMechanics, handleDispatchOrder.
- `web/src/components/views/GISFloodMapView.tsx`: mapper, handleBroadcastAlert/ClearWater/ReportSpam, ảnh nền và hotspot CSS.
- `web/src/components/views/CommissionSettingsView.tsx`: loadCommissionData, handleSave và catch.
- `web/src/components/views/PayOSReconciliationView.tsx`: mapBackendTxToView, setTxList, handleAutoReconcile.
- `web/src/components/views/PayoutsView.tsx`: mapBackendPayoutToItem, loadBackendPayouts, handleDisburse/Reject/BatchApprove.
- `web/src/components/views/OverviewGMVView.tsx`, `FinancialReportsView.tsx`, `RefundsView.tsx`, `DisputeFraudView.tsx`, `SLAMonitoringView.tsx`: dữ liệu cứng và handler mô phỏng.
- `backend/src/main/java/com/prm393/floodrescue/features/finance/controller/GarageFinanceController.java`: API ví có sẵn.
- `backend/src/main/java/com/prm393/floodrescue/features/finance/controller/FinanceAdminController.java`: commission, transactions, payouts, stats.
- `backend/src/main/java/com/prm393/floodrescue/features/finance/service/FinanceAdminService.java`: processPayoutRequest chỉ cập nhật sổ ví/database.
- `backend/src/main/java/com/prm393/floodrescue/features/payment/service/PayOSPaymentService.java`: reconcileAllTransactions.
- `backend/src/main/java/com/prm393/floodrescue/features/payment/service/PaymentAttemptService.java`: tỷ lệ hoa hồng áp dụng cho thanh toán SINGLE_CROSSING.
- `backend/src/main/java/com/prm393/floodrescue/features/rescue/service/RescuePricingService.java`: giá standardPrice + configuredBookingFee.
- `backend/src/main/java/com/prm393/floodrescue/features/rescue/service/MechanicEligibilityChecker.java`: điều kiện thợ đủ năng lực.
- `backend/src/main/java/com/prm393/floodrescue/features/onboarding/OnboardingService.java`: activate tạo thợ không cấp crossing capability.

## 6. Kiểm tra đã chạy

- `npm run lint`: PASS (script là TypeScript `tsc --noEmit`).
- `npm run build`: PASS; Vite cảnh báo bundle JavaScript trên 500 kB.
- Không sửa mã chức năng; chỉ thêm báo cáo này. Chưa gọi mutation trên database hoặc thanh toán thật.
- README hiện nói thanh toán/chuyến còn demo, nhưng code đã phát triển thêm; không dùng README làm bằng chứng thay cho controller/service hiện tại.

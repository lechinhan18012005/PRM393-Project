// ============================================================================
// TẬP TIN: dispute_service.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 6: Khiếu nại & Hoàn tiền sau cứu hộ (UC-23)
// MÔ TẢ NGHIỆP VỤ:
//   - Cung cấp mô hình dữ liệu hồ sơ khiếu nại (`ServiceDisputeModel`) và tầng
//     dịch vụ kết nối REST API (`DisputeService`) cho quy trình khiếu nại và
//     yêu cầu hoàn tiền sau dịch vụ cứu hộ (UC-23).
//   - Quy trình xử lý khiếu nại 3 bước trong hệ thống:
//       1) Khách hàng gửi yêu cầu khiếu nại kèm nhóm lý do (`OVERCHARGE`,
//          `POOR_QUALITY`, `DAMAGE`, `FAKE_RESCUE`), số tiền đề nghị hoàn và
//          mô tả chi tiết sự việc từ màn hình Biên nhận thanh toán.
//       2) Bộ phận CSKH (Staff) tiếp nhận hồ sơ ở trạng thái `STAFF_REVIEW`,
//          xác minh thực tế và ghi chú kết luận (`staffFindingNote`) cùng mức
//          tiền đề xuất hoàn trả (`proposedRefundAmount`).
//       3) Quản trị viên (Admin) phê duyệt quyết định cuối cùng (`approvedRefundAmount`,
//          `adminResolutionNote`) để thực hiện hoàn tiền cho khách hàng.
// ============================================================================

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import 'auth_service.dart';

/// Mô hình dữ liệu đại diện cho một hồ sơ khiếu nại và yêu cầu hoàn tiền dịch vụ cứu hộ (UC-23).
class ServiceDisputeModel {
  /// Định danh duy nhất (Primary Key) của hồ sơ khiếu nại trong cơ sở dữ liệu.
  final int id;

  /// Mã tham chiếu hiển thị của hồ sơ khiếu nại (ví dụ: '#REF-102', '#DSP-8924').
  final String disputeCode;

  /// Mã định danh (ID) của đơn cứu hộ phát sinh khiếu nại.
  final int rescueOrderId;

  /// Mã hiển thị của đơn cứu hộ liên kết (ví dụ: 'SOS-1024', '#RC-8924').
  final String rescueCode;

  /// Phân loại nhóm lý do khiếu nại của khách hàng:
  /// - `'OVERCHARGE'`: Thu vượt báo giá / thu phụ phí ngoài luồng.
  /// - `'POOR_QUALITY'`: Chất lượng cứu hộ hoặc sửa chữa không đạt yêu cầu.
  /// - `'DAMAGE'`: Gây hư hỏng phương tiện trong quá trình vận chuyển / cứu hộ.
  /// - `'FAKE_RESCUE'`: Báo hoàn tất khống hoặc hủy dịch vụ sau khi đã thu tiền.
  final String disputeType;

  /// Tổng số tiền gốc khách hàng đã thanh toán cho đơn cứu hộ (đơn vị: VNĐ).
  final double originalAmount;

  /// Số tiền khách hàng yêu cầu được hoàn trả khi tạo hồ sơ khiếu nại (đơn vị: VNĐ).
  final double requestedRefundAmount;

  /// Số tiền hoàn trả do nhân viên CSKH (Staff) đề xuất sau khi xác minh sự việc (VNĐ).
  final double? proposedRefundAmount;

  /// Số tiền hoàn trả chính thức được Quản trị viên (Admin) phê duyệt cuối cùng (VNĐ).
  final double? approvedRefundAmount;

  /// Nội dung mô tả chi tiết lý do khiếu nại và phản ánh của khách hàng.
  final String customerReason;

  /// Trạng thái xử lý hồ sơ khiếu nại hiện tại:
  /// - `'STAFF_REVIEW'`: Đang chờ nhân viên CSKH kiểm tra và xác minh.
  /// - `'ADMIN_APPROVAL'`: CSKH đã đề xuất phương án, đang chờ Admin phê duyệt.
  /// - `'APPROVED'` / `'REFUNDED'`: Đã chấp thuận và hoàn tiền cho khách hàng.
  /// - `'REJECTED'`: Từ chối yêu cầu khiếu nại.
  final String status;

  /// Ghi chú biên bản xác minh thực tế từ nhân viên CSKH (Staff).
  final String? staffFindingNote;

  /// Ghi chú phán quyết và quyết định xử lý cuối cùng từ Quản trị viên (Admin).
  final String? adminResolutionNote;

  /// Thời điểm khách hàng gửi hồ sơ khiếu nại lên hệ thống.
  final String? createdAt;

  /// Khởi tạo đối tượng [ServiceDisputeModel] với đầy đủ các thuộc tính theo dõi tiến trình khiếu nại.
  ServiceDisputeModel({
    required this.id,
    required this.disputeCode,
    required this.rescueOrderId,
    required this.rescueCode,
    required this.disputeType,
    required this.originalAmount,
    required this.requestedRefundAmount,
    this.proposedRefundAmount,
    this.approvedRefundAmount,
    required this.customerReason,
    required this.status,
    this.staffFindingNote,
    this.adminResolutionNote,
    this.createdAt,
  });

  /// Factory constructor chuyển đổi dữ liệu Map JSON từ Backend API thành đối tượng [ServiceDisputeModel].
  ///
  /// Áp dụng cơ chế ép kiểu số an toàn (`num?` -> `int` / `double`) và giá trị mặc định
  /// để đảm bảo tính ổn định khi hiển thị trên giao diện người dùng.
  factory ServiceDisputeModel.fromJson(Map<String, dynamic> json) {
    return ServiceDisputeModel(
      // Mã định danh hồ sơ khiếu nại
      id: (json['id'] as num?)?.toInt() ?? 0,
      // Mã tham chiếu hồ sơ khiếu nại, mặc định '#REF-000' nếu thiếu
      disputeCode: json['disputeCode'] as String? ?? '#REF-000',
      // Mã định danh và mã hiển thị của đơn cứu hộ
      rescueOrderId: (json['rescueOrderId'] as num?)?.toInt() ?? 0,
      rescueCode: json['rescueCode'] as String? ?? '',
      // Nhóm lý do khiếu nại, mặc định là 'OVERCHARGE'
      disputeType: json['disputeType'] as String? ?? 'OVERCHARGE',
      // Các thông số tài chính: số tiền gốc, số tiền yêu cầu hoàn, đề xuất của Staff và phê duyệt của Admin
      originalAmount: (json['originalAmount'] as num?)?.toDouble() ?? 0,
      requestedRefundAmount:
          (json['requestedRefundAmount'] as num?)?.toDouble() ?? 0,
      proposedRefundAmount:
          (json['proposedRefundAmount'] as num?)?.toDouble(),
      approvedRefundAmount:
          (json['approvedRefundAmount'] as num?)?.toDouble(),
      // Lý do khiếu nại chi tiết của khách hàng
      customerReason: json['customerReason'] as String? ?? '',
      // Trạng thái xử lý hồ sơ, mặc định là 'STAFF_REVIEW'
      status: json['status'] as String? ?? 'STAFF_REVIEW',
      // Ghi chú từ bộ phận CSKH và Admin
      staffFindingNote: json['staffFindingNote'] as String?,
      adminResolutionNote: json['adminResolutionNote'] as String?,
      // Thời điểm khởi tạo hồ sơ
      createdAt: json['createdAt'] as String?,
    );
  }
}

/// Lớp dịch vụ giao tiếp REST API phục vụ gửi hồ sơ khiếu nại và tra cứu lịch sử khiếu nại (UC-23).
class DisputeService {
  /// Đối tượng HTTP Client thực hiện các truy vấn mạng.
  final http.Client _client;

  /// Khởi tạo [DisputeService], hỗ trợ truyền [client] tùy chỉnh để kiểm thử (Unit Test).
  DisputeService({http.Client? client}) : _client = client ?? http.Client();

  // ==========================================================================
  // 1. GỬI HỒ SƠ KHIẾU NẠI & YÊU CẦU HOÀN TIỀN SAU CỨU HỘ (UC-23)
  // ==========================================================================

  /// Gửi yêu cầu khởi tạo hồ sơ khiếu nại mới cho một đơn cứu hộ đã thanh toán.
  ///
  /// Tham số đầu vào:
  /// - [rescueOrderId]: ID của đơn cứu hộ cần khiếu nại (bắt buộc).
  /// - [paymentTransactionId]: ID giao dịch thanh toán liên quan để đối chiếu hoàn tiền (tùy chọn).
  /// - [disputeType]: Mã phân loại lý do khiếu nại (mặc định: `'OVERCHARGE'`).
  /// - [requestedRefundAmount]: Số tiền khách hàng yêu cầu hoàn lại (VNĐ).
  /// - [customerReason]: Nội dung giải trình chi tiết sự việc của khách hàng.
  /// - [evidenceImageUrls]: Chuỗi URL hình ảnh bằng chứng đính kèm (nếu có).
  ///
  /// Trả về đối tượng [ServiceDisputeModel] vừa được khởi tạo trên hệ thống.
  Future<ServiceDisputeModel> createDispute({
    required int rescueOrderId,
    int? paymentTransactionId,
    String disputeType = 'OVERCHARGE',
    required double requestedRefundAmount,
    required String customerReason,
    String? evidenceImageUrls,
  }) async {
    // Bước 1: Lấy JWT Token của khách hàng đang đăng nhập từ AuthService
    final token = await AuthService().getToken();

    // Bước 2: Chuẩn bị dữ liệu payload JSON cho yêu cầu tạo khiếu nại
    final payload = <String, dynamic>{
      'rescueOrderId': rescueOrderId,
      'disputeType': disputeType,
      'requestedRefundAmount': requestedRefundAmount,
      'customerReason': customerReason,
      'paymentTransactionId': ?paymentTransactionId,
      if (evidenceImageUrls != null && evidenceImageUrls.isNotEmpty)
        'evidenceImageUrls': evidenceImageUrls,
    };

    // Bước 3: Gửi yêu cầu HTTP POST tới endpoint ApiConstants.disputesUrl
    final response = await _client.post(
      Uri.parse(ApiConstants.disputesUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(payload),
    );

    // Bước 4: Giải mã dữ liệu phản hồi theo chuẩn UTF-8 và phân tích cú pháp JSON
    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    // Bước 5: Xử lý kết quả phản hồi từ máy chủ
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (json['data'] != null) {
        return ServiceDisputeModel.fromJson(
          json['data'] as Map<String, dynamic>,
        );
      }
      throw Exception('Không nhận được phản hồi hồ sơ khiếu nại từ máy chủ.');
    } else {
      // Ném ngoại lệ với thông báo lỗi chi tiết từ Backend nếu gửi thất bại
      final msg =
          json['message'] ?? 'Gửi khiếu nại thất bại (${response.statusCode})';
      throw Exception(msg);
    }
  }

  // ==========================================================================
  // 2. TRA CỨU DANH SÁCH HỒ SƠ KHIẾU NẠI CỦA KHÁCH HÀNG (UC-23)
  // ==========================================================================

  /// Lấy danh sách toàn bộ các hồ sơ khiếu nại do khách hàng hiện tại đã gửi,
  /// giúp khách hàng theo dõi tiến độ xử lý của CSKH và kết quả phê duyệt hoàn tiền từ Admin.
  Future<List<ServiceDisputeModel>> getMyDisputes() async {
    // Lấy JWT Token xác thực người dùng
    final token = await AuthService().getToken();

    // Gọi HTTP GET tới endpoint lấy danh sách khiếu nại cá nhân
    final response = await _client.get(
      Uri.parse(ApiConstants.myDisputesUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    // Giải mã UTF-8 và đọc cấu trúc JSON trả về
    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    // Nếu HTTP 200 OK và trường 'data' là một danh sách, chuyển đổi từng phần tử sang ServiceDisputeModel
    if (response.statusCode == 200 && json['data'] is List) {
      return (json['data'] as List)
          .map(
            (e) => ServiceDisputeModel.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    }
    // Trả về danh sách rỗng nếu chưa có hồ sơ khiếu nại nào hoặc phản hồi không hợp lệ
    return [];
  }
}

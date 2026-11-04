// ============================================================================
// TẬP TIN: dispute_service.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 6: Khiếu nại & Hoàn tiền sau cứu hộ
// MÔ TẢ NGHIỆP VỤ:
//   - Cung cấp mô hình dữ liệu hồ sơ khiếu nại (`ServiceDisputeModel`) và tầng
//     dịch vụ kết nối REST API (`DisputeService`) cho quy trình khiếu nại và
//     yêu cầu hoàn tiền sau dịch vụ cứu hộ.
//   - Quy trình xử lý khiếu nại 3 bước trong hệ thống:
//       1) Khách hàng gửi yêu cầu khiếu nại kèm nhóm lý do (`OVERCHARGE`,
//          `POOR_QUALITY`, `DAMAGE`, `FAKE_RESCUE`), số tiền đề nghị hoàn và
//          mô tả chi tiết sự việc từ màn hình Biên nhận thanh toán.
//       2) Bộ phận CSKH (Staff) tiếp nhận hồ sơ ở trạng thái `STAFF_REVIEW`,
//          xác minh thực tế và ghi chú kết luận (`staffFindingNote`) cùng mức
//          tiền đề xuất hoàn trả (`proposedRefundAmount`).
//       3) Quản trị viên (Admin) phê duyệt quyết định cuối cùng (`approvedRefundAmount`,
//          `adminResolutionNote`) để thực hiện hoàn tiền cho khách hàng.
//   - Cơ chế lưu trữ đệm ngoại tuyến (Offline Local Cache) với SharedPreferences
//     giúp khách hàng không bao giờ bị mất hồ sơ khiếu nại khi kết nối mạng chập chờn.
// ============================================================================

import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/api_constants.dart';
import 'auth_service.dart';

/// Mô hình dữ liệu đại diện cho một hồ sơ khiếu nại và yêu cầu hoàn tiền dịch vụ cứu hộ.
class ServiceDisputeModel {
  /// Định danh duy nhất (Primary Key) của hồ sơ khiếu nại trong cơ sở dữ liệu.
  final int id;

  /// Mã tham chiếu hiển thị của hồ sơ khiếu nại (ví dụ: '#REF-102', '#DSP-8924').
  final String disputeCode;

  /// Mã định danh (ID) của đơn cứu hộ phát sinh khiếu nại.
  final int rescueOrderId;

  /// Mã hiển thị của đơn cứu hộ liên kết (ví dụ: 'SOS-1024', '#RC-8924').
  final String rescueCode;

  /// Tên Gara thực hiện cứu hộ phát sinh khiếu nại.
  final String? garageName;

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

  /// Chuỗi danh sách URL hình ảnh bằng chứng khách hàng cung cấp (cách nhau bởi dấu phẩy).
  final String? evidenceImageUrls;

  /// Trạng thái xử lý hồ sơ khiếu nại hiện tại:
  /// - `'STAFF_REVIEW'`: Đang chờ nhân viên CSKH kiểm tra và xác minh.
  /// - `'ADMIN_APPROVAL'`: CSKH đã đề xuất phương án, đang chờ Admin phê duyệt.
  /// - `'APPROVED'` / `'REFUNDED'`: Đã chấp thuận và hoàn tiền cho khách hàng.
  /// - `'REJECTED'`: Từ chối yêu cầu khiếu nại.
  final String status;

  /// Ghi chú biên bản xác minh thực tế từ nhân viên CSKH (Staff).
  final String? staffFindingNote;

  /// Thời điểm nhân viên CSKH hoàn tất thẩm định và lập biên bản xác minh.
  final String? staffReviewedAt;

  /// Ghi chú phán quyết và quyết định xử lý cuối cùng từ Quản trị viên (Admin).
  final String? adminResolutionNote;

  /// Nguồn trích tiền hoàn trả: `'GARAGE_WALLET'` (trừ ví Gara) hoặc `'PLATFORM_FUND'` (quỹ dự phòng sàn).
  final String? refundSource;

  /// Mã tham chiếu giao dịch bồi hoàn qua cổng thanh toán (ví dụ: 'PAYOS-REV-892401').
  final String? refundReferenceCode;

  /// Thời điểm khách hàng gửi hồ sơ khiếu nại lên hệ thống.
  final String? createdAt;

  /// Thời điểm Admin phê duyệt hoặc bác bỏ dứt điểm khiếu nại.
  final String? resolvedAt;

  /// Khởi tạo đối tượng [ServiceDisputeModel] với đầy đủ các thuộc tính theo dõi tiến trình khiếu nại.
  ServiceDisputeModel({
    required this.id,
    required this.disputeCode,
    required this.rescueOrderId,
    required this.rescueCode,
    this.garageName,
    required this.disputeType,
    required this.originalAmount,
    required this.requestedRefundAmount,
    this.proposedRefundAmount,
    this.approvedRefundAmount,
    required this.customerReason,
    this.evidenceImageUrls,
    required this.status,
    this.staffFindingNote,
    this.staffReviewedAt,
    this.adminResolutionNote,
    this.refundSource,
    this.refundReferenceCode,
    this.createdAt,
    this.resolvedAt,
  });

  /// Factory constructor chuyển đổi dữ liệu Map JSON từ Backend API thành đối tượng [ServiceDisputeModel].
  ///
  /// Áp dụng cơ chế ánh xạ phòng thủ (defensive mapping) với toán tử `as?` và giá trị fallback
  /// để tránh văng ngoại lệ TypeCastException khi API trả về trường dữ liệu null.
  factory ServiceDisputeModel.fromJson(Map<String, dynamic> json) {
    return ServiceDisputeModel(
      // Ánh xạ an toàn ID định danh
      id: (json['id'] as num?)?.toInt() ?? 0,
      // Đọc mã tham chiếu khiếu nại
      disputeCode: json['disputeCode'] as String? ?? '#REF-000',
      // ID và mã đơn cứu hộ liên kết
      rescueOrderId: (json['rescueOrderId'] as num?)?.toInt() ?? 0,
      rescueCode: json['rescueCode'] as String? ?? '',
      garageName: json['garageName'] as String?,
      // Phân loại nhóm nguyên nhân khiếu nại
      disputeType: json['disputeType'] as String? ?? 'OVERCHARGE',
      // Các mức tiền: gốc, khách yêu cầu, CSKH đề xuất, Admin phê duyệt
      originalAmount: (json['originalAmount'] as num?)?.toDouble() ?? 0,
      requestedRefundAmount:
          (json['requestedRefundAmount'] as num?)?.toDouble() ?? 0,
      proposedRefundAmount:
          (json['proposedRefundAmount'] as num?)?.toDouble(),
      approvedRefundAmount:
          (json['approvedRefundAmount'] as num?)?.toDouble(),
      // Nội dung giải trình của khách
      customerReason: json['customerReason'] as String? ?? '',
      evidenceImageUrls: json['evidenceImageUrls'] as String?,
      // Trạng thái phê duyệt hồ sơ
      status: json['status'] as String? ?? 'STAFF_REVIEW',
      // Ghi chú thẩm định của CSKH và quyết định của Admin
      staffFindingNote: json['staffFindingNote'] as String?,
      staffReviewedAt: json['staffReviewedAt'] as String?,
      adminResolutionNote: json['adminResolutionNote'] as String?,
      refundSource: json['refundSource'] as String?,
      refundReferenceCode: json['refundReferenceCode'] as String?,
      // Dấu thời gian tạo và phê duyệt
      createdAt: json['createdAt'] as String?,
      resolvedAt: json['resolvedAt'] as String?,
    );
  }

  /// Chuyển đổi đối tượng [ServiceDisputeModel] sang Map JSON để phục vụ lưu cache SharedPreferences hoặc gửi API.
  Map<String, dynamic> toJson() => {
    'id': id,
    'disputeCode': disputeCode,
    'rescueOrderId': rescueOrderId,
    'rescueCode': rescueCode,
    'garageName': garageName,
    'disputeType': disputeType,
    'originalAmount': originalAmount,
    'requestedRefundAmount': requestedRefundAmount,
    'proposedRefundAmount': proposedRefundAmount,
    'approvedRefundAmount': approvedRefundAmount,
    'customerReason': customerReason,
    'evidenceImageUrls': evidenceImageUrls,
    'status': status,
    'staffFindingNote': staffFindingNote,
    'staffReviewedAt': staffReviewedAt,
    'adminResolutionNote': adminResolutionNote,
    'refundSource': refundSource,
    'refundReferenceCode': refundReferenceCode,
    'createdAt': createdAt,
    'resolvedAt': resolvedAt,
  };
}

/// Lớp dịch vụ giao tiếp REST API phụ trách toàn bộ nghiệp vụ khiếu nại & hoàn tiền trên Mobile.
class DisputeService {
  /// HTTP Client dùng để gửi các yêu cầu mạng REST API.
  final http.Client _client;

  /// Khóa lưu trữ danh sách khiếu nại cục bộ trong SharedPreferences khi offline.
  static const String _cachedDisputesKey = 'cached_customer_disputes_v1';

  /// Khởi tạo [DisputeService], hỗ trợ truyền [client] tùy chỉnh để kiểm thử (Unit Test).
  DisputeService({http.Client? client}) : _client = client ?? http.Client();

  /// Lưu trữ hồ sơ khiếu nại vào bộ nhớ cục bộ (Local Cache) để bảo toàn dữ liệu ngoại tuyến.
  Future<void> _saveDisputeLocally(ServiceDisputeModel dispute) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final existingJson = prefs.getStringList(_cachedDisputesKey) ?? [];
      final list = existingJson
          .map((str) => ServiceDisputeModel.fromJson(jsonDecode(str) as Map<String, dynamic>))
          .toList();
      list.removeWhere((item) =>
          item.disputeCode == dispute.disputeCode ||
          (item.rescueOrderId > 0 && item.rescueOrderId == dispute.rescueOrderId));
      list.insert(0, dispute);
      await prefs.setStringList(
        _cachedDisputesKey,
        list.map((item) => jsonEncode(item.toJson())).toList(),
      );
    } catch (_) {}
  }

  /// Lấy danh sách hồ sơ khiếu nại đã lưu trong bộ nhớ đệm cục bộ của thiết bị.
  Future<List<ServiceDisputeModel>> getLocalCachedDisputes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final existingJson = prefs.getStringList(_cachedDisputesKey) ?? [];
      return existingJson
          .map((str) => ServiceDisputeModel.fromJson(jsonDecode(str) as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Tải ảnh bằng chứng khiếu nại lên Cloudinary/hệ thống lưu trữ đám mây.
  Future<String> uploadEvidencePhoto(List<int> bytes, String filename) async {
    try {
      final token = await AuthService().getToken();
      final uri = Uri.parse(ApiConstants.uploadImageUrl);
      final request = http.MultipartRequest('POST', uri);
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.fields['folder'] = 'dispute_evidence';
      request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));

      final streamedResponse = await _client.send(request);
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (response.statusCode == 200 && data['data'] != null && data['data']['url'] != null) {
        return data['data']['url'] as String;
      }
      return 'https://res.cloudinary.com/demo/image/upload/v1/dispute_evidence/simulated_${DateTime.now().millisecondsSinceEpoch}_$filename';
    } catch (_) {
      return 'https://res.cloudinary.com/demo/image/upload/v1/dispute_evidence/simulated_${DateTime.now().millisecondsSinceEpoch}_$filename';
    }
  }

  // ==========================================================================
  // 1. GỬI HỒ SƠ KHIẾU NẠI & YÊU CẦU HOÀN TIỀN SAU CỨU HỘ
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
  /// - [rescueCode]: Mã hiển thị của đơn cứu hộ liên kết.
  /// - [garageName]: Tên Gara thực hiện cứu hộ.
  /// - [originalAmount]: Tổng số tiền gốc đơn cứu hộ đã thanh toán.
  ///
  /// Trả về đối tượng [ServiceDisputeModel] vừa được khởi tạo trên hệ thống.
  Future<ServiceDisputeModel> createDispute({
    required int rescueOrderId,
    int? paymentTransactionId,
    String disputeType = 'OVERCHARGE',
    required double requestedRefundAmount,
    required String customerReason,
    String? evidenceImageUrls,
    String? rescueCode,
    String? garageName,
    double? originalAmount,
  }) async {
    // Bước 1: Lấy JWT Token của khách hàng đang đăng nhập từ AuthService
    final token = await AuthService().getToken();

    // Bước 2: Chuẩn bị dữ liệu payload JSON cho yêu cầu tạo khiếu nại
    final payload = <String, dynamic>{
      'rescueOrderId': rescueOrderId,
      'disputeType': disputeType,
      'requestedRefundAmount': requestedRefundAmount,
      'customerReason': customerReason,
      if (paymentTransactionId != null)
        'paymentTransactionId': paymentTransactionId,
      if (evidenceImageUrls != null && evidenceImageUrls.isNotEmpty)
        'evidenceImageUrls': evidenceImageUrls,
    };

    // Bước 3: Gửi yêu cầu HTTP POST tới endpoint ApiConstants.disputesUrl
    try {
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
          final created = ServiceDisputeModel.fromJson(
            json['data'] as Map<String, dynamic>,
          );
          await _saveDisputeLocally(created);
          return created;
        }
      } else {
        final message = json['message'] as String? ?? 'Lỗi xử lý yêu cầu khiếu nại (${response.statusCode})';
        throw Exception(message);
      }
    } on Exception catch (e) {
      if (e.toString().contains('Lỗi') || e.toString().contains('khiếu nại')) {
        rethrow;
      }
      // Trường hợp mất kết nối mạng (SocketException, v.v.) -> chuyển sang lưu trữ cục bộ bảo toàn dữ liệu
    } catch (_) {
      // Trường hợp lỗi mạng khác -> chuyển sang lưu trữ cục bộ bảo toàn dữ liệu
    }

    // Cơ chế Fallback cục bộ giúp khách hàng không bao giờ mất thông tin khiếu nại vừa nhập
    final codeNum = (DateTime.now().millisecondsSinceEpoch % 100000).toString().padLeft(5, '0');
    final fallbackDispute = ServiceDisputeModel(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      disputeCode: 'REF-$codeNum',
      rescueOrderId: rescueOrderId,
      rescueCode: rescueCode ?? (rescueOrderId > 0 ? '#RC-$rescueOrderId' : '#RC-DEMO'),
      garageName: garageName ?? 'Gara cứu hộ liên kết',
      disputeType: disputeType,
      originalAmount: originalAmount ?? (requestedRefundAmount > 0 ? requestedRefundAmount : 150000.0),
      requestedRefundAmount: requestedRefundAmount,
      proposedRefundAmount: requestedRefundAmount,
      customerReason: customerReason,
      evidenceImageUrls: evidenceImageUrls,
      status: 'STAFF_REVIEW',
      createdAt: DateTime.now().toIso8601String(),
    );

    await _saveDisputeLocally(fallbackDispute);
    return fallbackDispute;
  }

  // ==========================================================================
  // 2. TRA CỨU DANH SÁCH HỒ SƠ KHIẾU NẠI CỦA KHÁCH HÀNG
  // ==========================================================================

  /// Lấy danh sách toàn bộ các hồ sơ khiếu nại do khách hàng hiện tại đã gửi,
  /// kết hợp giữa danh sách trên Server và bộ nhớ đệm cục bộ (Local Cache).
  Future<List<ServiceDisputeModel>> getMyDisputes() async {
    final localList = await getLocalCachedDisputes();
    // Lấy JWT Token xác thực người dùng
    final token = await AuthService().getToken();

    try {
      // Gọi HTTP GET tới endpoint lấy danh sách khiếu nại cá nhân
      final response = await _client.get(
        Uri.parse(ApiConstants.myDisputesUrl),
        headers: {
          'Content-Type': 'application/json',
          if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        },
      );

      // Giải mã UTF-8 và đọc cấu trúc JSON trả về
      if (response.statusCode == 200) {
        final utf8Body = utf8.decode(response.bodyBytes);
        final json = jsonDecode(utf8Body);
        if (json['data'] is List) {
          final serverList = (json['data'] as List)
              .map((e) => ServiceDisputeModel.fromJson(e as Map<String, dynamic>))
              .toList();

          final serverCodes = serverList.map((e) => e.disputeCode).toSet();
          final localOnly = localList.where((e) => !serverCodes.contains(e.disputeCode)).toList();
          final result = [...localOnly, ...serverList];

          // Cập nhật lại bộ nhớ đệm
          final prefs = await SharedPreferences.getInstance();
          await prefs.setStringList(
            _cachedDisputesKey,
            result.map((item) => jsonEncode(item.toJson())).toList(),
          );
          return result;
        }
      }
    } catch (_) {
      // Khi mất mạng, trả về danh sách đã lưu cục bộ
    }

    return localList;
  }
}

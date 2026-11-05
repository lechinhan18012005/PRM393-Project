// ============================================================================
// TẬP TIN: rating_service.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 9: Đánh giá Dịch vụ & Thợ cứu hộ (UC-19)
// MÔ TẢ NGHIỆP VỤ:
//   - Định nghĩa mô hình dữ liệu đánh giá (`ServiceRatingModel`) và tầng dịch vụ
//     giao tiếp RESTful API (`RatingService`) cho chức năng đánh giá chất lượng
//     sau khi hoàn tất đơn cứu hộ (UC-19).
//   - Cho phép khách hàng:
//       1) Chấm điểm mức độ hài lòng từ 1 đến 5 sao (`stars`).
//       2) Chọn các thẻ nhận xét nhanh đặc trưng (`tags`) như: "Đến nhanh < 15p",
//          "Nhiệt tình lội nước", "Báo giá minh bạch", "Tay nghề chuẩn"...
//       3) Viết nhận xét chi tiết (`comment`) để hệ thống tổng hợp điểm uy tín
//          trung bình (CSAT / `mechanicRatingAvg`) của Thợ cứu hộ và Gara.
//       4) Kiểm tra xem một đơn cứu hộ đã được đánh giá trước đó hay chưa
//          (`getRatingByOrder`) nhằm tránh gửi đánh giá trùng lặp.
// ============================================================================

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import 'auth_service.dart';

/// Mô hình dữ liệu đại diện cho một bản ghi đánh giá dịch vụ cứu hộ của khách hàng (UC-19).
class ServiceRatingModel {
  /// Định danh duy nhất (Primary Key) của bản ghi đánh giá trong cơ sở dữ liệu.
  final int id;

  /// Mã định danh (ID) của đơn cứu hộ được khách hàng đánh giá.
  final int rescueOrderId;

  /// Mã tham chiếu hiển thị của đơn cứu hộ (ví dụ: '#RC-8821', 'SOS-1024').
  final String rescueCode;

  /// Mã định danh tài khoản khách hàng thực hiện đánh giá.
  final int? customerId;

  /// Tên hiển thị của khách hàng gửi đánh giá.
  final String customerName;

  /// Mã định danh của Gara / Đội cứu hộ thực hiện dịch vụ.
  final int? garageId;

  /// Tên hiển thị của Gara cứu hộ nhận đánh giá.
  final String? garageName;

  /// Mã định danh của nhân viên / thợ cứu hộ trực tiếp xử lý tại hiện trường.
  final int? mechanicStaffId;

  /// Họ và tên của thợ cứu hộ nhận đánh giá.
  final String? mechanicName;

  /// Điểm đánh giá trung bình tích lũy (CSAT) của thợ cứu hộ sau khi cập nhật bản ghi này.
  final double? mechanicRatingAvg;

  /// Số sao khách hàng chấm cho dịch vụ (thang điểm từ 1 đến 5 sao).
  final int stars;

  /// Chuỗi các thẻ đánh giá nhanh (tags) được phân cách bởi dấu phẩy (ví dụ: 'Đến nhanh < 15p,Tay nghề chuẩn').
  final String? tags;

  /// Nội dung nhận xét, góp ý chi tiết của khách hàng về trải nghiệm cứu hộ.
  final String? comment;

  /// Thời điểm khách hàng gửi đánh giá lên hệ thống.
  final String? createdAt;

  /// Hàm khởi tạo đối tượng [ServiceRatingModel].
  ServiceRatingModel({
    required this.id,
    required this.rescueOrderId,
    required this.rescueCode,
    this.customerId,
    required this.customerName,
    this.garageId,
    this.garageName,
    this.mechanicStaffId,
    this.mechanicName,
    this.mechanicRatingAvg,
    required this.stars,
    this.tags,
    this.comment,
    this.createdAt,
  });

  /// Factory constructor khởi tạo đối tượng [ServiceRatingModel] từ cấu trúc Map JSON
  /// nhận được từ phản hồi HTTP API của Backend.
  ///
  /// Bao gồm xử lý ép kiểu an toàn cho các trường số (`int`, `double`) và giá trị mặc định
  /// hợp lý (mặc định 5 sao nếu dữ liệu thiếu trường `stars`).
  factory ServiceRatingModel.fromJson(Map<String, dynamic> json) {
    return ServiceRatingModel(
      // Mã định danh bản ghi đánh giá
      id: (json['id'] as num?)?.toInt() ?? 0,
      // Mã định danh và mã hiển thị của đơn cứu hộ
      rescueOrderId: (json['rescueOrderId'] as num?)?.toInt() ?? 0,
      rescueCode: json['rescueCode'] as String? ?? '',
      // Thông tin khách hàng gửi đánh giá
      customerId: (json['customerId'] as num?)?.toInt(),
      customerName: json['customerName'] as String? ?? 'Khách hàng',
      // Thông tin Gara và Thợ cứu hộ được đánh giá
      garageId: (json['garageId'] as num?)?.toInt(),
      garageName: json['garageName'] as String?,
      mechanicStaffId: (json['mechanicStaffId'] as num?)?.toInt(),
      mechanicName: json['mechanicName'] as String?,
      mechanicRatingAvg: (json['mechanicRatingAvg'] as num?)?.toDouble(),
      // Điểm số sao (1-5), thẻ nhận xét nhanh và bình luận chi tiết
      stars: (json['stars'] as num?)?.toInt() ?? 5,
      tags: json['tags'] as String?,
      comment: json['comment'] as String?,
      // Dấu thời gian tạo bản ghi đánh giá
      createdAt: json['createdAt'] as String?,
    );
  }
}

/// Lớp dịch vụ quản lý các yêu cầu REST API cho nghiệp vụ Đánh giá & Nhận xét sau cứu hộ (UC-19).
///
/// Cho phép tiêm phụ thuộc (Dependency Injection) cả [http.Client] và [AuthService]
/// để phục vụ kiểm thử tự động (Unit Testing) một cách độc lập.
class RatingService {
  /// Đối tượng HTTP Client dùng để gửi các yêu cầu GET/POST tới Backend.
  final http.Client _client;

  /// Dịch vụ xác thực dùng để truy xuất JWT Access Token của người dùng hiện tại.
  final AuthService _authService;

  /// Khởi tạo [RatingService] với [client] và [authService] tùy chọn.
  RatingService({http.Client? client, AuthService? authService})
      : _client = client ?? http.Client(),
        _authService = authService ?? AuthService();

  // ==========================================================================
  // 1. GỬI ĐÁNH GIÁ SỐ SAO, THẺ NHẬN XÉT & BÌNH LUẬN SAU CỨU HỘ (UC-19)
  // ==========================================================================

  /// UC-19: Khách hàng gửi đánh giá số sao (1-5), thẻ đánh giá nhanh và nhận xét sau dịch vụ.
  ///
  /// Tham số đầu vào:
  /// - [rescueOrderId]: Mã định danh đơn cứu hộ đã hoàn tất thanh toán.
  /// - [stars]: Số sao đánh giá (từ 1 đến 5).
  /// - [tags]: Chuỗi các thẻ đánh giá nhanh được chọn, nối với nhau bằng dấu phẩy.
  /// - [comment]: Nội dung nhận xét chi tiết của khách hàng.
  ///
  /// Trả về đối tượng [ServiceRatingModel] vừa được lưu thành công trên máy chủ.
  Future<ServiceRatingModel> submitRating({
    required int rescueOrderId,
    required int stars,
    String? tags,
    String? comment,
  }) async {
    // Bước 1: Lấy JWT Access Token để đính kèm vào Header Authorization
    final token = await _authService.getToken();

    // Bước 2: Đóng gói dữ liệu payload JSON gửi lên Backend
    final payload = <String, dynamic>{
      'rescueOrderId': rescueOrderId,
      'stars': stars,
      if (tags != null && tags.isNotEmpty) 'tags': tags,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
    };

    // Bước 3: Thực hiện lời gọi HTTP POST tới ApiConstants.ratingsUrl
    final response = await _client.post(
      Uri.parse(ApiConstants.ratingsUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(payload),
    );

    // Bước 4: Giải mã phản hồi theo bảng mã UTF-8 và chuyển đổi chuỗi JSON
    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    // Bước 5: Kiểm tra mã trạng thái HTTP (2xx) và trích xuất dữ liệu đánh giá
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (json['data'] != null) {
        return ServiceRatingModel.fromJson(
          json['data'] as Map<String, dynamic>,
        );
      }
      throw Exception('Không nhận được dữ liệu đánh giá từ máy chủ.');
    } else {
      // Ném ngoại lệ kèm thông báo lỗi từ Backend nếu gửi đánh giá không thành công
      final msg =
          json['message'] ?? 'Gửi đánh giá thất bại (${response.statusCode})';
      throw Exception(msg);
    }
  }

  // ==========================================================================
  // 2. KIỂM TRA & LẤY ĐÁNH GIÁ ĐÃ TỒN TẠI THEO MÃ ĐƠN CỨU HỘ (UC-19)
  // ==========================================================================

  /// Lấy thông tin đánh giá theo mã đơn cứu hộ [rescueOrderId].
  ///
  /// Phương thức này được gọi ngay khi mở màn hình `RatingReviewScreen` để kiểm tra
  /// xem khách hàng đã đánh giá đơn này trước đó hay chưa. Nếu đã có, giao diện sẽ
  /// hiển thị lại số sao, thẻ tags và bình luận ở chế độ chỉ đọc (Read-only).
  Future<ServiceRatingModel?> getRatingByOrder(int rescueOrderId) async {
    // Lấy JWT Token xác thực
    final token = await _authService.getToken();

    // Gọi HTTP GET tới endpoint tra cứu đánh giá theo ID đơn cứu hộ
    final response = await _client.get(
      Uri.parse(ApiConstants.ratingByOrderUrl(rescueOrderId)),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    // Nếu tìm thấy bản ghi đánh giá (HTTP 200 và data != null), parse sang ServiceRatingModel
    if (response.statusCode == 200) {
      final utf8Body = utf8.decode(response.bodyBytes);
      final json = jsonDecode(utf8Body);
      if (json['data'] != null) {
        return ServiceRatingModel.fromJson(
          json['data'] as Map<String, dynamic>,
        );
      }
    }
    // Trả về null nếu đơn cứu hộ chưa có đánh giá nào
    return null;
  }

  // ==========================================================================
  // 3. LẤY DANH SÁCH LỊCH SỬ ĐÁNH GIÁ CỦA KHÁCH HÀNG HIỆN TẠI (UC-19)
  // ==========================================================================

  /// Lấy danh sách toàn bộ các đánh giá đã gửi của khách hàng hiện tại.
  Future<List<ServiceRatingModel>> getMyRatings() async {
    // Lấy JWT Token xác thực người dùng
    final token = await _authService.getToken();

    // Gửi yêu cầu HTTP GET tới ApiConstants.myRatingsUrl
    final response = await _client.get(
      Uri.parse(ApiConstants.myRatingsUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    // Nếu truy vấn thành công (HTTP 200), ánh xạ mảng JSON sang danh sách ServiceRatingModel
    if (response.statusCode == 200) {
      final utf8Body = utf8.decode(response.bodyBytes);
      final json = jsonDecode(utf8Body);
      if (json['data'] is List) {
        return (json['data'] as List)
            .map((e) => ServiceRatingModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    }
    // Trả về danh sách rỗng nếu không có dữ liệu hoặc có lỗi xảy ra
    return [];
  }
}

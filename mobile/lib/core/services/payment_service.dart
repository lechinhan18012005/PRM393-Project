// ============================================================================
// TẬP TIN: payment_service.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 5: Thanh toán & Đối soát (UC-18)
// MÔ TẢ NGHIỆP VỤ:
//   - Cung cấp tầng dịch vụ kết nối RESTful API với Backend Spring Boot cho
//     toàn bộ quy trình thanh toán đơn cứu hộ (UC-18).
//   - Đảm nhiệm các tác vụ cốt lõi:
//       1) Khởi tạo giao dịch thanh toán mới và sinh liên kết/mã VietQR qua
//          cổng PayOS (`createPayment`).
//       2) Truy vấn và làm mới trạng thái giao dịch theo mã đơn PayOS phục vụ
//          cơ chế auto-polling trên màn hình thanh toán (`getPaymentByOrderCode`).
//       3) Truy xuất lịch sử các giao dịch thanh toán gắn với một đơn cứu hộ
//          cụ thể (`getPaymentsByRescueOrder`).
//       4) Kích hoạt giả lập tín hiệu Webhook từ PayOS trong môi trường Demo/Test
//          giúp kiểm thử nhanh luồng thanh toán thành công (`simulateWebhook`).
//       5) Xác nhận hoàn tất thu tiền mặt tại hiện trường (`confirmCashPayment`).
// ============================================================================

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import '../models/payment_transaction_model.dart';
import 'auth_service.dart';

/// Lớp dịch vụ quản lý các lời gọi HTTP API liên quan đến thanh toán đơn cứu hộ (UC-18).
///
/// Hỗ trợ Dependency Injection thông qua tham số [http.Client] trong hàm khởi tạo,
/// giúp dễ dàng viết Unit Test / Mock HTTP Client mà không phụ thuộc kết nối mạng thực.
class PaymentService {
  /// Đối tượng HTTP Client dùng để thực hiện các yêu cầu mạng (GET, POST).
  final http.Client _client;

  /// Khởi tạo [PaymentService] với [client] tùy chọn (mặc định tạo mới `http.Client()`).
  PaymentService({http.Client? client}) : _client = client ?? http.Client();

  // ==========================================================================
  // 1. KHỞI TẠO GIAO DỊCH THANH TOÁN & SINH MÃ VIETQR (UC-18)
  // ==========================================================================

  /// Gửi yêu cầu khởi tạo giao dịch thanh toán cho đơn cứu hộ lên máy chủ Backend.
  ///
  /// Tham số đầu vào:
  /// - [rescueOrderId]: Mã định danh đơn cứu hộ cần thanh toán (bắt buộc).
  /// - [garageId]: Mã định danh Gara thực hiện cứu hộ (tùy chọn, dùng để tính đối soát).
  /// - [amount]: Số tiền thanh toán (tùy chọn, nếu không truyền Backend sẽ lấy theo tổng tiền đơn).
  /// - [rescueCode]: Mã hiển thị đơn cứu hộ (dùng để tạo nội dung chuyển khoản VietQR).
  /// - [orderType]: Loại hình cứu hộ, mặc định là `'SINGLE_CROSSING'`.
  /// - [paymentMethod]: Phương thức thanh toán, mặc định là `'PAYOS_VIETQR'`.
  ///
  /// Trả về đối tượng [PaymentTransactionModel] chứa mã QR, thông tin ngân hàng và trạng thái giao dịch.
  Future<PaymentTransactionModel> createPayment({
    required int rescueOrderId,
    int? garageId,
    double? amount,
    String? rescueCode,
    String? orderType = 'SINGLE_CROSSING',
    String paymentMethod = 'PAYOS_VIETQR',
  }) async {
    // Bước 1: Lấy JWT Access Token từ bộ nhớ cục bộ thông qua AuthService để xác thực người dùng
    final token = await AuthService().getToken();

    // Bước 2: Đóng gói dữ liệu payload JSON gửi lên endpoint khởi tạo thanh toán
    final bodyMap = <String, dynamic>{
      'rescueOrderId': rescueOrderId,
      'paymentMethod': paymentMethod,
      'orderType': orderType ?? 'SINGLE_CROSSING',
    };
    // Bổ sung các trường tùy chọn nếu có giá trị hợp lệ
    if (garageId != null) bodyMap['garageId'] = garageId;
    if (amount != null) bodyMap['amount'] = amount;
    if (rescueCode != null && rescueCode.isNotEmpty) {
      bodyMap['rescueCode'] = rescueCode;
    }

    // Bước 3: Thực hiện lời gọi HTTP POST tới ApiConstants.createPaymentUrl
    final response = await _client.post(
      Uri.parse(ApiConstants.createPaymentUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(bodyMap),
    );

    // Bước 4: Giải mã dữ liệu phản hồi theo chuẩn UTF-8 để hiển thị đúng tiếng Việt có dấu
    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    // Bước 5: Kiểm tra mã trạng thái HTTP (2xx là thành công) và ánh xạ sang PaymentTransactionModel
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (json['data'] != null) {
        return PaymentTransactionModel.fromJson(
          json['data'] as Map<String, dynamic>,
        );
      }
      throw Exception(
        'Không nhận được dữ liệu phản hồi từ máy chủ thanh toán.',
      );
    } else {
      // Trích xuất thông báo lỗi từ Backend hoặc trả về thông báo lỗi kèm mã HTTP
      final msg =
          json['message'] ??
          'Khởi tạo thanh toán thất bại (${response.statusCode})';
      throw Exception(msg);
    }
  }

  // ==========================================================================
  // 2. TRUY VẤN & POLLING TRẠNG THÁI GIAO DỊCH THEO MÃ ĐƠN PAYOS (UC-18)
  // ==========================================================================

  /// Kiểm tra trạng thái giao dịch thanh toán dựa trên mã `payosOrderCode`.
  ///
  /// Phương thức này được màn hình `VietQRPaymentScreen` gọi định kỳ (auto-polling mỗi 3 giây)
  /// hoặc gọi trực tiếp khi người dùng bấm nút "Kiểm tra thanh toán".
  ///
  /// - [orderCode]: Mã số đơn hàng trên cổng PayOS.
  /// - [forceRefresh]: Khi đặt `true` (người dùng bấm kiểm tra thủ công), đính kèm query
  ///   `?refresh=true` để yêu cầu Backend chủ động đồng bộ trạng thái mới nhất từ máy chủ PayOS.
  Future<PaymentTransactionModel> getPaymentByOrderCode(
    int orderCode, {
    bool forceRefresh = false,
  }) async {
    // Lấy JWT Token xác thực phiên đăng nhập hiện tại
    final token = await AuthService().getToken();

    // Gửi yêu cầu HTTP GET kèm tham số query `refresh=true` nếu cần đồng bộ tức thì
    final response = await _client.get(
      Uri.parse(ApiConstants.paymentByOrderCodeUrl(orderCode))
          .replace(queryParameters: forceRefresh ? {'refresh': 'true'} : null),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    // Giải mã chuỗi JSON phản hồi với bảng mã UTF-8
    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    // Nếu truy vấn thành công (HTTP 200) và có trường 'data', chuyển đổi sang model
    if (response.statusCode == 200 && json['data'] != null) {
      return PaymentTransactionModel.fromJson(
        json['data'] as Map<String, dynamic>,
      );
    } else {
      final msg =
          json['message'] ?? 'Không thể tải thông tin giao dịch #$orderCode';
      throw Exception(msg);
    }
  }

  // ==========================================================================
  // 3. LẤY DANH SÁCH GIAO DỊCH THANH TOÁN CỦA MỘT ĐƠN CỨU HỘ (UC-18)
  // ==========================================================================

  /// Truy xuất toàn bộ lịch sử các lần giao dịch thanh toán thuộc về một đơn cứu hộ [rescueOrderId].
  ///
  /// Hữu ích để kiểm tra các giao dịch trước đó (bị hủy, hết hạn hoặc đã thanh toán thành công)
  /// cũng như phục vụ tra cứu biên nhận và đối soát.
  Future<List<PaymentTransactionModel>> getPaymentsByRescueOrder(
    int rescueOrderId,
  ) async {
    // Lấy JWT Token xác thực
    final token = await AuthService().getToken();

    // Gọi HTTP GET tới endpoint danh sách giao dịch theo mã đơn cứu hộ
    final response = await _client.get(
      Uri.parse(ApiConstants.paymentsByRescueOrderUrl(rescueOrderId)),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    // Giải mã UTF-8 và parse JSON
    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    // Kiểm tra phản hồi hợp lệ và ánh xạ từng phần tử trong mảng JSON sang PaymentTransactionModel
    if (response.statusCode == 200 && json['data'] is List) {
      return (json['data'] as List)
          .map(
            (item) =>
                PaymentTransactionModel.fromJson(item as Map<String, dynamic>),
          )
          .toList();
    } else {
      final msg =
          json['message'] ??
          'Không thể tải danh sách giao dịch cho đơn #$rescueOrderId';
      throw Exception(msg);
    }
  }

  // ==========================================================================
  // 4. GIẢ LẬP TÍN HIỆU WEBHOOK PAYOS PHỤC VỤ KIỂM THỬ / DEMO (UC-18)
  // ==========================================================================

  /// Kích hoạt giả lập callback Webhook thanh toán thành công từ cổng PayOS cho mã đơn [orderCode].
  ///
  /// Chức năng này dành riêng cho môi trường Sandbox / Demo, cho phép hoàn tất giao dịch
  /// VietQR ngay trên ứng dụng mà không cần chuyển khoản ngân hàng thực tế.
  Future<PaymentTransactionModel> simulateWebhook(int orderCode) async {
    // Lấy JWT Token xác thực
    final token = await AuthService().getToken();

    // Gửi yêu cầu HTTP POST tới endpoint giả lập Webhook cho orderCode tương ứng
    final response = await _client.post(
      Uri.parse(ApiConstants.simulateWebhookUrl(orderCode)),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    // Giải mã phản hồi UTF-8 và chuyển đổi JSON
    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    // Trả về bản ghi giao dịch đã được cập nhật sang trạng thái 'SUCCESS'
    if (response.statusCode == 200 && json['data'] != null) {
      return PaymentTransactionModel.fromJson(
        json['data'] as Map<String, dynamic>,
      );
    } else {
      final msg =
          json['message'] ??
          'Giả lập webhook thất bại (${response.statusCode})';
      throw Exception(msg);
    }
  }

  // ==========================================================================
  // 5. XÁC NHẬN THANH TOÁN TIỀN MẶT TẠI HIỆN TRƯỜNG (UC-18)
  // ==========================================================================

  /// Xác nhận đơn cứu hộ tương ứng với mã giao dịch [orderCode] đã được thanh toán bằng tiền mặt.
  ///
  /// Khi giao dịch tiền mặt được xác nhận, hệ thống Backend sẽ cập nhật trạng thái giao dịch
  /// sang `'SUCCESS'`, ghi nhận thời điểm `paidAt` và tính toán phí điều phối để đối soát với Gara.
  Future<PaymentTransactionModel> confirmCashPayment(int orderCode) async {
    // Lấy JWT Token từ AuthService
    final token = await AuthService().getToken();

    // Gọi HTTP POST tới endpoint xác nhận thu tiền mặt
    final response = await _client.post(
      Uri.parse(ApiConstants.confirmCashPaymentUrl(orderCode)),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    // Giải mã dữ liệu phản hồi UTF-8
    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    // Kiểm tra kết quả HTTP 200 và trả về đối tượng PaymentTransactionModel đã hoàn tất
    if (response.statusCode == 200 && json['data'] != null) {
      return PaymentTransactionModel.fromJson(
        json['data'] as Map<String, dynamic>,
      );
    } else {
      final msg =
          json['message'] ??
          'Xác nhận thu tiền mặt thất bại (${response.statusCode})';
      throw Exception(msg);
    }
  }
}

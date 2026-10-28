import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import '../models/payment_transaction_model.dart';
import 'auth_service.dart';

class PaymentService {
  final http.Client _client;

  PaymentService({http.Client? client}) : _client = client ?? http.Client();

  Future<PaymentTransactionModel> createPayment({
    required int rescueOrderId,
    int? garageId,
    double? amount,
    String? rescueCode,
    String? orderType = 'SINGLE_CROSSING',
    String paymentMethod = 'PAYOS_VIETQR',
  }) async {
    final token = await AuthService().getToken();
    final bodyMap = <String, dynamic>{
      'rescueOrderId': rescueOrderId,
      'paymentMethod': paymentMethod,
      'orderType': orderType ?? 'SINGLE_CROSSING',
    };
    if (garageId != null) bodyMap['garageId'] = garageId;
    if (amount != null) bodyMap['amount'] = amount;
    if (rescueCode != null && rescueCode.isNotEmpty) {
      bodyMap['rescueCode'] = rescueCode;
    }

    final response = await _client.post(
      Uri.parse(ApiConstants.createPaymentUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(bodyMap),
    );

    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

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
      final msg =
          json['message'] ??
          'Khởi tạo thanh toán thất bại (${response.statusCode})';
      throw Exception(msg);
    }
  }

  Future<PaymentTransactionModel> getPaymentByOrderCode(
    int orderCode, {
    bool forceRefresh = false,
  }) async {
    final token = await AuthService().getToken();
    final response = await _client.get(
      Uri.parse(ApiConstants.paymentByOrderCodeUrl(orderCode))
          .replace(queryParameters: forceRefresh ? {'refresh': 'true'} : null),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

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

  Future<List<PaymentTransactionModel>> getPaymentsByRescueOrder(
    int rescueOrderId,
  ) async {
    final token = await AuthService().getToken();
    final response = await _client.get(
      Uri.parse(ApiConstants.paymentsByRescueOrderUrl(rescueOrderId)),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

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

  Future<PaymentTransactionModel> simulateWebhook(int orderCode) async {
    final token = await AuthService().getToken();
    final response = await _client.post(
      Uri.parse(ApiConstants.simulateWebhookUrl(orderCode)),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

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

  Future<PaymentTransactionModel> confirmCashPayment(int orderCode) async {
    final token = await AuthService().getToken();
    final response = await _client.post(
      Uri.parse(ApiConstants.confirmCashPaymentUrl(orderCode)),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

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

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import 'auth_service.dart';

class ServiceRatingModel {
  final int id;
  final int rescueOrderId;
  final String rescueCode;
  final int? customerId;
  final String customerName;
  final int? garageId;
  final String? garageName;
  final int? mechanicStaffId;
  final String? mechanicName;
  final double? mechanicRatingAvg;
  final int stars;
  final String? tags;
  final String? comment;
  final String? createdAt;

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

  factory ServiceRatingModel.fromJson(Map<String, dynamic> json) {
    return ServiceRatingModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      rescueOrderId: (json['rescueOrderId'] as num?)?.toInt() ?? 0,
      rescueCode: json['rescueCode'] as String? ?? '',
      customerId: (json['customerId'] as num?)?.toInt(),
      customerName: json['customerName'] as String? ?? 'Khách hàng',
      garageId: (json['garageId'] as num?)?.toInt(),
      garageName: json['garageName'] as String?,
      mechanicStaffId: (json['mechanicStaffId'] as num?)?.toInt(),
      mechanicName: json['mechanicName'] as String?,
      mechanicRatingAvg: (json['mechanicRatingAvg'] as num?)?.toDouble(),
      stars: (json['stars'] as num?)?.toInt() ?? 5,
      tags: json['tags'] as String?,
      comment: json['comment'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}

class RatingService {
  final http.Client _client;
  final AuthService _authService;

  RatingService({http.Client? client, AuthService? authService})
      : _client = client ?? http.Client(),
        _authService = authService ?? AuthService();

  /// UC-19: Khách hàng gửi đánh giá số sao (1-5), thẻ đánh giá nhanh và nhận xét sau dịch vụ
  Future<ServiceRatingModel> submitRating({
    required int rescueOrderId,
    required int stars,
    String? tags,
    String? comment,
  }) async {
    final token = await _authService.getToken();
    final payload = <String, dynamic>{
      'rescueOrderId': rescueOrderId,
      'stars': stars,
      if (tags != null && tags.isNotEmpty) 'tags': tags,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
    };

    final response = await _client.post(
      Uri.parse(ApiConstants.ratingsUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(payload),
    );

    final utf8Body = utf8.decode(response.bodyBytes);
    final json = jsonDecode(utf8Body);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (json['data'] != null) {
        return ServiceRatingModel.fromJson(
          json['data'] as Map<String, dynamic>,
        );
      }
      throw Exception('Không nhận được dữ liệu đánh giá từ máy chủ.');
    } else {
      final msg =
          json['message'] ?? 'Gửi đánh giá thất bại (${response.statusCode})';
      throw Exception(msg);
    }
  }

  /// Lấy thông tin đánh giá theo mã đơn cứu hộ
  Future<ServiceRatingModel?> getRatingByOrder(int rescueOrderId) async {
    final token = await _authService.getToken();
    final response = await _client.get(
      Uri.parse(ApiConstants.ratingByOrderUrl(rescueOrderId)),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final utf8Body = utf8.decode(response.bodyBytes);
      final json = jsonDecode(utf8Body);
      if (json['data'] != null) {
        return ServiceRatingModel.fromJson(
          json['data'] as Map<String, dynamic>,
        );
      }
    }
    return null;
  }

  /// Lấy danh sách các đánh giá đã gửi của khách hàng hiện tại
  Future<List<ServiceRatingModel>> getMyRatings() async {
    final token = await _authService.getToken();
    final response = await _client.get(
      Uri.parse(ApiConstants.myRatingsUrl),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final utf8Body = utf8.decode(response.bodyBytes);
      final json = jsonDecode(utf8Body);
      if (json['data'] is List) {
        return (json['data'] as List)
            .map((e) => ServiceRatingModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    }
    return [];
  }
}

import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import '../models/rescue_order_model.dart';
import 'auth_service.dart';

class RescueService {
  final AuthService _authService = AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // 1. Lấy danh sách gara đủ điều kiện có dịch vụ CROSSING
  Future<List<CrossingOptionModel>> getCrossingOptions({
    double? pickupLatitude,
    double? pickupLongitude,
  }) async {
    return getRescueOptions(
      serviceType: 'CROSSING',
      pickupLatitude: pickupLatitude,
      pickupLongitude: pickupLongitude,
    );
  }

  Future<List<CrossingOptionModel>> getRescueOptions({
    required String serviceType,
    double? pickupLatitude,
    double? pickupLongitude,
  }) async {
    final headers = await _getHeaders();
    final uri = Uri.parse(ApiConstants.rescueOptionsUrl).replace(
      queryParameters: {
        'serviceType': serviceType,
        if (pickupLatitude != null) 'pickupLatitude': pickupLatitude.toString(),
        if (pickupLongitude != null)
          'pickupLongitude': pickupLongitude.toString(),
      },
    );
    final response = await http.get(uri, headers: headers);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      final list = (data['data'] as List)
          .map((i) => CrossingOptionModel.fromJson(i))
          .toList();
      return list;
    }
    throw Exception(data['message'] ?? 'Không thể tải danh sách gara cứu hộ');
  }

  // 2. Khách tạo đơn SOS chở xe vượt ngập đơn lẻ
  Future<RescueOrderModel> createSingleCrossingOrder({
    String orderType = 'SINGLE_CROSSING',
    required int garageId,
    required int serviceItemId,
    required int vehicleId,
    required String pickupAddress,
    required double pickupLatitude,
    required double pickupLongitude,
    required String dropoffAddress,
    required double dropoffLatitude,
    required double dropoffLongitude,
    String? waterLevel,
    String? customerNotes,
    String? clientRequestId,
    double? expectedServiceBasePrice,
    double? expectedBookingFee,
    double? expectedTotalAmount,
  }) async {
    final headers = await _getHeaders();
    final payload = <String, dynamic>{
      'orderType': orderType,
      'garageId': garageId,
      'serviceItemId': serviceItemId,
      'vehicleId': vehicleId,
      'pickupAddress': pickupAddress,
      'pickupLatitude': pickupLatitude,
      'pickupLongitude': pickupLongitude,
      'dropoffAddress': dropoffAddress,
      'dropoffLatitude': dropoffLatitude,
      'dropoffLongitude': dropoffLongitude,
      'waterLevel': waterLevel,
      'customerNotes': customerNotes,
    };
    if (clientRequestId != null) payload['clientRequestId'] = clientRequestId;
    if (expectedServiceBasePrice != null) {
      payload['expectedServiceBasePrice'] = expectedServiceBasePrice;
    }
    if (expectedBookingFee != null) {
      payload['expectedBookingFee'] = expectedBookingFee;
    }
    if (expectedTotalAmount != null) {
      payload['expectedTotalAmount'] = expectedTotalAmount;
    }

    final response = await http.post(
      Uri.parse(ApiConstants.rescueOrdersUrl),
      headers: headers,
      body: jsonEncode(payload),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return RescueOrderModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể tạo yêu cầu cứu hộ');
  }

  // 3. Lấy đơn đang hoạt động (ACTIVE)
  Future<RescueOrderModel?> getActiveOrder() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse(ApiConstants.activeRescueOrderUrl),
      headers: headers,
    );
    if (response.statusCode == 204 || response.body.isEmpty) {
      return null;
    }
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 &&
        data['success'] == true &&
        data['data'] != null) {
      return RescueOrderModel.fromJson(data['data']);
    }
    return null;
  }

  // 4. Lấy chi tiết đơn theo ID
  Future<RescueOrderModel> getOrderById(int orderId) async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse(ApiConstants.rescueOrderUrl(orderId)),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return RescueOrderModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể tải chi tiết đơn');
  }

  // 5. Khách hủy đơn khi chưa có thợ nhận
  Future<RescueOrderModel> cancelOrder(int orderId, {String? reason}) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.cancelRescueOrderUrl(orderId)),
      headers: headers,
      body: jsonEncode({'reason': reason ?? 'Khách hủy yêu cầu'}),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return RescueOrderModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể hủy đơn');
  }

  // 6. Thợ lấy danh sách offer đang chờ
  Future<List<RescueOfferModel>> getPendingOffers() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse(ApiConstants.pendingRescueOffersUrl),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      final list = (data['data'] as List)
          .map((i) => RescueOfferModel.fromJson(i))
          .toList();
      return list;
    }
    throw Exception(data['message'] ?? 'Không thể tải offer cứu hộ');
  }

  // 7. Thợ nhận offer
  Future<RescueOrderModel> acceptOffer(int offerId) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.acceptRescueOfferUrl(offerId)),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return RescueOrderModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể nhận đơn cứu hộ');
  }

  // 8. Thợ từ chối offer
  Future<void> rejectOffer(int offerId, {String? reason}) async {
    final headers = await _getHeaders();
    final uri = Uri.parse(ApiConstants.rejectRescueOfferUrl(offerId))
        .replace(queryParameters: {'reason': reason ?? 'Thợ bận hoặc quá xa'});
    final response = await http.post(uri, headers: headers);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode != 200 || data['success'] != true) {
      throw Exception(data['message'] ?? 'Không thể từ chối đơn');
    }
  }

  // 9. Thợ gửi GPS định kỳ
  Future<TrackingSnapshotModel> updateLocation(
    int orderId,
    double latitude,
    double longitude, {
    double? bearing,
    double? speed,
    double? accuracyMeters,
    String? recordedAt,
  }) async {
    final headers = await _getHeaders();
    final payload = <String, dynamic>{
      'latitude': latitude,
      'longitude': longitude,
      'bearing': bearing,
      'speed': speed,
    };
    if (accuracyMeters != null) payload['accuracyMeters'] = accuracyMeters;
    if (recordedAt != null) payload['recordedAt'] = recordedAt;

    final response = await http.post(
      Uri.parse(ApiConstants.updateOrderLocationUrl(orderId)),
      headers: headers,
      body: jsonEncode(payload),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return TrackingSnapshotModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể cập nhật tọa độ');
  }

  // 10. Lấy tracking snapshot
  Future<TrackingSnapshotModel> getTrackingSnapshot(int orderId) async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse(ApiConstants.orderTrackingUrl(orderId)),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return TrackingSnapshotModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể tải dữ liệu theo dõi');
  }

  // 11. Thợ xác nhận đến nơi (<30m)
  Future<RescueOrderModel> confirmArrival(
    int orderId,
    double latitude,
    double longitude, {
    double? accuracyMeters,
    String? recordedAt,
  }) async {
    final headers = await _getHeaders();
    final payload = <String, dynamic>{
      'latitude': latitude,
      'longitude': longitude,
    };
    if (accuracyMeters != null) payload['accuracyMeters'] = accuracyMeters;
    if (recordedAt != null) payload['recordedAt'] = recordedAt;

    final response = await http.post(
      Uri.parse(ApiConstants.confirmOrderArrivalUrl(orderId)),
      headers: headers,
      body: jsonEncode(payload),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return RescueOrderModel.fromJson(data['data']);
    }
    throw Exception(
      data['message'] ?? 'Khoảng cách chưa đủ gần (<30m) để xác nhận đến nơi',
    );
  }

  // 12. Cập nhật tiến độ chở xe
  Future<RescueOrderModel> updateTransitStage(
    int orderId,
    String stage, {
    String? note,
  }) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.updateTransitStageUrl(orderId)),
      headers: headers,
      body: jsonEncode({'stage': stage, 'note': note}),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return RescueOrderModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể cập nhật tiến độ');
  }

  // 13. Thợ hoàn tất nghiệm thu ảnh
  Future<RescueOrderModel> completeOrder(
    int orderId,
    String completionPhotoUrl, {
    String? handoverPhotoUrl,
    String? notes,
  }) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.completeRescueOrderUrl(orderId)),
      headers: headers,
      body: jsonEncode({
        'completionPhotoUrl': completionPhotoUrl,
        'handoverPhotoUrl': handoverPhotoUrl,
        'notes': notes,
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return RescueOrderModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể hoàn tất ca cứu hộ');
  }

  // 14. Lịch sử cứu hộ
  Future<List<RescueOrderModel>> getOrderHistory() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse(ApiConstants.rescueOrderHistoryUrl),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      final list = (data['data'] as List)
          .map((i) => RescueOrderModel.fromJson(i))
          .toList();
      return list;
    }
    throw Exception(data['message'] ?? 'Không thể tải lịch sử cứu hộ');
  }

  // 15. Tải ảnh bằng chứng lên Cloudinary
  Future<String> uploadEvidenceImage(File file) async {
    final token = await _authService.getToken();
    final request = http.MultipartRequest(
      'POST',
      Uri.parse(ApiConstants.uploadImageUrl),
    );
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields['folder'] = 'rescue_completion';
    request.files.add(await http.MultipartFile.fromPath('file', file.path));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return data['data']['url'] as String;
    }
    throw Exception(
      data['message'] ?? 'Không thể tải ảnh nghiệm thu lên hệ thống',
    );
  }

  // 16. Thợ tải ảnh bằng chứng chính thức cho đơn cứu hộ
  Future<String> uploadOrderEvidence(
    int orderId,
    List<int> fileBytes,
    String filename,
  ) async {
    final token = await _authService.getToken();
    final request = http.MultipartRequest(
      'POST',
      Uri.parse(ApiConstants.rescueOrderEvidenceUrl(orderId)),
    );
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields['evidenceType'] = 'COMPLETION';
    request.files.add(
      http.MultipartFile.fromBytes('file', fileBytes, filename: filename),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return (data['data']['url'] ?? data['data']['fileUrl']) as String;
    }
    throw Exception(
      data['message'] ?? 'Không thể tải ảnh nghiệm thu lên hệ thống',
    );
  }
}

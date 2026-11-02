import 'dart:convert';
import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import '../models/vehicle_model.dart';
import 'auth_service.dart';

class VehicleService {
  final http.Client _client;
  final AuthService _authService;

  VehicleService({http.Client? client, AuthService? authService})
      : _client = client ?? http.Client(),
        _authService = authService ?? AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<List<VehicleModel>> getMyVehicles() async {
    final headers = await _getHeaders();
    final response = await _client.get(
      Uri.parse(ApiConstants.vehiclesUrl),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      final list = (data['data'] as List)
          .map((i) => VehicleModel.fromJson(i))
          .toList();
      return list;
    }
    throw Exception(data['message'] ?? 'Không thể tải danh sách phương tiện');
  }

  Future<VehicleModel?> getDefaultVehicle() async {
    final headers = await _getHeaders();
    final response = await _client.get(
      Uri.parse(ApiConstants.defaultVehicleUrl),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true && data['data'] != null) {
      return VehicleModel.fromJson(data['data']);
    }
    return null;
  }

  Future<VehicleModel> addVehicle({
    required String licensePlate,
    required String brand,
    required String model,
    String? vehicleType,
    String? engineCapacity,
    String? color,
    bool isDefault = false,
  }) async {
    final headers = await _getHeaders();
    final response = await _client.post(
      Uri.parse(ApiConstants.vehiclesUrl),
      headers: headers,
      body: jsonEncode({
        'licensePlate': licensePlate,
        'brand': brand,
        'model': model,
        'vehicleType': vehicleType ?? 'SCOOTER',
        'engineCapacity': engineCapacity,
        'color': color,
        'isDefault': isDefault,
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return VehicleModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể thêm phương tiện');
  }

  Future<VehicleModel> updateVehicle(
    int vehicleId, {
    String? licensePlate,
    String? brand,
    String? model,
    String? vehicleType,
    String? engineCapacity,
    String? color,
    bool? isDefault,
  }) async {
    final headers = await _getHeaders();
    final body = <String, dynamic>{};
    if (licensePlate != null) body['licensePlate'] = licensePlate;
    if (brand != null) body['brand'] = brand;
    if (model != null) body['model'] = model;
    if (vehicleType != null) body['vehicleType'] = vehicleType;
    if (engineCapacity != null) body['engineCapacity'] = engineCapacity;
    if (color != null) body['color'] = color;
    if (isDefault != null) body['isDefault'] = isDefault;

    final response = await _client.put(
      Uri.parse(ApiConstants.vehicleUrl(vehicleId)),
      headers: headers,
      body: jsonEncode(body),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return VehicleModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể cập nhật phương tiện');
  }

  Future<void> deleteVehicle(int vehicleId) async {
    final headers = await _getHeaders();
    final response = await _client.delete(
      Uri.parse(ApiConstants.vehicleUrl(vehicleId)),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return;
    }
    throw Exception(data['message'] ?? 'Không thể xóa phương tiện');
  }

  Future<VehicleModel> setDefaultVehicle(int vehicleId) async {
    final headers = await _getHeaders();
    final response = await _client.patch(
      Uri.parse(ApiConstants.setDefaultVehicleUrl(vehicleId)),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return VehicleModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể đặt phương tiện mặc định');
  }
}

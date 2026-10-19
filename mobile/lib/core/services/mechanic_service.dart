import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/mechanic_staff_model.dart';
import 'auth_service.dart';

class MechanicService {
  final AuthService _authService = AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<List<MechanicStaffModel>> getMyMechanics() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConstants.garageMechanicsUrl), headers: headers);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      final list = (data['data'] as List).map((i) => MechanicStaffModel.fromJson(i)).toList();
      return list;
    }
    throw Exception(data['message'] ?? 'Không thể tải danh sách thợ');
  }

  Future<MechanicStaffModel> createMechanic({
    required String username,
    required String fullName,
    String? email,
    required String phone,
    required String password,
    int? branchId,
    String? shiftName,
    String? speciality,
  }) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.garageMechanicsUrl),
      headers: headers,
      body: jsonEncode({
        'username': username,
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'password': password,
        'branchId': branchId,
        'shiftName': shiftName,
        'speciality': speciality,
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return MechanicStaffModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Thêm thợ mới thất bại');
  }

  Future<MechanicStaffModel> allocateBranch({
    required int staffId,
    int? branchId,
    String? shiftName,
  }) async {
    final headers = await _getHeaders();
    final response = await http.patch(
      Uri.parse('${ApiConstants.garageMechanicsUrl}/$staffId/allocate'),
      headers: headers,
      body: jsonEncode({
        'branchId': branchId,
        'shiftName': shiftName,
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return MechanicStaffModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Phân bổ chi nhánh thất bại');
  }

  Future<MechanicStaffModel> getMyProfile() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConstants.mechanicProfileUrl), headers: headers);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return MechanicStaffModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể tải hồ sơ thợ');
  }

  Future<MechanicStaffModel> toggleStatus({
    required String workingStatus, // AVAILABLE, OFFLINE, BUSY
    double? latitude,
    double? longitude,
  }) async {
    final headers = await _getHeaders();
    final response = await http.patch(
      Uri.parse(ApiConstants.mechanicStatusUrl),
      headers: headers,
      body: jsonEncode({
        'workingStatus': workingStatus,
        'latitude': latitude,
        'longitude': longitude,
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return MechanicStaffModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Cập nhật trạng thái trực tuyến thất bại');
  }
}

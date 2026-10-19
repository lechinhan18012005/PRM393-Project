import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/branch_model.dart';
import '../models/garage_model.dart';
import '../models/service_item_model.dart';
import 'auth_service.dart';

class GarageService {
  final AuthService _authService = AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<GarageModel> getMyGarage() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConstants.myGarageUrl), headers: headers);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return GarageModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Không thể tải thông tin garage');
  }

  Future<GarageModel> registerGarage({
    required String garageName,
    String? phone,
    String? businessLicenseUrl,
    String? idCardUrl,
    String? firstBranchName,
    String? firstBranchAddress,
    double? firstBranchLatitude,
    double? firstBranchLongitude,
    String? firstBranchPhone,
    String? firstBranchVehicles,
  }) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.garageRegisterUrl),
      headers: headers,
      body: jsonEncode({
        'garageName': garageName,
        'phone': phone,
        'businessLicenseUrl': businessLicenseUrl,
        'idCardUrl': idCardUrl,
        'firstBranchName': firstBranchName,
        'firstBranchAddress': firstBranchAddress,
        'firstBranchLatitude': firstBranchLatitude,
        'firstBranchLongitude': firstBranchLongitude,
        'firstBranchPhone': firstBranchPhone,
        'firstBranchVehicles': firstBranchVehicles,
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return GarageModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Đăng ký garage không thành công');
  }

  Future<List<BranchModel>> getMyBranches() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConstants.garageBranchesUrl), headers: headers);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      final list = (data['data'] as List).map((i) => BranchModel.fromJson(i)).toList();
      return list;
    }
    throw Exception(data['message'] ?? 'Không thể tải danh sách chi nhánh');
  }

  Future<BranchModel> createBranch({
    required String branchName,
    required String address,
    required double latitude,
    required double longitude,
    String? phoneNumber,
    String? rescueVehicles,
  }) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.garageBranchesUrl),
      headers: headers,
      body: jsonEncode({
        'branchName': branchName,
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
        'phoneNumber': phoneNumber,
        'rescueVehicles': rescueVehicles,
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return BranchModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Thêm chi nhánh không thành công');
  }

  Future<BranchModel> toggleBranchStatus(int branchId, String status) async {
    final headers = await _getHeaders();
    final response = await http.patch(
      Uri.parse('${ApiConstants.garageBranchesUrl}/$branchId/status?status=$status'),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return BranchModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Cập nhật trạng thái chi nhánh thất bại');
  }

  Future<List<ServiceItemModel>> getMyServices() async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(ApiConstants.garageServicesUrl), headers: headers);
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      final list = (data['data'] as List).map((i) => ServiceItemModel.fromJson(i)).toList();
      return list;
    }
    throw Exception(data['message'] ?? 'Không thể tải danh mục dịch vụ');
  }

  Future<ServiceItemModel> createService(ServiceItemModel item) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.garageServicesUrl),
      headers: headers,
      body: jsonEncode(item.toJson()),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return ServiceItemModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Thêm dịch vụ thất bại');
  }

  Future<ServiceItemModel> updateService(int id, ServiceItemModel item) async {
    final headers = await _getHeaders();
    final response = await http.put(
      Uri.parse('${ApiConstants.garageServicesUrl}/$id'),
      headers: headers,
      body: jsonEncode(item.toJson()),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return ServiceItemModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Cập nhật dịch vụ thất bại');
  }

  Future<void> deleteService(int id) async {
    final headers = await _getHeaders();
    final response = await http.delete(
      Uri.parse('${ApiConstants.garageServicesUrl}/$id'),
      headers: headers,
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode != 200 || data['success'] != true) {
      throw Exception(data['message'] ?? 'Xóa dịch vụ thất bại');
    }
  }
}

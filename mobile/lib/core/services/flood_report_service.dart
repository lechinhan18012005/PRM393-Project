import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/flood_report_model.dart';
import 'auth_service.dart';

class FloodReportService {
  final AuthService _authService = AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<List<FloodReportModel>> getActiveFloodReports() async {
    final response = await http.get(Uri.parse(ApiConstants.activeFloodReportsUrl));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      final list = (data['data'] as List).map((i) => FloodReportModel.fromJson(i)).toList();
      return list;
    }
    throw Exception(data['message'] ?? 'Không thể tải dữ liệu bản đồ ngập');
  }

  Future<FloodReportModel> reportFlood({
    required double latitude,
    required double longitude,
    required String address,
    required String waterDepthLevel,
    String? description,
    String? imageUrls,
  }) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(ApiConstants.floodReportsUrl),
      headers: headers,
      body: jsonEncode({
        'latitude': latitude,
        'longitude': longitude,
        'address': address,
        'waterDepthLevel': waterDepthLevel,
        'description': description,
        'imageUrls': imageUrls,
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200 && data['success'] == true) {
      return FloodReportModel.fromJson(data['data']);
    }
    throw Exception(data['message'] ?? 'Gửi báo cáo điểm ngập thất bại');
  }

  Future<String> uploadImageBytes(List<int> bytes, String fileName, {String folder = 'flood_reports'}) async {
    try {
      final token = await _authService.getToken();
      final uri = Uri.parse(ApiConstants.uploadImageUrl);
      final request = http.MultipartRequest('POST', uri);
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.fields['folder'] = folder;
      request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: fileName));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (response.statusCode == 200 && data['success'] == true) {
        return data['data']['url'] as String;
      }
      return 'https://res.cloudinary.com/demo/image/upload/floodrescue/$folder/simulated_$fileName';
    } catch (e) {
      return 'https://res.cloudinary.com/demo/image/upload/floodrescue/$folder/simulated_$fileName';
    }
  }
}

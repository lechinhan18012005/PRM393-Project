import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/api_constants.dart';
import '../models/auth_response_model.dart';
import '../models/user_model.dart';

class AuthService {
  final http.Client _client;
  AuthService({http.Client? client}) : _client = client ?? http.Client();
  static const String _tokenKey = 'jwt_access_token';
  static const String _refreshTokenKey = 'jwt_refresh_token';
  static const String _userDataKey = 'user_data';

  Future<AuthResponseModel> login(String identifier, String password) async {
    try {
      final response = await _client.post(
        Uri.parse(ApiConstants.loginUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'platform': 'MOBILE',
          'identifier': identifier,
          'password': password,
        }),
      );

      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (response.statusCode == 200 && data['success'] == true) {
        final authResponse = AuthResponseModel.fromJson(data['data']);
        _requireMobileRole(authResponse.user);
        await _saveAuthData(authResponse);
        return authResponse;
      } else {
        throw Exception(data['message'] ?? 'Đăng nhập không thành công');
      }
    } catch (e) {
      if (e is Exception && !e.toString().contains('SocketException')) {
        rethrow;
      }
      throw Exception(
        'Không thể kết nối đến máy chủ Backend (${ApiConstants.baseUrl}). Vui lòng kiểm tra kết nối.',
      );
    }
  }

  Future<AuthResponseModel> register({
    required String fullName,
    required String username,
    required String email,
    String? phone,
    required String password,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse(ApiConstants.registerUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'fullName': fullName,
          'username': username,
          'email': email,
          'phone': phone,
          'password': password,
        }),
      );

      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (response.statusCode == 201 && data['success'] == true) {
        final authResponse = AuthResponseModel.fromJson(data['data']);
        _requireMobileRole(authResponse.user);
        await _saveAuthData(authResponse);
        return authResponse;
      } else {
        throw Exception(data['message'] ?? 'Đăng ký không thành công');
      }
    } catch (e) {
      if (e is Exception && !e.toString().contains('SocketException')) {
        rethrow;
      }
      throw Exception(
        'Không thể kết nối đến máy chủ Backend (${ApiConstants.baseUrl}).',
      );
    }
  }

  void _requireMobileRole(UserModel user) {
    if (user.role != 'CUSTOMER' && user.role != 'FIELD_MECHANIC') {
      throw Exception(
        'Tài khoản này vui lòng đăng nhập trên Web. Mobile chỉ dành cho Khách hàng và Thợ cứu hộ.',
      );
    }
  }

  Future<void> activateInvitation({
    required String code,
    required String fullName,
    required String username,
    required String email,
    String? phone,
    required String password,
  }) async {
    final response = await _client.post(
      Uri.parse('${ApiConstants.baseUrl}/onboarding/activate'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'code': code.trim(),
        'account': {
          'fullName': fullName,
          'username': username,
          'email': email,
          'phone': phone,
          'password': password,
        },
      }),
    );
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode != 200 || data['success'] != true) {
      throw Exception(data['message'] ?? 'Kích hoạt thất bại');
    }
  }

  Future<void> _saveAuthData(AuthResponseModel authResponse) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, authResponse.accessToken);
    await prefs.setString(_refreshTokenKey, authResponse.refreshToken);
    await prefs.setString(_userDataKey, jsonEncode(authResponse.user.toJson()));
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<UserModel?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userDataKey);
    if (userJson != null) {
      try {
        return UserModel.fromJson(jsonDecode(userJson));
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  Future<UserModel> getCurrentUser() async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Chưa đăng nhập');
    }
    final response = await _client.get(
      Uri.parse(ApiConstants.currentUserUrl),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode != 200) {
      throw Exception('Phiên đăng nhập đã hết hạn');
    }
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (data['success'] != true) {
      throw Exception('Phiên đăng nhập không hợp lệ');
    }
    final user = UserModel.fromJson(data['data']);
    _requireMobileRole(user);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userDataKey, jsonEncode(user.toJson()));
    return user;
  }

  Future<UserModel> updateProfile({
    required String fullName,
    required String email,
    String? phone,
  }) async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    late http.Response response;
    try {
      response = await _client
          .patch(
            Uri.parse(ApiConstants.currentUserUrl),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'fullName': fullName.trim(),
              'email': email.trim(),
              'phone': phone == null || phone.trim().isEmpty
                  ? null
                  : phone.trim(),
            }),
          )
          .timeout(const Duration(seconds: 20));
    } on TimeoutException {
      throw Exception('Kết nối quá thời gian chờ. Vui lòng thử lại.');
    } on http.ClientException {
      throw Exception(
        'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.',
      );
    }
    late Map<String, dynamic> data;
    try {
      data =
          jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      throw Exception('Chưa thể cập nhật tài khoản. Vui lòng thử lại sau.');
    }
    if (response.statusCode != 200 || data['success'] != true) {
      if (response.statusCode == 401) {
        throw Exception('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      final errors = data['validationErrors'];
      final message = errors is Map && errors.isNotEmpty
          ? errors.values.first.toString()
          : data['message'];
      throw Exception(
        response.statusCode >= 500
            ? 'Chưa thể cập nhật tài khoản. Vui lòng thử lại sau.'
            : message ?? 'Cập nhật tài khoản thất bại',
      );
    }
    final user = UserModel.fromJson(data['data']);
    _requireMobileRole(user);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userDataKey, jsonEncode(user.toJson()));
    return user;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_userDataKey);
  }
}

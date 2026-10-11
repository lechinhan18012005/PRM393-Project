import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';
import '../models/auth_response_model.dart';
import '../models/user_model.dart';

class AuthService {
  static const String _tokenKey = 'jwt_access_token';
  static const String _refreshTokenKey = 'jwt_refresh_token';
  static const String _userDataKey = 'user_data';

  Future<AuthResponseModel> login(String identifier, String password) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConstants.loginUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': identifier,
          'password': password,
        }),
      );

      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (response.statusCode == 200 && data['success'] == true) {
        final authResponse = AuthResponseModel.fromJson(data['data']);
        await _saveAuthData(authResponse);
        return authResponse;
      } else {
        throw Exception(data['message'] ?? 'Đăng nhập không thành công');
      }
    } catch (e) {
      if (e is Exception && !e.toString().contains('SocketException')) {
        rethrow;
      }
      throw Exception('Không thể kết nối đến máy chủ Backend (${ApiConstants.baseUrl}). Vui lòng kiểm tra kết nối.');
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
      final response = await http.post(
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
        await _saveAuthData(authResponse);
        return authResponse;
      } else {
        throw Exception(data['message'] ?? 'Đăng ký không thành công');
      }
    } catch (e) {
      if (e is Exception && !e.toString().contains('SocketException')) {
        rethrow;
      }
      throw Exception('Không thể kết nối đến máy chủ Backend (${ApiConstants.baseUrl}).');
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
    if (token == null) throw Exception('Chưa đăng nhập');
    final response = await http.get(
      Uri.parse(ApiConstants.currentUserUrl),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode != 200) throw Exception('Phiên đăng nhập đã hết hạn');
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (data['success'] != true) throw Exception('Phiên đăng nhập không hợp lệ');
    return UserModel.fromJson(data['data']);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_userDataKey);
  }
}

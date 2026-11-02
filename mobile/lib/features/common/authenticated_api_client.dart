import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/services/auth_service.dart';

class AuthenticatedApiClient {
  AuthenticatedApiClient({AuthService? authService})
      : _authService = authService ?? AuthService();

  final AuthService _authService;

  Future<dynamic> get(Uri uri) => _send('GET', uri);

  Future<dynamic> post(Uri uri, {Map<String, dynamic>? body}) =>
      _send('POST', uri, body: body);

  Future<dynamic> _send(
    String method,
    Uri uri, {
    Map<String, dynamic>? body,
  }) async {
    final token = await _authService.getToken();
    if (token == null) throw Exception('Vui lòng đăng nhập lại');
    final request = http.Request(method, uri)
      ..headers.addAll({
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      });
    if (body != null) request.body = jsonEncode(body);
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    final decoded = response.bodyBytes.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode >= 200 &&
        response.statusCode < 300 &&
        decoded['success'] == true) {
      return decoded['data'];
    }
    throw Exception(decoded['message'] ?? 'Yêu cầu không thành công');
  }
}

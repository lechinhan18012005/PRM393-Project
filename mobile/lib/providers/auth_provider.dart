import 'package:flutter/foundation.dart';

import '../core/models/user_model.dart';
import '../core/services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService;
  AuthProvider({AuthService? authService})
    : _authService = authService ?? AuthService();

  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get errorMessage => _errorMessage;

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _authService.getToken();
      if (token != null) {
        _user = await _authService.getCurrentUser();
      }
    } catch (_) {
      _user = null;
      await _authService.logout();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String identifier, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _authService.login(identifier, password);
      _user = response.user;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String username,
    required String email,
    String? phone,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _authService.register(
        fullName: fullName,
        username: username,
        email: email,
        phone: phone,
        password: password,
      );
      _user = response.user;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> demoLogin(String role) async {
    if (!const bool.fromEnvironment('DEMO_MODE')) {
      _errorMessage = 'Tài khoản mẫu chỉ dùng trong chế độ demo';
      notifyListeners();
      return false;
    }
    String identifier;
    switch (role) {
      case 'FIELD_MECHANIC':
        identifier = 'mechanic@floodrescue.vn';
        break;
      case 'CUSTOMER':
      default:
        identifier = 'customer@floodrescue.vn';
        break;
    }

    return login(identifier, 'Password@123');
  }

  Future<bool> refreshProfile() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _user = await _authService.getCurrentUser();
      return true;
    } catch (e) {
      _errorMessage = 'Không tải được thông tin tài khoản. Vui lòng thử lại.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateProfile({
    required String fullName,
    required String email,
    String? phone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _user = await _authService.updateProfile(
        fullName: fullName,
        email: email,
        phone: phone,
      );
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}

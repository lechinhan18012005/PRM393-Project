import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConstants {
  // Use 10.0.2.2 for Android emulator, 127.0.0.1 for iOS simulator & Web / Desktop
  static String get baseUrl {
    const configuredUrl = String.fromEnvironment('API_BASE_URL');
    if (configuredUrl.isNotEmpty) return configuredUrl;
    if (kIsWeb) {
      return 'http://localhost:8080/api/v1';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:8080/api/v1';
      }
    } catch (_) {}
    return 'http://localhost:8080/api/v1';
  }

  static String get loginUrl => '$baseUrl/auth/login';
  static String get registerUrl => '$baseUrl/auth/register';
  static String get refreshTokenUrl => '$baseUrl/auth/refresh';
  static String get currentUserUrl => '$baseUrl/auth/me';
}

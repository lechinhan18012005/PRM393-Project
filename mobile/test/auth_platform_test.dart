import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/core/services/auth_service.dart';
import 'package:mobile/providers/auth_provider.dart';

Map<String, dynamic> user(String role) => {
  'id': 1,
  'username': 'test',
  'email': 'test@example.com',
  'fullName': 'Test User',
  'role': role,
  'active': true,
};
void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  for (final role in [
    'CUSTOMER',
    'FIELD_MECHANIC',
    'GARAGE_OWNER',
    'STAFF',
    'ADMIN',
  ]) {
    test('Mobile accepts only customer/mechanic: $role', () async {
      final service = AuthService(
        client: MockClient((request) async {
          expect(jsonDecode(request.body)['platform'], 'MOBILE');
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'accessToken': 'access',
                'refreshToken': 'refresh',
                'expiresIn': 60,
                'user': user(role),
              },
            }),
            200,
          );
        }),
      );
      if (['CUSTOMER', 'FIELD_MECHANIC'].contains(role)) {
        expect((await service.login('test', 'password')).user.role, role);
        expect(await service.getToken(), 'access');
      } else {
        await expectLater(service.login('test', 'password'), throwsException);
        expect(await service.getToken(), isNull);
        expect(
          (await SharedPreferences.getInstance()).getString(
            'jwt_refresh_token',
          ),
          isNull,
        );
      }
    });
  }
  test('Restoring unsupported role clears an old mobile session', () async {
    SharedPreferences.setMockInitialValues({
      'jwt_access_token': 'old-token',
      'jwt_refresh_token': 'old-refresh',
    });
    final service = AuthService(
      client: MockClient(
        (request) async => http.Response(
          jsonEncode({'success': true, 'data': user('GARAGE_OWNER')}),
          200,
        ),
      ),
    );
    final provider = AuthProvider(authService: service);
    await provider.checkAuthStatus();
    expect(provider.isAuthenticated, isFalse);
    expect(await service.getToken(), isNull);
  });
  test('Invitation activation does not save a login session', () async {
    final service = AuthService(
      client: MockClient((request) async {
        expect(request.url.path, '/api/v1/onboarding/activate');
        final body = jsonDecode(request.body);
        expect(body['code'], 'invitation');
        expect(body['account'].containsKey('role'), isFalse);
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {'message': 'Activated'},
          }),
          200,
        );
      }),
    );
    await service.activateInvitation(
      code: 'invitation',
      fullName: 'Test',
      username: 'test',
      email: 'test@example.com',
      password: 'password',
    );
    expect(await service.getToken(), isNull);
  });
}

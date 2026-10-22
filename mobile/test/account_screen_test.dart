import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/core/services/auth_service.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/screens/customer/account_screen.dart';
import 'package:mobile/screens/customer/stitch_hydro_rescue_screen.dart';
import 'package:mobile/screens/auth/login_screen.dart';

Map<String, dynamic> profile() => {
  'id': 1,
  'username': 'customer',
  'email': 'customer@example.com',
  'fullName': 'Test Customer',
  'phone': '0912345678',
  'role': 'CUSTOMER',
  'active': true,
};
Future<AuthProvider> provider({bool failUpdate = false}) async {
  SharedPreferences.setMockInitialValues({
    'jwt_access_token': 'access',
    'jwt_refresh_token': 'refresh',
    'user_data': jsonEncode(profile()),
  });
  var current = profile();
  final auth = AuthProvider(
    authService: AuthService(
      client: MockClient((request) async {
        if (request.method == 'PATCH') {
          expect(request.headers['Authorization'], 'Bearer access');
          if (failUpdate) {
            return http.Response(
              jsonEncode({'message': 'Email đã được tài khoản khác sử dụng'}),
              400,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          current = {
            ...current,
            ...jsonDecode(request.body) as Map<String, dynamic>,
          };
        }
        return http.Response(
          jsonEncode({'success': true, 'data': current}),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    ),
  );
  await auth.checkAuthStatus();
  return auth;
}

Future<void> showAccount(WidgetTester tester, AuthProvider auth) async {
  await tester.pumpWidget(
    ChangeNotifierProvider.value(
      value: auth,
      child: MaterialApp(theme: AppTheme.light, home: const AccountScreen()),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Customer can open account from home', (tester) async {
    final auth = await provider();
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: MaterialApp(
          theme: AppTheme.light,
          home: const StitchHydroRescueScreen(),
        ),
      ),
    );
    await tester.tap(find.byKey(const Key('open-account')));
    await tester.pumpAndSettle();
    expect(find.byType(AccountScreen), findsOneWidget);
    expect(find.text('customer@example.com'), findsOneWidget);
  });
  testWidgets('Views and updates profile, then persists it locally', (
    tester,
  ) async {
    final auth = await provider();
    await showAccount(tester, auth);
    expect(find.text('customer'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const Key('account-edit')));
    await tester.tap(find.byKey(const Key('account-edit')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('account-name')),
      'Updated Customer',
    );
    await tester.enterText(
      find.byKey(const Key('account-email')),
      'updated@example.com',
    );
    await tester.ensureVisible(find.byKey(const Key('account-save')));
    await tester.tap(find.byKey(const Key('account-save')));
    await tester.pumpAndSettle();
    expect(auth.user!.fullName, 'Updated Customer');
    expect(find.text('Cập nhật tài khoản thành công'), findsOneWidget);
    final prefs = await SharedPreferences.getInstance();
    expect(
      jsonDecode(prefs.getString('user_data')!)['email'],
      'updated@example.com',
    );
    expect(prefs.getString('jwt_access_token'), 'access');
  });
  testWidgets('API error keeps old profile and edit form', (tester) async {
    final auth = await provider(failUpdate: true);
    await showAccount(tester, auth);
    await tester.ensureVisible(find.byKey(const Key('account-edit')));
    await tester.tap(find.byKey(const Key('account-edit')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('account-email')),
      'duplicate@example.com',
    );
    await tester.ensureVisible(find.byKey(const Key('account-save')));
    await tester.tap(find.byKey(const Key('account-save')));
    await tester.pumpAndSettle();
    expect(auth.user!.email, 'customer@example.com');
    expect(find.text('Email đã được tài khoản khác sử dụng'), findsOneWidget);
    expect(find.byKey(const Key('account-save')), findsOneWidget);
    expect(find.text('Cập nhật tài khoản thành công'), findsNothing);
  });
  testWidgets('Logout removes tokens and navigation history', (tester) async {
    final auth = await provider();
    await showAccount(tester, auth);
    await tester.ensureVisible(find.byKey(const Key('account-logout')));
    await tester.tap(find.byKey(const Key('account-logout')));
    await tester.pumpAndSettle();
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(AccountScreen), findsNothing);
    expect(auth.user, isNull);
    final prefs = await SharedPreferences.getInstance();
    for (final key in ['jwt_access_token', 'jwt_refresh_token', 'user_data']) {
      expect(prefs.getString(key), isNull);
    }
    final context = tester.element(find.byType(LoginScreen));
    expect(Navigator.of(context).canPop(), isFalse);
  });
  testWidgets('Account handles small screens and large text', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final auth = await provider();
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: auth,
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(1.6)),
            child: const AccountScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}

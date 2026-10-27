import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/user_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/logout_dialog.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/screens/auth/login_screen.dart';
import 'package:mobile/screens/customer/stitch_hydro_rescue_screen.dart';
import 'package:mobile/screens/customer/vehicle_profile_screen.dart';
import 'package:mobile/screens/home/garage_home_screen.dart';
import 'package:mobile/screens/home/mechanic_home_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MockAuthProvider extends AuthProvider {
  bool logoutCalled = false;
  UserModel? _mockUser;

  MockAuthProvider({UserModel? user}) {
    _mockUser = user ??
        UserModel(
          id: 1,
          username: 'customer_test',
          email: 'customer@floodrescue.vn',
          fullName: 'Nguyễn Văn Test',
          phone: '0901234567',
          role: 'CUSTOMER',
          active: true,
        );
  }

  @override
  UserModel? get user => _mockUser;

  @override
  bool get isAuthenticated => _mockUser != null;

  @override
  Future<void> logout() async {
    logoutCalled = true;
    _mockUser = null;
    notifyListeners();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({
      'jwt_access_token': 'dummy_access_token',
      'jwt_refresh_token': 'dummy_refresh_token',
      'user_data': '{"id":1,"username":"test","email":"test@vn.vn","role":"CUSTOMER"}',
    });
  });

  group('Logout Feature Tests', () {
    test('AuthProvider.logout clears tokens and user state', () async {
      final authProvider = AuthProvider();
      await authProvider.logout();

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('jwt_access_token'), isNull);
      expect(prefs.getString('jwt_refresh_token'), isNull);
      expect(prefs.getString('user_data'), isNull);
      expect(authProvider.user, isNull);
      expect(authProvider.isAuthenticated, isFalse);
    });

    testWidgets('Logout dialog dismisses when canceled', (tester) async {
      final mockAuth = MockAuthProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: mockAuth),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => showLogoutConfirmationDialog(context),
                  child: const Text('Open Logout Dialog'),
                ),
              ),
            ),
          ),
        ),
      );

      // Tap button to open dialog
      await tester.tap(find.text('Open Logout Dialog'));
      await tester.pumpAndSettle();

      // Verify dialog is shown
      expect(find.text('Xác nhận đăng xuất'), findsOneWidget);
      expect(
        find.text('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?'),
        findsOneWidget,
      );

      // Tap "Hủy"
      await tester.tap(find.text('Hủy'));
      await tester.pumpAndSettle();

      // Verify dialog is closed and logout was not called
      expect(find.text('Xác nhận đăng xuất'), findsNothing);
      expect(mockAuth.logoutCalled, isFalse);
      expect(mockAuth.isAuthenticated, isTrue);
    });

    testWidgets('Logout dialog proceeds when confirmed', (tester) async {
      final mockAuth = MockAuthProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: mockAuth),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => showLogoutConfirmationDialog(context),
                  child: const Text('Open Logout Dialog'),
                ),
              ),
            ),
          ),
        ),
      );

      // Tap button to open dialog
      await tester.tap(find.text('Open Logout Dialog'));
      await tester.pumpAndSettle();

      // Tap "Đăng xuất" in dialog
      final logoutButton = find.widgetWithText(FilledButton, 'Đăng xuất');
      expect(logoutButton, findsOneWidget);
      await tester.tap(logoutButton);
      await tester.pumpAndSettle();

      // Verify logout called and navigated to LoginScreen
      expect(mockAuth.logoutCalled, isTrue);
      expect(find.byType(LoginScreen), findsOneWidget);
    });

    testWidgets('StitchHydroRescueScreen (Customer) has working logout button', (tester) async {
      final mockAuth = MockAuthProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: mockAuth),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const StitchHydroRescueScreen(),
          ),
        ),
      );

      final logoutBtn = find.byKey(const Key('customer-logout-btn'));
      expect(logoutBtn, findsOneWidget);

      await tester.tap(logoutBtn);
      await tester.pumpAndSettle();

      expect(find.text('Xác nhận đăng xuất'), findsOneWidget);

      final confirmBtn = find.widgetWithText(FilledButton, 'Đăng xuất');
      await tester.tap(confirmBtn);
      await tester.pumpAndSettle();

      expect(mockAuth.logoutCalled, isTrue);
      expect(find.byType(LoginScreen), findsOneWidget);
    });

    testWidgets('GarageHomeScreen has working logout button', (tester) async {
      final mockAuth = MockAuthProvider(
        user: UserModel(
          id: 2,
          username: 'garage_test',
          email: 'garage@floodrescue.vn',
          fullName: 'Gara Test',
          phone: '0901111222',
          role: 'GARAGE_OWNER',
          active: true,
        ),
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: mockAuth),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const GarageHomeScreen(),
          ),
        ),
      );

      final logoutBtn = find.byKey(const Key('garage-logout-btn'));
      expect(logoutBtn, findsOneWidget);

      await tester.tap(logoutBtn);
      await tester.pumpAndSettle();

      expect(find.text('Xác nhận đăng xuất'), findsOneWidget);
    });

    testWidgets('MechanicHomeScreen has working logout button', (tester) async {
      final mockAuth = MockAuthProvider(
        user: UserModel(
          id: 3,
          username: 'mechanic_test',
          email: 'mechanic@floodrescue.vn',
          fullName: 'Thợ Test',
          phone: '0903333444',
          role: 'FIELD_MECHANIC',
          active: true,
        ),
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: mockAuth),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const MechanicHomeScreen(),
          ),
        ),
      );

      final logoutBtn = find.byKey(const Key('mechanic-logout-btn'));
      expect(logoutBtn, findsOneWidget);

      await tester.tap(logoutBtn);
      await tester.pumpAndSettle();

      expect(find.text('Xác nhận đăng xuất'), findsOneWidget);
    });

    testWidgets('VehicleProfileScreen has working logout buttons', (tester) async {
      final mockAuth = MockAuthProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: mockAuth),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const VehicleProfileScreen(),
          ),
        ),
      );

      expect(find.byKey(const Key('vehicle-profile-logout-btn')), findsOneWidget);
      expect(find.byKey(const Key('logout-button-vehicle-profile')), findsOneWidget);

      await tester.tap(find.byKey(const Key('vehicle-profile-logout-btn')));
      await tester.pumpAndSettle();

      expect(find.text('Xác nhận đăng xuất'), findsOneWidget);
    });
  });
}

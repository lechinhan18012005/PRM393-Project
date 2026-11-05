import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/screens/auth/login_screen.dart';
import 'package:provider/provider.dart';

void main() {
  Widget buildLoginScreen() {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: const MaterialApp(home: LoginScreen()),
    );
  }

  testWidgets('login only shows email or phone and password fields', (
    tester,
  ) async {
    await tester.pumpWidget(buildLoginScreen());

    expect(find.text('Bạn là'), findsNothing);
    expect(find.text('Chủ xe'), findsNothing);
    expect(find.text('Thợ cơ động'), findsNothing);
    expect(find.byKey(const Key('login-identifier')), findsOneWidget);
    expect(find.byKey(const Key('login-password')), findsOneWidget);

    final identifierDecoration = tester.widget<InputDecorator>(
      find.descendant(
        of: find.byKey(const Key('login-identifier')),
        matching: find.byType(InputDecorator),
      ),
    );
    expect(identifierDecoration.decoration.hintText, isNull);
  });

  testWidgets('login validates identifier and password before submitting', (
    tester,
  ) async {
    await tester.pumpWidget(buildLoginScreen());

    await tester.enterText(
      find.byKey(const Key('login-identifier')),
      'plain_username',
    );
    await tester.enterText(find.byKey(const Key('login-password')), '12345');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Đăng nhập'));
    await tester.pump();

    expect(find.text('Số điện thoại hoặc email không hợp lệ'), findsOneWidget);
    expect(find.text('Mật khẩu phải từ 6 đến 128 ký tự'), findsOneWidget);
  });
}

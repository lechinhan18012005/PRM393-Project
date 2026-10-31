import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/models/user_model.dart';
import 'package:mobile/core/models/mechanic_staff_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/mechanic_provider.dart';
import 'package:mobile/screens/home/mechanic_home_screen.dart';
import 'package:mobile/screens/customer/account_screen.dart';
import 'package:mobile/screens/mechanic/quotation_builder_screen.dart';
import 'package:mobile/screens/mechanic/repair_execution_screen.dart';

class _Auth extends AuthProvider {
  @override
  UserModel get user => UserModel(
    id: 1,
    username: 'mechanic',
    email: 'mechanic@example.com',
    fullName: 'Võ Đức Hưng',
    role: 'FIELD_MECHANIC',
    active: true,
  );
  @override
  Future<bool> refreshProfile() async => true;
}

class _Mechanic extends MechanicProvider {
  _Mechanic({this.fail = false, this.status = 'AVAILABLE'});
  final bool fail;
  String status;
  int calls = 0;
  @override
  MechanicStaffModel get myProfile => MechanicStaffModel(
    id: 1,
    userId: 1,
    username: 'mechanic',
    fullName: 'Võ Đức Hưng',
    garageId: 1,
    garageName: 'Gara Toàn Thắng',
    branchName: 'Chi nhánh Quận 7',
    branchAddress: '85 Huỳnh Tấn Phát, Quận 7',
    shiftName: 'Ca sáng · 06:00 – 14:00',
    workingStatus: status,
  );
  @override
  String? get errorMessage => fail ? 'Không thể đổi trạng thái' : null;
  @override
  Future<void> fetchMyProfile() async {}
  @override
  Future<bool> toggleStatus({
    required String status,
    double? latitude,
    double? longitude,
    String? pauseReason,
  }) async {
    calls++;
    expect(latitude, isNull);
    expect(longitude, isNull);
    if (!fail) {
      this.status = status;
      notifyListeners();
    }
    return !fail;
  }
}

const _capture = bool.fromEnvironment('CAPTURE_UI');
final _captureKey = GlobalKey();
Future<void> _show(
  WidgetTester tester, {
  Widget screen = const MechanicHomeScreen(),
  _Mechanic? mechanic,
  double width = 390,
  double scale = 1,
}) async {
  tester.view.physicalSize = Size(width, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: _Auth()),
        ChangeNotifierProvider<MechanicProvider>.value(
          value: mechanic ?? _Mechanic(),
        ),
      ],
      child: RepaintBoundary(
        key: _captureKey,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light.copyWith(
            appBarTheme: _capture
                ? AppTheme.light.appBarTheme.copyWith(
                    titleTextStyle: AppTheme.light.appBarTheme.titleTextStyle
                        ?.copyWith(fontFamily: 'Preview'),
                  )
                : AppTheme.light.appBarTheme,
            textTheme: _capture
                ? AppTheme.light.textTheme.apply(fontFamily: 'Preview')
                : AppTheme.light.textTheme,
          ),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: screen,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() async {
    if (_capture) {
      final bytes = await File(
        '${Platform.environment['WINDIR'] ?? 'C:/Windows'}/Fonts/segoeui.ttf',
      ).readAsBytes();
      await (FontLoader(
        'Ahem',
      )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
      final icons = await rootBundle.load('fonts/MaterialIcons-Regular.otf');
      await (FontLoader('MaterialIcons')..addFont(Future.value(icons))).load();
      await (FontLoader(
        'Preview',
      )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
    }
  });
  testWidgets('Bottom navigation remains available across all five tabs', (
    tester,
  ) async {
    await _show(tester);
    expect(find.byType(NavigationBar), findsOneWidget);
    if (_capture) {
      final boundary =
          _captureKey.currentContext!.findRenderObject()!
              as RenderRepaintBoundary;
      await tester.runAsync(() async {
        final image = await boundary.toImage(pixelRatio: 2);
        final data = await image.toByteData(format: ui.ImageByteFormat.png);
        await Directory('../docs/ui-preview').create(recursive: true);
        await File('../docs/ui-preview/mechanic-overview.png')
            .writeAsBytes(data!.buffer.asUint8List());
      });
    }
    for (final label in [
      'Công việc',
      'Ca trực',
      'Công cụ',
      'Tài khoản',
      'Tổng quan',
    ]) {
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text(label),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('Tài khoản'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(AccountScreen), findsOneWidget);
    expect(find.text('mechanic@example.com'), findsOneWidget);
  });
  testWidgets('Availability reflects successful server result', (tester) async {
    final p = _Mechanic();
    await _show(tester, mechanic: p);
    await tester.ensureVisible(find.byType(Switch));
    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    expect(p.status, 'OFFLINE');
    expect(p.calls, 1);
    expect(find.text('Đã chuyển sang trạng thái tạm nghỉ.'), findsOneWidget);
  });
  testWidgets('Failed availability does not report success', (tester) async {
    final p = _Mechanic(fail: true);
    await _show(tester, mechanic: p);
    await tester.ensureVisible(find.byType(Switch));
    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    expect(p.status, 'AVAILABLE');
    expect(p.calls, 1);
    expect(find.text('Đã chuyển sang trạng thái tạm nghỉ.'), findsNothing);
    expect(find.text('Không thể đổi trạng thái'), findsWidgets);
  });
  testWidgets('Busy mechanic cannot toggle availability', (tester) async {
    final p = _Mechanic(status: 'BUSY');
    await _show(tester, mechanic: p);
    expect(tester.widget<Switch>(find.byType(Switch)).onChanged, isNull);
    expect(p.calls, 0);
  });
  testWidgets('Quotation total follows selected services', (tester) async {
    await _show(tester, screen: const QuotationBuilderScreen());
    await tester.scrollUntilVisible(
      find.byKey(const Key('quotation-total')),
      200,
    );
    expect(find.text('290.000 đ'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Sấy bugi & xả nước buồng đốt'),
      -200,
    );
    await tester.tap(find.text('Sấy bugi & xả nước buồng đốt'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('quotation-total')),
      200,
    );
    expect(find.text('220.000 đ'), findsOneWidget);
  });
  testWidgets('Repair requires completing checklist before handover', (
    tester,
  ) async {
    await _show(tester, screen: const RepairExecutionScreen());
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    await tester.ensureVisible(find.text('Khởi động và kiểm tra vận hành'));
    await tester.tap(find.text('Khởi động và kiểm tra vận hành'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNotNull,
    );
  });
  testWidgets('Mechanic tabs fit narrow screen with larger text', (
    tester,
  ) async {
    await _show(tester, width: 320, scale: 1.6);
    for (final label in [
      'Công việc',
      'Ca trực',
      'Công cụ',
      'Tài khoản',
      'Tổng quan',
    ]) {
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text(label),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    }
  });
}

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/models/user_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/flood_report_provider.dart';
import 'package:mobile/screens/customer/stitch_hydro_rescue_screen.dart';
import 'package:mobile/screens/customer/service_selection_screen.dart';
import 'package:mobile/screens/customer/account_screen.dart';

class _Auth extends AuthProvider {
  @override
  UserModel get user => UserModel(
    id: 1,
    username: 'customer',
    email: 'customer@example.com',
    fullName: 'Minh Anh',
    role: 'CUSTOMER',
    active: true,
  );
  @override
  Future<bool> refreshProfile() async => true;
}

class _Flood extends FloodReportProvider {
  _Flood({this.fail = false});
  final bool fail;
  int loads = 0;
  @override
  String? get errorMessage => fail ? 'Không thể kết nối máy chủ' : null;
  @override
  Future<void> fetchActiveFloodPoints() async {
    loads++;
  }
}

const _capture = bool.fromEnvironment('CAPTURE_CUSTOMER_UI');
final _previewKey = GlobalKey();
Future<void> _mount(
  WidgetTester tester, {
  _Flood? flood,
  double width = 390,
  double scale = 1,
}) async {
  tester.view.physicalSize = Size(width, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  var theme = AppTheme.light;
  if (_capture) {
    theme = theme.copyWith(
      textTheme: theme.textTheme.apply(fontFamily: 'Preview'),
      appBarTheme: theme.appBarTheme.copyWith(
        titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
          fontFamily: 'Preview',
        ),
      ),
    );
  }
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: _Auth()),
        ChangeNotifierProvider<FloodReportProvider>.value(
          value: flood ?? _Flood(),
        ),
      ],
      child: RepaintBoundary(
        key: _previewKey,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: theme,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: const StitchHydroRescueScreen(),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _tab(WidgetTester tester, String label) async {
  await tester.tap(
    find.descendant(of: find.byType(NavigationBar), matching: find.text(label)),
  );
  await tester.pumpAndSettle();
}

Future<void> _screenshot(WidgetTester tester, String name) async {
  if (!_capture) return;
  final boundary =
      _previewKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory('../docs/ui-preview').create(recursive: true);
    await File('../docs/ui-preview/$name.png')
        .writeAsBytes(data!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  setUpAll(() async {
    if (_capture) {
      final bytes = await File(
        '${Platform.environment['WINDIR'] ?? 'C:/Windows'}/Fonts/segoeui.ttf',
      ).readAsBytes();
      await (FontLoader(
        'Preview',
      )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
      final icons = await rootBundle.load('fonts/MaterialIcons-Regular.otf');
      await (FontLoader('MaterialIcons')..addFont(Future.value(icons))).load();
    }
  });
  testWidgets(
    'Reassemble preserves selected tab and navigation remains usable',
    (tester) async {
      final flood = _Flood();
      await _mount(tester, flood: flood);
      await _tab(tester, 'Bản đồ');
      tester.binding.buildOwner!.reassemble(tester.binding.rootElement!);
      await tester.pumpAndSettle();
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        1,
      );
      expect(flood.loads, 1);
      await _tab(tester, 'Trang chủ');
      await _tab(tester, 'Xe của tôi');
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        3,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'Customer tabs retain bottom navigation and fetch map only on first visit',
    (tester) async {
      final flood = _Flood();
      await _mount(tester, flood: flood);
      expect(flood.loads, 0);
      await _screenshot(tester, 'customer-overview');
      for (final label in [
        'Bản đồ',
        'Lịch sử',
        'Xe của tôi',
        'Tài khoản',
        'Trang chủ',
      ]) {
        await _tab(tester, label);
        expect(find.byType(NavigationBar), findsOneWidget);
        expect(tester.takeException(), isNull);
        if (label == 'Xe của tôi') {
          await _screenshot(tester, 'customer-vehicles');
        }
        if (label == 'Lịch sử') await _screenshot(tester, 'customer-history');
      }
      expect(flood.loads, 1);
      await _tab(tester, 'Bản đồ');
      expect(flood.loads, 1);
      await _tab(tester, 'Tài khoản');
      expect(find.byType(AccountScreen), findsOneWidget);
      expect(find.text('customer@example.com'), findsOneWidget);
    },
  );
  testWidgets(
    'Selected vehicle stays in sync between tab, home and service selection',
    (tester) async {
      await _mount(tester);
      await _tab(tester, 'Xe của tôi');
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('select-vehicle-1')),
        200,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('select-vehicle-1')));
      await tester.pumpAndSettle();
      await _tab(tester, 'Trang chủ');
      expect(find.text('Yamaha Exciter 150'), findsOneWidget);
      expect(find.text('59-S3 481.09'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('request-rescue')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('request-rescue')));
      await tester.pumpAndSettle();
      expect(find.byType(ServiceSelectionScreen), findsOneWidget);
      expect(
        tester
            .widget<ServiceSelectionScreen>(find.byType(ServiceSelectionScreen))
            .vehicleName,
        'Yamaha Exciter 150',
      );
    },
  );
  testWidgets('History filters do not show unrelated sample orders', (
    tester,
  ) async {
    await _mount(tester);
    await _tab(tester, 'Lịch sử');
    await tester.tap(find.text('Sửa tại chỗ'));
    await tester.pumpAndSettle();
    expect(find.text('#PRM-8924'), findsOneWidget);
    expect(find.text('#PRM-8201'), findsNothing);
    expect(find.text('#PRM-7819'), findsNothing);
    await tester.tap(find.text('Vận chuyển'));
    await tester.pumpAndSettle();
    expect(find.text('#PRM-8924'), findsNothing);
    expect(find.text('#PRM-8201'), findsOneWidget);
  });
  testWidgets(
    'Failed map load displays an error rather than a safe-road claim',
    (tester) async {
      await _mount(tester, flood: _Flood(fail: true));
      await _tab(tester, 'Bản đồ');
      await tester.scrollUntilVisible(
        find.text('Chưa cập nhật được điểm ngập'),
        200,
        scrollable: find.byWidgetPredicate(
          (widget) =>
              widget is Scrollable &&
              widget.axisDirection == AxisDirection.down,
        ),
      );
      expect(find.text('Chưa cập nhật được điểm ngập'), findsOneWidget);
      expect(
        find.text('Không có điểm ngập nào theo tiêu chí này!'),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('All customer tabs fit 320px with larger text', (tester) async {
    await _mount(tester, width: 320, scale: 1.6);
    for (final label in [
      'Bản đồ',
      'Lịch sử',
      'Xe của tôi',
      'Tài khoản',
      'Trang chủ',
    ]) {
      await _tab(tester, label);
      expect(tester.takeException(), isNull);
    }
  });
}

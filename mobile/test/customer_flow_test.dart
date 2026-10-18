import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/screens/customer/stitch_hydro_rescue_screen.dart';
import 'package:mobile/screens/customer/service_selection_screen.dart';
import 'package:mobile/screens/customer/radar_dispatch_screen.dart';

void main() {
  testWidgets('Choose vehicle and open rescue services', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(theme: AppTheme.light, home: const StitchHydroRescueScreen()),
    );
    await tester.tap(find.byKey(const Key('choose-vehicle')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Yamaha Exciter 150'));
    await tester.pumpAndSettle();
    expect(find.text('Yamaha Exciter 150'), findsOneWidget);
    expect(find.text('59-S3 481.09'), findsOneWidget);
    await tester.tap(find.byKey(const Key('request-rescue')));
    await tester.pumpAndSettle();
    expect(find.byType(ServiceSelectionScreen), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('service-1')));
    await tester.pumpAndSettle();
    final details = find.text('Dịch vụ bao gồm những gì?');
    await tester.ensureVisible(details);
    await tester.tap(details);
    await tester.pumpAndSettle();
    expect(find.textContaining('Phụ tùng phát sinh'), findsOneWidget);
    await tester.tap(find.text('Tìm cứu hộ'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byType(RadarDispatchScreen), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  for (final screen in [
    const StitchHydroRescueScreen(),
    const ServiceSelectionScreen(),
  ]) {
    testWidgets('Large text on a small phone: ${screen.runtimeType}', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(1.4)),
            child: child!,
          ),
          home: screen,
        ),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}

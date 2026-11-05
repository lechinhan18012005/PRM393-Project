import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/models/vehicle_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/providers/flood_report_provider.dart';
import 'package:mobile/providers/vehicle_provider.dart';
import 'package:mobile/screens/customer/stitch_hydro_rescue_screen.dart';
import 'package:mobile/screens/customer/service_selection_screen.dart';

class _FlowFlood extends FloodReportProvider {
  @override
  Future<void> fetchActiveFloodPoints() async {}
}

class _FlowVehicle extends VehicleProvider {
  _FlowVehicle() {
    _vehicles = [
      const VehicleModel(
        id: 1,
        licensePlate: '59-B1 892.44',
        brand: 'Honda',
        model: 'SH 150i',
        vehicleType: 'SCOOTER',
      ),
      const VehicleModel(
        id: 2,
        licensePlate: '59-S3 481.09',
        brand: 'Yamaha',
        model: 'Exciter 150',
        vehicleType: 'CLUTCH',
      ),
      const VehicleModel(
        id: 3,
        licensePlate: '59-X1 204.88',
        brand: 'Honda',
        model: 'Wave Alpha',
        vehicleType: 'MANUAL',
      ),
    ];
    _selectedVehicle = _vehicles.first;
  }

  List<VehicleModel> _vehicles = [];
  VehicleModel? _selectedVehicle;

  @override
  List<VehicleModel> get vehicles => _vehicles;

  @override
  VehicleModel? get selectedVehicle => _selectedVehicle;

  @override
  void selectVehicle(VehicleModel vehicle) {
    _selectedVehicle = vehicle;
    notifyListeners();
  }

  @override
  Future<void> fetchVehicles() async {}
}

Widget _wrap(Widget child, {TextScaler? textScaler}) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<FloodReportProvider>.value(value: _FlowFlood()),
      ChangeNotifierProvider<VehicleProvider>.value(value: _FlowVehicle()),
    ],
    child: MaterialApp(
      theme: AppTheme.light,
      builder: textScaler != null
          ? (context, c) => MediaQuery(
              data: MediaQuery.of(context).copyWith(textScaler: textScaler),
              child: c!,
            )
          : null,
      home: child,
    ),
  );
}

void main() {
  testWidgets('Choose vehicle and open rescue services', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(_wrap(const StitchHydroRescueScreen()));
    expect(find.text('Dịch vụ hỗ trợ'), findsNothing);
    await tester.tap(find.byKey(const Key('choose-vehicle')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Yamaha Exciter 150'));
    await tester.pumpAndSettle();
    expect(find.text('Yamaha Exciter 150'), findsOneWidget);
    expect(find.text('59-S3 481.09'), findsOneWidget);
    await tester.tap(find.byKey(const Key('request-rescue')));
    await tester.pumpAndSettle();
    expect(find.byType(ServiceSelectionScreen), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Bạn cần hỗ trợ gì?')).dy,
      lessThan(
        tester.getTopLeft(find.textContaining('Phương tiện đang chọn')).dy,
      ),
    );
    expect(find.text('Chở xe qua điểm ngập'), findsOneWidget);
    expect(find.text('Đi chuyến riêng'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('crossing-group')));
    await tester.tap(find.byKey(const ValueKey('crossing-group')));
    await tester.pumpAndSettle();
    expect(find.text('Số lượng xe trong chuyến gom'), findsOneWidget);
    expect(find.byKey(const ValueKey('group-vehicle-count-2')), findsOneWidget);
    expect(find.byKey(const ValueKey('group-vehicle-count-6')), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('service-1')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('service-1')));
    await tester.pumpAndSettle();
    final details = find.text('Dịch vụ bao gồm những gì?');
    await tester.ensureVisible(details);
    await tester.tap(details);
    await tester.pumpAndSettle();
    expect(find.textContaining('hư hỏng nặng'), findsOneWidget);
    await tester.tap(find.text('Tìm cứu hộ'));
    await tester.pumpAndSettle();
    expect(find.byType(ServiceSelectionScreen), findsOneWidget);
    expect(
      find.text(
        'Vui lòng chọn một gara cứu hộ khả dụng trước khi gửi yêu cầu!',
      ),
      findsOneWidget,
    );
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
        _wrap(screen, textScaler: const TextScaler.linear(1.4)),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}

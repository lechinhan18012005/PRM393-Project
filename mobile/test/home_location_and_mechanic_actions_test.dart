import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/rescue_order_model.dart';
import 'package:mobile/core/services/location_service.dart';
import 'package:mobile/core/services/rescue_service.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/flood_report_provider.dart';
import 'package:mobile/providers/mechanic_provider.dart';
import 'package:mobile/providers/vehicle_provider.dart';
import 'package:mobile/screens/customer/stitch_hydro_rescue_screen.dart';
import 'package:mobile/screens/customer/live_tracking_screen.dart';
import 'package:mobile/screens/home/mechanic_home_screen.dart';
import 'package:provider/provider.dart';

class _NoopFloodReportProvider extends FloodReportProvider {
  @override
  Future<void> fetchActiveFloodPoints() async {}
}

class _NoopVehicleProvider extends VehicleProvider {
  @override
  Future<void> fetchVehicles() async {}
}

class _CompletedOrderRescueService extends RescueService {
  var trackingRequestCount = 0;

  @override
  Future<RescueOrderModel> getOrderById(int orderId) async {
    return RescueOrderModel.fromJson({
      'id': orderId,
      'orderCode': 'SOS-COMPLETED',
      'orderType': 'ONSITE_REPAIR',
      'status': 'COMPLETED',
      'customerId': 1,
      'customerName': 'Khách hàng',
      'garageId': 2,
      'garageName': 'Gara TEST',
      'mechanicName': 'Thợ TEST',
      'serviceItemId': 3,
      'pickupAddress': '118 Tân Hương, Tân Phú',
      'pickupLatitude': 10.7897,
      'pickupLongitude': 106.6269,
      'totalAmount': 150000,
    });
  }

  @override
  Future<TrackingSnapshotModel> getTrackingSnapshot(int orderId) async {
    trackingRequestCount += 1;
    throw StateError('Không được tải GPS cho đơn đã hoàn tất');
  }
}

void main() {
  testWidgets('mechanic overview does not show the demo catalog shortcut', (
    tester,
  ) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => MechanicProvider()),
        ],
        child: const MaterialApp(home: MechanicHomeScreen()),
      ),
    );
    await tester.pump();

    expect(find.byIcon(Icons.apps_rounded), findsNothing);
    expect(find.byTooltip('Khám phá ứng dụng mẫu'), findsNothing);

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('customer home displays coordinates returned by device GPS', (
    tester,
  ) async {
    final previousLocationService = LocationService.instance;
    final fakeDeviceLocation = MockLocationService()
      ..mockedLocation = LocationData(
        latitude: 21.028511,
        longitude: 105.804817,
        accuracyMeters: 6,
        timestamp: DateTime.now(),
      );
    LocationService.instance = fakeDeviceLocation;
    addTearDown(() => LocationService.instance = previousLocationService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<FloodReportProvider>.value(
            value: _NoopFloodReportProvider(),
          ),
          ChangeNotifierProvider<VehicleProvider>.value(
            value: _NoopVehicleProvider(),
          ),
        ],
        child: const MaterialApp(home: StitchHydroRescueScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Điểm cứu hộ mẫu'), findsNothing);
    expect(find.text('Vị trí GPS hiện tại'), findsOneWidget);
    expect(find.textContaining('21.028511, 105.804817'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('customer tracking no longer displays a dropoff point', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: LiveTrackingScreen()));
    await tester.pump();

    expect(find.textContaining('Điểm trả'), findsNothing);

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('completed order no longer requests or displays GPS tracking', (
    tester,
  ) async {
    final rescueService = _CompletedOrderRescueService();

    await tester.pumpWidget(
      MaterialApp(
        home: LiveTrackingScreen(orderId: 617, rescueService: rescueService),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Hoàn tất ca cứu hộ'), findsOneWidget);
    expect(find.textContaining('Đang chờ tọa độ GPS'), findsNothing);
    expect(find.textContaining('Đang thu thập thêm dữ liệu GPS'), findsNothing);
    expect(find.textContaining('Khoảng cách đến điểm đón'), findsNothing);
    expect(rescueService.trackingRequestCount, 0);

    await tester.pumpWidget(const SizedBox.shrink());
  });
}

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/services/location_service.dart';
import 'package:mobile/providers/rescue_provider.dart';
import 'package:mobile/screens/customer/service_selection_screen.dart';
import 'package:mobile/features/batch_transport/batch_trip_api.dart';
import 'package:mobile/features/batch_transport/batch_trip_models.dart';
import 'package:mobile/screens/mechanic/route_navigation_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class _CaptureRescue extends RescueProvider {
  double? latitude;
  double? longitude;

  @override
  Future<void> loadCrossingOptions({
    double? pickupLatitude,
    double? pickupLongitude,
  }) async {
    latitude = pickupLatitude;
    longitude = pickupLongitude;
  }
}

class _EmptyBatchTripApi extends BatchTripApi {
  @override
  Future<List<BatchTripModel>> nearby(
    double lat,
    double lng, {
    double radiusKm = 5,
    int? garageId,
    double? destinationLatitude,
    double? destinationLongitude,
  }) async => const [];
}

class _DynamicSensorLocation extends MockLocationService {
  bool lost = false;
  LocationData? currentFix;

  @override
  Future<LocationData?> getCurrentLocation() async => lost ? null : currentFix;
}

void main() {
  group('Round 4 GPS & Location Regression Tests', () {
    testWidgets(
      'Issue 2 Fix: GPS fix is preserved and passes actual coordinates to garage query',
      (tester) async {
        final previous = LocationService.instance;
        LocationService.instance = MockLocationService()
          ..mockedLocation = LocationData(
            latitude: 21.0278,
            longitude: 105.8342,
            accuracyMeters: 5,
            timestamp: DateTime.now(),
          );
        addTearDown(() => LocationService.instance = previous);

        tester.view.physicalSize = const Size(390, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        final rescue = _CaptureRescue();
        await tester.pumpWidget(
          ChangeNotifierProvider<RescueProvider>.value(
            value: rescue,
            child: MaterialApp(
              home: ServiceSelectionScreen(batchTripApi: _EmptyBatchTripApi()),
            ),
          ),
        );
        await tester.pumpAndSettle();

        await tester.ensureVisible(find.text('Định vị GPS thực tế'));
        await tester.tap(find.text('Định vị GPS thực tế'));
        await tester.pumpAndSettle();

        final address = tester
            .widget<TextField>(find.byType(TextField).first)
            .controller!
            .text;
        expect(address, contains('21.0278'));
        expect(address, contains('105.8342'));

        // Tọa độ truyền vào loadCrossingOptions phải là tọa độ GPS thật (21.0278, 105.8342),
        // KHÔNG bị listener ghi đè về điểm mẫu (10.7385, 106.7215)
        expect(rescue.latitude, 21.0278);
        expect(rescue.longitude, 105.8342);

        await tester.pumpWidget(const SizedBox.shrink());
      },
    );

    test('Issue 3 Fix: Production address resolver returns null for unverified/unrelated addresses', () {
      final service = DeviceLocationService();

      // Địa chỉ lạ ở thành phố khác không có tọa độ rõ ràng phải trả về null
      final a = service.resolveAddressCoordinates(
        'Hoan Kiem Ha Noi',
        isDropoff: true,
      );
      final b = service.resolveAddressCoordinates(
        'Hai Chau Da Nang',
        isDropoff: true,
      );
      expect(a, isNull);
      expect(b, isNull);

      // Địa chỉ chứa tọa độ rõ ràng dạng "(lat, lon)" được phân tích chính xác
      final parsed = service.resolveAddressCoordinates(
        'Tọa độ GPS thiết bị (21.0278, 105.8342)',
      );
      expect(parsed, isNotNull);
      expect(parsed!.latitude, closeTo(21.0278, 0.0001));
      expect(parsed.longitude, closeTo(105.8342, 0.0001));

      // MockLocationService cũng không tự gán tọa độ giả cho địa chỉ lạ
      final mock = MockLocationService();
      final mockUnknown = mock.resolveAddressCoordinates('Hoan Kiem Ha Noi');
      expect(mockUnknown, isNull);

      // Nhưng nhận diện đúng các điểm demo đã định nghĩa
      final mockKnown = mock.resolveAddressCoordinates('85 Huỳnh Tấn Phát');
      expect(mockKnown, isNotNull);
      expect(mockKnown!.latitude, closeTo(10.7385, 0.001));
    });

    testWidgets(
      'Issue 4 Fix: Lost or stale GPS halts location POST and uses genuine sensor timestamp',
      (tester) async {
        SharedPreferences.setMockInitialValues({});
        final previous = LocationService.instance;
        final sensorTime = DateTime.now().subtract(const Duration(seconds: 5));
        final sensor = _DynamicSensorLocation()
          ..currentFix = LocationData(
            latitude: 10.7123,
            longitude: 106.7456,
            accuracyMeters: 5.0,
            timestamp: sensorTime,
          );
        LocationService.instance = sensor;
        addTearDown(() => LocationService.instance = previous);

        tester.view.physicalSize = const Size(390, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        final posts = <Map<String, dynamic>>[];

        await http.runWithClient(
          () async {
            await tester.pumpWidget(
              const MaterialApp(home: RouteNavigationScreen(orderId: 42)),
            );
            await tester.pumpAndSettle();

            // Ban đầu có GPS hợp lệ -> Phải có 1 bản tin POST
            expect(posts.length, 1);
            expect(posts.first['latitude'], 10.7123);
            expect(posts.first['longitude'], 106.7456);

            // recordedAt gửi lên phải khớp với timestamp của sensor, không phải DateTime.now() bịa đặt
            final sentAt = DateTime.parse(posts.first['recordedAt'] as String);
            expect(
              sentAt.difference(sensorTime).inSeconds.abs(),
              lessThanOrEqualTo(1),
            );

            // Tình huống mất GPS hoàn toàn (hầm chui, nhà cao tầng, tắt GPS)
            sensor.lost = true;
            final countAfterLost = posts.length;

            // Cho timer chạy 8 giây
            await tester.pump(const Duration(seconds: 8));
            await tester.pumpAndSettle();

            // Không được tiếp tục gửi tọa độ cache với timestamp mới
            expect(posts.length, countAfterLost);
            expect(find.textContaining('Mất tín hiệu GPS'), findsWidgets);

            // Thử bấm "Đã đến điểm đón" khi mất GPS -> Bị chặn với thông báo lỗi
            await tester.tap(
              find.text('Đã đến điểm đón · Tiếp nhận xe (<30m)'),
            );
            await tester.pumpAndSettle();
            expect(find.textContaining('Mất tín hiệu GPS'), findsWidgets);

            // Tình huống GPS có lại nhưng dữ liệu cũ (>30 giây trước)
            sensor.lost = false;
            sensor.currentFix = LocationData(
              latitude: 10.7123,
              longitude: 106.7456,
              accuracyMeters: 5.0,
              timestamp: DateTime.now().subtract(const Duration(seconds: 45)),
            );

            await tester.pump(const Duration(seconds: 8));
            await tester.pumpAndSettle();

            // Tín hiệu cũ (>30s) cũng không được gửi lên server
            expect(posts.length, countAfterLost);
            expect(
              find.textContaining('Tín hiệu GPS bị cũ (>30s)'),
              findsOneWidget,
            );

            // Tình huống GPS nhận được mẫu mới hợp lệ (<5s)
            final freshTime = DateTime.now();
            sensor.currentFix = LocationData(
              latitude: 10.7125,
              longitude: 106.7458,
              accuracyMeters: 4.0,
              timestamp: freshTime,
            );

            await tester.pump(const Duration(seconds: 8));
            await tester.pumpAndSettle();

            // Đã gửi bản tin mới với tọa độ và timestamp mới
            expect(posts.length, greaterThan(countAfterLost));
            expect(posts.last['latitude'], 10.7125);
            final freshSentAt = DateTime.parse(
              posts.last['recordedAt'] as String,
            );
            expect(
              freshSentAt.difference(freshTime).inSeconds.abs(),
              lessThanOrEqualTo(1),
            );

            await tester.pumpWidget(const SizedBox.shrink());
          },
          () => MockClient((request) async {
            if (request.method == 'GET') {
              return http.Response(
                jsonEncode({
                  'success': true,
                  'data': {
                    'id': 42,
                    'customerId': 1,
                    'garageId': 2,
                    'serviceItemId': 3,
                    'status': 'DISPATCHED',
                    'pickupLatitude': 10.7123,
                    'pickupLongitude': 106.7456,
                    'pickupAddress': '85 Huynh Tan Phat',
                    'dropoffAddress': 'Cau Phu My',
                    'dropoffLatitude': 10.7490,
                    'dropoffLongitude': 106.7290,
                  },
                }),
                200,
                headers: {'content-type': 'application/json; charset=utf-8'},
              );
            }
            posts.add(jsonDecode(request.body) as Map<String, dynamic>);
            return http.Response(
              jsonEncode({
                'success': true,
                'data': {'orderId': 42},
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }),
        );
      },
    );
  });
}

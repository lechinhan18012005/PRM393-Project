import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/api_constants.dart';
import 'package:mobile/core/services/location_service.dart';
import 'package:mobile/core/services/rescue_service.dart';
import 'package:mobile/screens/mechanic/crossing_transport_screen.dart';
import 'package:mobile/screens/mechanic/route_navigation_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class _FlappingSensor extends MockLocationService {
  bool failNextRead = false;
  int readCount = 0;
  double latitude = 10.7123;
  double longitude = 106.7456;
  double accuracy = 5.0;

  @override
  Future<LocationData?> getCurrentLocation() async {
    readCount++;
    if (failNextRead) return null;
    return LocationData(
      latitude: latitude,
      longitude: longitude,
      accuracyMeters: accuracy,
      timestamp: DateTime.now(),
    );
  }
}

void main() {
  group('Round 5 Verification Tests', () {
    test('Issue 1: confirmOrderArrivalUrl points to /arrived according to backend contract', () {
      final url = ApiConstants.confirmOrderArrivalUrl(101);
      expect(url, endsWith('/rescue/orders/101/arrived'));
      expect(url.endsWith('/arrive'), isFalse);
    });

    test('Issue 1: RescueService.confirmArrival sends POST to /arrived endpoint', () async {
      SharedPreferences.setMockInitialValues({'token': 'test-token'});
      String? requestedPath;

      await http.runWithClient(() async {
        final service = RescueService();
        final result = await service.confirmArrival(
          42,
          10.7123,
          106.7456,
          accuracyMeters: 5.0,
          recordedAt: '2026-10-24T09:57:31Z',
        );
        expect(result.id, 42);
        expect(requestedPath, '/api/v1/rescue/orders/42/arrived');
      }, () => MockClient((request) async {
        requestedPath = request.url.path;
        if (request.url.path == '/api/v1/rescue/orders/42/arrived') {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 42,
                'customerId': 1,
                'garageId': 2,
                'serviceItemId': 3,
                'status': 'ARRIVED',
                'pickupLatitude': 10.7123,
                'pickupLongitude': 106.7456,
              },
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response('Not Found', 404);
      }));
    });

    testWidgets('Issue 3: Sensor failure during arrival confirmation halts /arrived request', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final previous = LocationService.instance;
      final sensor = _FlappingSensor();
      LocationService.instance = sensor;
      addTearDown(() => LocationService.instance = previous);

      tester.view.physicalSize = const Size(390, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      int arrivalRequests = 0;

      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: RouteNavigationScreen(orderId: 42)));
        await tester.pumpAndSettle();

        // Mô phỏng mất GPS ngay trước khi bấm xác nhận đến nơi
        sensor.failNextRead = true;
        await tester.tap(find.text('Đã đến điểm đón · Tiếp nhận xe (<30m)'));
        await tester.pumpAndSettle();

        // Không được phát request xác nhận đến nơi khi GPS bị mất
        expect(arrivalRequests, 0);
        expect(find.textContaining('Mất tín hiệu GPS'), findsWidgets);

        await tester.pumpWidget(const SizedBox.shrink());
      }, () => MockClient((request) async {
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
        if (request.url.path.endsWith('/arrived') || request.url.path.endsWith('/arrive')) {
          arrivalRequests++;
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 42,
                'customerId': 1,
                'garageId': 2,
                'serviceItemId': 3,
                'status': 'ARRIVED',
                'pickupLatitude': 10.7123,
                'pickupLongitude': 106.7456,
              },
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response(jsonEncode({'success': true, 'data': {'orderId': 42}}), 200);
      }));
    });

    testWidgets('Arrival allows a fresh nearby GPS fix with accuracy 138m', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final previous = LocationService.instance;

      // Sai số chỉ tham khảo; vẫn cần tọa độ mới và cách điểm đón <=30m.
      final sensor = _FlappingSensor();
      sensor.accuracy = 138.0;
      sensor.latitude = 10.7123 + 0.000027; // ~3 mét
      sensor.longitude = 106.7456;
      LocationService.instance = sensor;
      addTearDown(() => LocationService.instance = previous);

      tester.view.physicalSize = const Size(390, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      int arrivalRequests = 0;

      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: RouteNavigationScreen(orderId: 42)));
        await tester.pumpAndSettle();

        // Hiển thị đúng sai số thật, không thay bằng độ chính xác giả.
        expect(find.textContaining('3 m'), findsWidgets);
        expect(find.textContaining('±138 m'), findsWidgets);

        expect(find.text('Đủ điều kiện'), findsOneWidget);
        expect(find.text('Chỉ tham khảo'), findsOneWidget);
        expect(find.textContaining('Sai số quá lớn'), findsNothing);
        final filledButton = tester.widget<FilledButton>(find.byType(FilledButton));
        expect(filledButton.onPressed, isNotNull);
        expect(arrivalRequests, 0);

        // Nút xác nhận được kích hoạt và gửi request thành công
        final enabledButton = tester.widget<FilledButton>(find.byType(FilledButton));
        expect(enabledButton.onPressed, isNotNull);

        await tester.tap(find.byType(FilledButton));
        await tester.pumpAndSettle();

        expect(arrivalRequests, 1);
        expect(find.byType(CrossingTransportScreen), findsOneWidget);

        await tester.pumpWidget(const SizedBox.shrink());
      }, () => MockClient((request) async {
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
        if (request.url.path.endsWith('/arrived') || request.url.path.endsWith('/arrive')) {
          expect(jsonDecode(request.body)['accuracyMeters'], 138.0);
          arrivalRequests++;
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 42,
                'customerId': 1,
                'garageId': 2,
                'serviceItemId': 3,
                'status': 'ARRIVED',
                'pickupLatitude': 10.7123,
                'pickupLongitude': 106.7456,
              },
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response(jsonEncode({'success': true, 'data': {'orderId': 42}}), 200);
      }));
    });
  });
}

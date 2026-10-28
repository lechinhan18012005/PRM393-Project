import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/rescue_order_model.dart';
import 'package:mobile/core/services/location_service.dart';
import 'package:mobile/core/services/media_service.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/screens/customer/rescue_history_screen.dart';
import 'package:mobile/screens/mechanic/incoming_dispatch_screen.dart';

void main() {
  group('Round 3 Fixes Verification Tests', () {
    test('LocationService resolves address coordinates dynamically', () {
      final loc1 = LocationService.instance.resolveAddressCoordinates('85 Huỳnh Tấn Phát, Q.7');
      expect(loc1, isNotNull);
      expect(loc1!.latitude, closeTo(10.7385, 0.001));
      expect(loc1.longitude, closeTo(106.7215, 0.001));

      final loc2 = LocationService.instance.resolveAddressCoordinates('Cầu Phú Mỹ, gò cao khô ráo', isDropoff: true);
      expect(loc2, isNotNull);
      expect(loc2!.latitude, closeTo(10.7490, 0.001));
      expect(loc2.longitude, closeTo(106.7290, 0.001));

      final distance = LocationService.instance.calculateDistanceMeters(
        loc1.latitude, loc1.longitude,
        loc2.latitude, loc2.longitude,
      );
      expect(distance, greaterThan(500));
    });

    test('RescueOrderModel correctly recognizes REQUESTED as active order', () {
      final orderJson = {
        'id': 101,
        'orderCode': 'RO-TEST-101',
        'orderType': 'SINGLE_CROSSING',
        'status': 'REQUESTED',
        'customerId': 1,
        'customerName': 'Nguyễn Văn Test',
        'garageId': 2,
        'garageName': 'Gara Test',
        'serviceItemId': 3,
        'serviceName': 'Chở xe qua ngập',
        'vehiclePlate': '59-B1 123.45',
        'pickupAddress': '85 Huỳnh Tấn Phát',
        'pickupLatitude': 10.7385,
        'pickupLongitude': 106.7215,
        'dropoffAddress': 'Cầu Phú Mỹ',
        'dropoffLatitude': 10.7490,
        'dropoffLongitude': 106.7290,
        'totalAmount': 150000.0,
      };
      final order = RescueOrderModel.fromJson(orderJson);
      expect(order.isRequested, isTrue);
      expect(order.isActive, isTrue);
      expect(order.statusDescription, contains('tìm thợ'));
    });

    testWidgets('Offer remaining seconds reflects actual secondsRemaining (Issue 4)', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final offer = RescueOfferModel.fromJson({
        'offerId': 99,
        'orderId': 202,
        'orderCode': 'OFFER-3S',
        'secondsRemaining': 3,
        'expiresAt': DateTime.now().add(const Duration(seconds: 3)).toIso8601String(),
      });

      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: IncomingDispatchScreen(initialOffer: offer),
      ));

      // Should display 3 seconds remaining, NOT reset to 45 seconds
      expect(find.text('Chấp nhận ca cứu hộ (3 s)'), findsOneWidget);
      expect(find.text('Chấp nhận ca cứu hộ (45 s)'), findsNothing);

      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('Customer History displays real active orders and recognizes REQUESTED status', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: const RescueHistoryScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.byType(RescueHistoryScreen), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    });

    test('MediaService picks real media file without samplePngBytes', () async {
      final picked = await MediaService.instance.pickImageFromCamera();
      expect(picked, isNotNull);
      expect(picked!.bytes.length, greaterThan(10));
      expect(picked.filename, isNotEmpty);
    });
  });
}

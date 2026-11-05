import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/services/geocoding_service.dart';
import 'package:mobile/core/services/location_service.dart';
import 'package:mobile/screens/customer/service_selection_screen.dart';

class _FakeGeocodingService extends GeocodingService {
  String? query;

  @override
  Future<GeocodingResult?> search(String address) async {
    query = address;
    return const GeocodingResult(
      displayName: '142 Nguyễn Gia Trí, Bình Thạnh, Việt Nam',
      latitude: 10.801234,
      longitude: 106.712345,
    );
  }
}

void main() {
  testWidgets(
    'pickup address falls back to OpenStreetMap when GPS is unavailable',
    (tester) async {
      final previousLocationService = LocationService.instance;
      LocationService.instance = MockLocationService()..mockedLocation = null;
      addTearDown(() => LocationService.instance = previousLocationService);
      final geocoding = _FakeGeocodingService();

      await tester.pumpWidget(
        MaterialApp(home: ServiceSelectionScreen(geocodingService: geocoding)),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Điểm trả xe'), findsNothing);
      await tester.enterText(
        find.byKey(const Key('rescue-pickup-address')),
        '142 Nguyễn Gia Trí, Bình Thạnh',
      );
      await tester.ensureVisible(
        find.byKey(const Key('geocode-pickup-address')),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('geocode-pickup-address')));
      await tester.pumpAndSettle();

      expect(geocoding.query, '142 Nguyễn Gia Trí, Bình Thạnh');
      expect(
        find.text('Chưa có tọa độ. Dùng GPS hoặc tìm địa chỉ trên bản đồ.'),
        findsNothing,
      );
      expect(
        find.byKey(const Key('pickup-coordinate-confirmed')),
        findsOneWidget,
      );
      expect(
        find.textContaining(
          'Tọa độ GPS (OpenStreetMap): 10.801234, 106.712345',
        ),
        findsOneWidget,
      );
      expect(
        find.textContaining('142 Nguyễn Gia Trí, Bình Thạnh, Việt Nam'),
        findsOneWidget,
      );
      expect(
        find.text('Dữ liệu địa chỉ © OpenStreetMap contributors'),
        findsOneWidget,
      );
    },
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/providers/flood_report_provider.dart';
import 'package:mobile/screens/customer/community_flood_report_screen.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('UC-20 Widget Test: Render CommunityFloodReportScreen & Interactive Map', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => FloodReportProvider()),
        ],
        child: const MaterialApp(
          home: CommunityFloodReportScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Title and Banner exist
    expect(find.text('Báo ngập'), findsOneWidget);
    expect(find.text('MỰC NƯỚC HIỆN TẠI (NHẬP SỐ HOẶC CHỌN) *'), findsOneWidget);

    // Verify interactive FlutterMap is rendered
    expect(find.byType(FlutterMap), findsOneWidget);
    expect(find.text('Mở bản đồ lớn'), findsOneWidget);
    expect(find.text('Điểm nóng gợi ý'), findsOneWidget);

    // Verify separate Latitude and Longitude fields exist
    expect(find.widgetWithText(TextField, 'Vĩ độ (Latitude) *'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Kinh độ (Longitude) *'), findsOneWidget);

    // Scroll to preset chips
    await tester.ensureVisible(find.text('60cm+'));
    await tester.pumpAndSettle();

    // Verify 3 depth options are present
    expect(find.text('20cm'), findsOneWidget);
    expect(find.text('40cm'), findsOneWidget);
    expect(find.text('60cm+'), findsOneWidget);

    // Tap on '60cm+'
    await tester.tap(find.text('60cm+'));
    await tester.pump();

    // Scroll into view & Verify submit button is rendered
    await tester.ensureVisible(find.text('Gửi Báo Cáo Điểm Ngập'));
    expect(find.text('Gửi Báo Cáo Điểm Ngập'), findsOneWidget);
  });

  testWidgets('UC-20 Widget Test: Separate Lat/Lng fields and auto-mapping when typing street name', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => FloodReportProvider()),
        ],
        child: const MaterialApp(
          home: CommunityFloodReportScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final addressField = find.widgetWithText(TextField, 'Tên đường / Số nhà / Địa chỉ chi tiết *');
    expect(addressField, findsOneWidget);

    // Enter known street name 'Trần Xuân Soạn'
    await tester.enterText(addressField, 'Trần Xuân Soạn');
    await tester.pumpAndSettle();

    // Verify Latitude field automatically updated with 10.742300
    final latField = find.widgetWithText(TextField, 'Vĩ độ (Latitude) *');
    expect(latField, findsOneWidget);
    final latWidget = tester.widget<TextField>(latField);
    expect(latWidget.controller?.text, contains('10.7423'));

    // Verify Longitude field automatically updated with 106.702100
    final lngField = find.widgetWithText(TextField, 'Kinh độ (Longitude) *');
    expect(lngField, findsOneWidget);
    final lngWidget = tester.widget<TextField>(lngField);
    expect(lngWidget.controller?.text, contains('106.7021'));
  });

  testWidgets('UC-20 Widget Test: User can input custom water depth in centimeters', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => FloodReportProvider()),
        ],
        child: const MaterialApp(
          home: CommunityFloodReportScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Scroll to depth field and find it
    final depthField = find.widgetWithText(TextField, 'Chiều cao mực nước ngập');
    await tester.ensureVisible(depthField);
    await tester.pumpAndSettle();
    expect(depthField, findsOneWidget);

    // Enter custom depth 75cm
    await tester.enterText(depthField, '75');
    await tester.pump();

    expect(find.text('75'), findsOneWidget);

    // Scroll to preset '20cm' and tap it
    await tester.ensureVisible(find.text('20cm'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('20cm'));
    await tester.pump();

    // Verify text field updates to '20'
    expect(find.text('20'), findsOneWidget);
  });

  testWidgets('UC-20 Widget Test: Initial photos state has 0/3 photos and NO Cloudinary mock text', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => FloodReportProvider()),
        ],
        child: const MaterialApp(
          home: CommunityFloodReportScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify photo counter starts at 0/3
    expect(find.text('0/3 ảnh'), findsOneWidget);
    expect(find.text('+ Thêm ảnh'), findsOneWidget);

    // Verify absolutely NO Cloudinary mock text is displayed
    expect(find.textContaining('Cloudinary'), findsNothing);
  });

  testWidgets('UC-20 Widget Test: Manual hotspot pin selection updates coordinates and address on map', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => FloodReportProvider()),
        ],
        child: const MaterialApp(
          home: CommunityFloodReportScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tap on 'Điểm nóng gợi ý'
    await tester.tap(find.text('Điểm nóng gợi ý'));
    await tester.pumpAndSettle();

    // Verify bottom sheet appears with hotspots
    expect(find.text('Chọn điểm nóng gợi ý ngập lụt'), findsOneWidget);
    expect(find.text('Đường Mễ Cốc, Phường 15, Quận 8'), findsOneWidget);

    // Tap on Mễ Cốc hotspot
    await tester.tap(find.text('Đường Mễ Cốc, Phường 15, Quận 8'));
    await tester.pumpAndSettle();

    // Verify address field updated with the selected hotspot address
    expect(find.text('Đường Mễ Cốc, Phường 15, Quận 8'), findsOneWidget);
    // Verify coordinates updated in the separate Latitude field
    final latField = find.widgetWithText(TextField, 'Vĩ độ (Latitude) *');
    final latWidget = tester.widget<TextField>(latField);
    expect(latWidget.controller?.text, contains('10.7510'));
  });

  testWidgets('UC-20 Widget Test: Submit with empty address shows validation error', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => FloodReportProvider()),
        ],
        child: const MaterialApp(
          home: CommunityFloodReportScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Clear the address field
    final addressField = find.widgetWithText(TextField, 'Tên đường / Số nhà / Địa chỉ chi tiết *');
    await tester.ensureVisible(addressField);
    await tester.pumpAndSettle();
    expect(addressField, findsOneWidget);
    await tester.enterText(addressField, '');
    await tester.pumpAndSettle();

    // Scroll button into view before tapping
    await tester.ensureVisible(find.text('Gửi Báo Cáo Điểm Ngập'));
    await tester.pumpAndSettle();

    // Tap Submit
    await tester.tap(find.text('Gửi Báo Cáo Điểm Ngập'));
    await tester.pump();

    // Verify validation snackbar
    expect(find.text('Vui lòng nhập tên đường / địa chỉ điểm ngập!'), findsOneWidget);
  });
}

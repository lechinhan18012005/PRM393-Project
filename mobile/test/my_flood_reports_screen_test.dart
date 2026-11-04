import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/flood_report_model.dart';
import 'package:mobile/core/services/flood_report_service.dart';
import 'package:mobile/providers/flood_report_provider.dart';
import 'package:mobile/screens/customer/my_flood_reports_screen.dart';
import 'package:provider/provider.dart';

class _FakeFloodReportService extends FloodReportService {
  @override
  Future<List<FloodReportModel>> getMyFloodReports() async {
    return [
      FloodReportModel(
        id: 101,
        latitude: 10.7423,
        longitude: 106.7021,
        address: '148 Trần Xuân Soạn, Q7',
        waterDepthLevel: 'SEAT_60CM_PLUS',
        moderationStatus: 'APPROVED',
        confidenceScore: 4,
        clusterCount: 3,
        description: 'Ngập lút yên xe',
        moderatorNote: 'Đã xác minh qua camera giao thông',
        createdAt: '2026-11-02T19:30:00',
      ),
      FloodReportModel(
        id: 102,
        latitude: 10.7381,
        longitude: 106.7212,
        address: '520 Huỳnh Tấn Phát, Q7',
        waterDepthLevel: 'ANKLE_20CM',
        moderationStatus: 'PENDING',
        confidenceScore: 1,
        clusterCount: 1,
        description: 'Nước đang tràn nhẹ lề đường',
        createdAt: '2026-11-02T20:15:00',
      ),
    ];
  }
}

void main() {
  testWidgets('UC-20: Render MyFloodReportsScreen with submitted report items and status badges', (WidgetTester tester) async {
    final fakeService = _FakeFloodReportService();
    final provider = FloodReportProvider(floodService: fakeService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<FloodReportProvider>.value(value: provider),
        ],
        child: const MaterialApp(
          home: MyFloodReportsScreen(),
        ),
      ),
    );

    // Initial pump and wait for postFrameCallback to fetch reports
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Verify AppBar title
    expect(find.text('Báo cáo của tôi'), findsOneWidget);

    // Verify report items are rendered
    expect(find.text('148 Trần Xuân Soạn, Q7'), findsOneWidget);
    expect(find.text('520 Huỳnh Tấn Phát, Q7'), findsOneWidget);

    // Verify status badges
    expect(find.text('ĐÃ KÍCH HOẠT CẢNH BÁO'), findsOneWidget);
    expect(find.text('CHỜ KIỂM DUYỆT'), findsOneWidget);

    // Verify moderator feedback is displayed for approved item
    expect(find.textContaining('Phản hồi hệ thống: Đã xác minh qua camera giao thông'), findsOneWidget);
  });
}

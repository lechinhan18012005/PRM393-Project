import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/providers/flood_report_provider.dart';
import 'package:mobile/screens/customer/community_flood_report_screen.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('UC-20 Widget Test: Render CommunityFloodReportScreen & Select Depth', (WidgetTester tester) async {
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

    // Verify Title and Banner exist
    expect(find.text('Báo ngập'), findsOneWidget);
    expect(find.text('Mực nước hiện tại *'), findsOneWidget);

    // Verify 3 depth options are present
    expect(find.text('20cm'), findsOneWidget);
    expect(find.text('40cm'), findsOneWidget);
    expect(find.text('60cm+'), findsOneWidget);

    // Tap on '60cm+'
    await tester.tap(find.text('60cm+'));
    await tester.pump();

    // Verify submit button is rendered
    expect(find.text('Gửi Báo Cáo Điểm Ngập'), findsOneWidget);
  });
}

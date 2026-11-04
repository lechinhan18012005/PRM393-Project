import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/dispute_service.dart';
import 'package:mobile/screens/customer/customer_disputes_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({'auth_token': 'test_jwt_token'});
  });

  testWidgets('Giai đoạn 2: Render CustomerDisputesScreen với các trạng thái STAFF_REVIEW và REFUNDED', (WidgetTester tester) async {
    final mockResponseJson = {
      'success': true,
      'data': [
        {
          'id': 1,
          'disputeCode': 'REF-8790AB',
          'rescueOrderId': 8790,
          'rescueCode': '#RC-8790',
          'garageName': 'Gara Cứu Hộ Nam Sài Gòn',
          'disputeType': 'OVERCHARGE',
          'originalAmount': 2100000.0,
          'requestedRefundAmount': 600000.0,
          'proposedRefundAmount': 600000.0,
          'approvedRefundAmount': 600000.0,
          'customerReason': 'Tài xế tự ý thu thêm 600k phí ngoài luồng',
          'status': 'REFUNDED',
          'staffFindingNote': 'Staff xác minh có thu lố 600k, đề xuất hoàn tiền',
          'adminResolutionNote': 'Admin duyệt hoàn 600k và khấu trừ ví Gara',
          'refundReferenceCode': 'PAYOS-REV-8790',
          'createdAt': '2026-11-04T10:00:00',
        },
        {
          'id': 2,
          'disputeCode': 'REF-9921CD',
          'rescueOrderId': 9921,
          'rescueCode': '#RC-9921',
          'garageName': 'Gara An Phú',
          'disputeType': 'DAMAGE',
          'originalAmount': 500000.0,
          'requestedRefundAmount': 200000.0,
          'customerReason': 'Trầy xước yếm xe khi kéo',
          'status': 'STAFF_REVIEW',
          'createdAt': '2026-11-04T14:30:00',
        }
      ]
    };

    final mockClient = MockClient((request) async {
      return http.Response.bytes(
        utf8.encode(jsonEncode(mockResponseJson)),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    });

    // Verify DisputeService can parse the mock data
    final service = DisputeService(client: mockClient);
    final disputes = await service.getMyDisputes();
    expect(disputes.length, equals(2));
    expect(disputes[0].disputeCode, equals('REF-8790AB'));
    expect(disputes[0].status, equals('REFUNDED'));
    expect(disputes[0].approvedRefundAmount, equals(600000.0));
    expect(disputes[1].status, equals('STAFF_REVIEW'));

    // Render Widget
    await tester.pumpWidget(
      MaterialApp(
        home: CustomerDisputesScreen(disputeService: service),
      ),
    );

    // Initial loading indicator
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Khiếu nại & Hoàn tiền'), findsOneWidget);

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
  });
}

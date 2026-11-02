import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/dispute_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({'auth_token': 'demo_jwt_token'});
  });

  group('Luồng 6 (UC-23 & UC-27) - Mobile DisputeService Tests', () {
    test('createDispute gửi đúng payload khiếu nại và parse kết quả STAFF_REVIEW', () async {
      Map<String, dynamic>? capturedBody;

      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/api/v1/disputes'));
        capturedBody = jsonDecode(request.body) as Map<String, dynamic>;

        final responseJson = {
          'success': true,
          'message': 'Đã gửi khiếu nại dịch vụ thành công!',
          'data': {
            'id': 101,
            'disputeCode': 'REF-8790AB',
            'rescueOrderId': 8790,
            'rescueCode': '#RC-8790',
            'disputeType': 'OVERCHARGE',
            'originalAmount': 2100000.0,
            'requestedRefundAmount': 600000.0,
            'proposedRefundAmount': 600000.0,
            'customerReason': 'Tài xế tự ý thu thêm 600k tiền cáp kéo ngoài báo giá',
            'status': 'STAFF_REVIEW',
          }
        };
        return http.Response.bytes(
          utf8.encode(jsonEncode(responseJson)),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = DisputeService(client: mockClient);
      final result = await service.createDispute(
        rescueOrderId: 8790,
        paymentTransactionId: 501,
        disputeType: 'OVERCHARGE',
        requestedRefundAmount: 600000,
        customerReason: 'Tài xế tự ý thu thêm 600k tiền cáp kéo ngoài báo giá',
      );

      expect(capturedBody, isNotNull);
      expect(capturedBody!['rescueOrderId'], equals(8790));
      expect(capturedBody!['disputeType'], equals('OVERCHARGE'));
      expect(capturedBody!['requestedRefundAmount'], equals(600000.0));
      expect(result.id, equals(101));
      expect(result.disputeCode, equals('REF-8790AB'));
      expect(result.status, equals('STAFF_REVIEW'));
      expect(result.requestedRefundAmount, equals(600000.0));
    });

    test('getMyDisputes trả về danh sách hồ sơ khiếu nại và trạng thái REFUNDED từ Admin', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, endsWith('/api/v1/disputes/my'));

        final responseJson = {
          'success': true,
          'data': [
            {
              'id': 101,
              'disputeCode': 'REF-8790AB',
              'rescueOrderId': 8790,
              'rescueCode': '#RC-8790',
              'disputeType': 'OVERCHARGE',
              'originalAmount': 2100000.0,
              'requestedRefundAmount': 600000.0,
              'proposedRefundAmount': 600000.0,
              'approvedRefundAmount': 600000.0,
              'customerReason': 'Thu vượt báo giá',
              'status': 'REFUNDED',
              'staffFindingNote': 'Đã xác minh biên lai, đề xuất Admin hoàn 600k',
              'adminResolutionNote': 'Admin duyệt hoàn 600k, khấu trừ ví Gara',
            }
          ]
        };
        return http.Response.bytes(
          utf8.encode(jsonEncode(responseJson)),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = DisputeService(client: mockClient);
      final list = await service.getMyDisputes();

      expect(list.length, equals(1));
      expect(list.first.disputeCode, equals('REF-8790AB'));
      expect(list.first.status, equals('REFUNDED'));
      expect(list.first.approvedRefundAmount, equals(600000.0));
    });
  });
}

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

    test('createDispute xử lý loại khiếu nại DAMAGE_DURING_TOWING thành công', () async {
      final mockClient = MockClient((request) async {
        final responseJson = {
          'success': true,
          'data': {
            'id': 102,
            'disputeCode': 'REF-8791DM',
            'rescueOrderId': 8791,
            'disputeType': 'DAMAGE_DURING_TOWING',
            'requestedRefundAmount': 450000.0,
            'status': 'STAFF_REVIEW',
          }
        };
        return http.Response.bytes(utf8.encode(jsonEncode(responseJson)), 200, headers: {'content-type': 'application/json; charset=utf-8'});
      });

      final service = DisputeService(client: mockClient);
      final result = await service.createDispute(
        rescueOrderId: 8791,
        paymentTransactionId: 502,
        disputeType: 'DAMAGE_DURING_TOWING',
        requestedRefundAmount: 450000,
        customerReason: 'Xe bị trầy móp cánh bửng',
      );

      expect(result.disputeType, equals('DAMAGE_DURING_TOWING'));
      expect(result.requestedRefundAmount, equals(450000.0));
    });

    test('createDispute xử lý loại khiếu nại POOR_SERVICE_QUALITY thành công', () async {
      final mockClient = MockClient((request) async {
        final responseJson = {
          'success': true,
          'data': {
            'id': 103,
            'disputeCode': 'REF-8792PS',
            'rescueOrderId': 8792,
            'disputeType': 'POOR_SERVICE_QUALITY',
            'requestedRefundAmount': 200000.0,
            'status': 'STAFF_REVIEW',
          }
        };
        return http.Response.bytes(utf8.encode(jsonEncode(responseJson)), 200, headers: {'content-type': 'application/json; charset=utf-8'});
      });

      final service = DisputeService(client: mockClient);
      final result = await service.createDispute(
        rescueOrderId: 8792,
        paymentTransactionId: 503,
        disputeType: 'POOR_SERVICE_QUALITY',
        requestedRefundAmount: 200000,
        customerReason: 'Thợ cứu hộ thái độ thiếu chuyên nghiệp',
      );

      expect(result.disputeType, equals('POOR_SERVICE_QUALITY'));
    });

    test('createDispute gửi kèm danh sách ảnh bằng chứng URL', () async {
      Map<String, dynamic>? body;
      final mockClient = MockClient((request) async {
        body = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response.bytes(utf8.encode(jsonEncode({
          'success': true,
          'data': {'id': 104, 'disputeCode': 'REF-8793EV', 'status': 'STAFF_REVIEW'}
        })), 200, headers: {'content-type': 'application/json; charset=utf-8'});
      });

      final service = DisputeService(client: mockClient);
      await service.createDispute(
        rescueOrderId: 8793,
        paymentTransactionId: 504,
        disputeType: 'DAMAGE',
        requestedRefundAmount: 200000.0,
        customerReason: 'Kèm hình ảnh xe vỡ gương',
        evidenceImageUrls: 'https://example.com/img1.jpg,https://example.com/img2.jpg',
      );

      expect(body!['evidenceImageUrls'], isNotNull);
      expect(body!['requestedRefundAmount'], equals(200000.0));
    });

    test('createDispute ném Exception khi Server trả về lỗi 400 Bad Request', () async {
      final mockClient = MockClient((request) async {
        return http.Response.bytes(
          utf8.encode(jsonEncode({'success': false, 'message': 'Đơn cứu hộ đã được khiếu nại trước đó'})),
          400,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = DisputeService(client: mockClient);
      expect(
        () => service.createDispute(
          rescueOrderId: 8794,
          paymentTransactionId: 505,
          disputeType: 'OVERCHARGE',
          requestedRefundAmount: 150000.0,
          customerReason: 'Lặp lại',
        ),
        throwsA(isA<Exception>()),
      );
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

    test('getMyDisputes trả về danh sách trống khi khách hàng chưa khiếu nại', () async {
      final mockClient = MockClient((request) async {
        return http.Response.bytes(
          utf8.encode(jsonEncode({'success': true, 'data': []})),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = DisputeService(client: mockClient);
      final list = await service.getMyDisputes();
      expect(list.isEmpty, isTrue);
    });

    test('getMyDisputes hiển thị hồ sơ ở trạng thái ADMIN_APPROVAL', () async {
      final mockClient = MockClient((request) async {
        final responseJson = {
          'success': true,
          'data': [
            {
              'id': 105,
              'disputeCode': 'REF-8795AA',
              'rescueOrderId': 8795,
              'disputeType': 'OVERCHARGE',
              'status': 'ADMIN_APPROVAL',
              'proposedRefundAmount': 350000.0,
            }
          ]
        };
        return http.Response.bytes(utf8.encode(jsonEncode(responseJson)), 200, headers: {'content-type': 'application/json; charset=utf-8'});
      });

      final service = DisputeService(client: mockClient);
      final list = await service.getMyDisputes();
      expect(list.first.status, equals('ADMIN_APPROVAL'));
      expect(list.first.proposedRefundAmount, equals(350000.0));
    });

    test('getMyDisputes hiển thị hồ sơ bị REJECTED kèm ghi chú bác bỏ', () async {
      final mockClient = MockClient((request) async {
        final responseJson = {
          'success': true,
          'data': [
            {
              'id': 106,
              'disputeCode': 'REF-8796RJ',
              'rescueOrderId': 8796,
              'disputeType': 'FAKE_REPORT',
              'status': 'REJECTED',
              'adminResolutionNote': 'Không đủ chứng cứ xác minh',
            }
          ]
        };
        return http.Response.bytes(utf8.encode(jsonEncode(responseJson)), 200, headers: {'content-type': 'application/json; charset=utf-8'});
      });

      final service = DisputeService(client: mockClient);
      final list = await service.getMyDisputes();
      expect(list.first.status, equals('REJECTED'));
      expect(list.first.adminResolutionNote, equals('Không đủ chứng cứ xác minh'));
    });

    test('getMyDisputes trả về danh sách rỗng an toàn khi Server gặp lỗi 500', () async {
      final mockClient = MockClient((request) async {
        return http.Response.bytes(
          utf8.encode(jsonEncode({'success': false, 'message': 'Internal Server Error'})),
          500,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = DisputeService(client: mockClient);
      final list = await service.getMyDisputes();
      expect(list, isEmpty);
    });
  });
}

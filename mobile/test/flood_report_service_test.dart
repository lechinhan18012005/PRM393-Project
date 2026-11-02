import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/auth_service.dart';
import 'package:mobile/core/services/flood_report_service.dart';

class _FakeAuthService extends AuthService {
  @override
  Future<String?> getToken() async => 'test-jwt-token-customer-q8';
}

void main() {
  group('Luồng 8 - FloodReportService Unit Tests (UC-20 & UC-22)', () {
    test('getActiveFloodReports parses active flood points from GET /api/v1/flood-reports/active', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, endsWith('/api/v1/flood-reports/active'));

        return http.Response.bytes(
          utf8.encode(jsonEncode({
            'success': true,
            'data': [
              {
                'id': 402,
                'reportedById': 101,
                'reportedByName': 'Lê Hoàng Nam',
                'latitude': 10.7423,
                'longitude': 106.7021,
                'address': 'Số 310 Bến Bình Đông, P.15, Quận 8',
                'waterDepthLevel': 'SEAT_60CM_PLUS',
                'imageUrls': 'https://img.example.com/flood1.jpg',
                'description': 'Ngập lút yên xe, giao thông tê liệt',
                'confidenceScore': 5,
                'clusterCount': 3,
                'moderationStatus': 'APPROVED',
                'nearbyStations': 'Có 2 trạm thợ cứu hộ cơ động trong bán kính 2km',
              }
            ],
          })),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = FloodReportService(client: mockClient, authService: _FakeAuthService());
      final list = await service.getActiveFloodReports();

      expect(list.length, equals(1));
      expect(list.first.id, equals(402));
      expect(list.first.waterDepthLevel, equals('SEAT_60CM_PLUS'));
      expect(list.first.depthCm, equals('60cm+'));
      expect(list.first.levelLabel, equals('Nguy hiểm (Đỏ)'));
      expect(list.first.clusterCount, equals(3));
      expect(list.first.confidenceScore, equals(5));
    });

    test('reportFlood sends POST /api/v1/flood-reports with GPS & depth level and parses response', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('POST'));
        expect(request.url.path, endsWith('/api/v1/flood-reports'));
        expect(request.headers['Authorization'], equals('Bearer test-jwt-token-customer-q8'));

        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['latitude'], equals(10.7520));
        expect(body['longitude'], equals(106.7050));
        expect(body['waterDepthLevel'], equals('HALF_WHEEL_40CM'));

        return http.Response.bytes(
          utf8.encode(jsonEncode({
            'success': true,
            'message': 'Báo cáo điểm ngập thành công!',
            'data': {
              'id': 405,
              'reportedById': 101,
              'reportedByName': 'Lê Hoàng Nam',
              'latitude': 10.7520,
              'longitude': 106.7050,
              'address': 'Số 148 Trần Xuân Soạn, P. Tân Hưng, Q.7',
              'waterDepthLevel': 'HALF_WHEEL_40CM',
              'description': 'Triều cường dâng nhanh qua nửa bánh xe',
              'imageUrls': 'https://img.example.com/q7.jpg',
              'confidenceScore': 2,
              'clusterCount': 1,
              'moderationStatus': 'PENDING',
            },
          })),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = FloodReportService(client: mockClient, authService: _FakeAuthService());
      final created = await service.reportFlood(
        latitude: 10.7520,
        longitude: 106.7050,
        address: 'Số 148 Trần Xuân Soạn, P. Tân Hưng, Q.7',
        waterDepthLevel: 'HALF_WHEEL_40CM',
        description: 'Triều cường dâng nhanh qua nửa bánh xe',
        imageUrls: 'https://img.example.com/q7.jpg',
      );

      expect(created.id, equals(405));
      expect(created.moderationStatus, equals('PENDING'));
      expect(created.depthCm, equals('40cm - 50cm'));
      expect(created.levelLabel, equals('Cảnh báo (Cam)'));
    });

    test('getMyFloodReports fetches user submitted flood reports from GET /api/v1/flood-reports/my', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, equals('GET'));
        expect(request.url.path, endsWith('/api/v1/flood-reports/my'));
        expect(request.headers['Authorization'], equals('Bearer test-jwt-token-customer-q8'));

        return http.Response.bytes(
          utf8.encode(jsonEncode({
            'success': true,
            'data': [
              {
                'id': 405,
                'latitude': 10.7520,
                'longitude': 106.7050,
                'address': 'Số 148 Trần Xuân Soạn, Q.7',
                'waterDepthLevel': 'ANKLE_20CM',
                'confidenceScore': 2,
                'clusterCount': 1,
                'moderationStatus': 'PENDING',
              }
            ],
          })),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = FloodReportService(client: mockClient, authService: _FakeAuthService());
      final myReports = await service.getMyFloodReports();

      expect(myReports.length, equals(1));
      expect(myReports.first.depthCm, equals('20cm - 30cm'));
      expect(myReports.first.levelLabel, equals('Theo dõi (Vàng)'));
    });
  });
}

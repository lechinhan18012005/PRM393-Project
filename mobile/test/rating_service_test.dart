import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/auth_service.dart';
import 'package:mobile/core/services/rating_service.dart';

class _FakeAuthService extends AuthService {
  @override
  Future<String?> getToken() async => 'test-customer-jwt-token';
}

void main() {
  group('Luồng 9 (UC-19) - RatingService Mobile Tests', () {
    test(
      'submitRating gửi POST /api/v1/ratings và parse ServiceRatingModel thành công',
      () async {
        late Map<String, dynamic> capturedBody;

        final mockClient = MockClient((request) async {
          expect(request.method, 'POST');
          expect(request.url.path, endsWith('/api/v1/ratings'));
          expect(
            request.headers['Authorization'],
            'Bearer test-customer-jwt-token',
          );

          capturedBody = jsonDecode(request.body) as Map<String, dynamic>;

          final responseJson = {
            'success': true,
            'message': 'Cảm ơn bạn đã gửi đánh giá chất lượng dịch vụ',
            'data': {
              'id': 301,
              'rescueOrderId': 8821,
              'rescueCode': '#RC-8821',
              'customerId': 10,
              'customerName': 'Võ Minh Khôi',
              'garageId': 20,
              'garageName': 'Gara Cứu Hộ Minh Phát',
              'mechanicStaffId': 40,
              'mechanicName': 'Trần Văn Tài',
              'mechanicRatingAvg': 4.92,
              'stars': 5,
              'tags': 'Đến nhanh < 15p,Nhiệt tình lội nước',
              'comment': 'Thợ hỗ trợ nhiệt tình giữa đêm mưa ngập!',
              'createdAt': '2026-04-16T21:00:00',
            },
          };

          return http.Response.bytes(
            utf8.encode(jsonEncode(responseJson)),
            201,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final service = RatingService(
          client: mockClient,
          authService: _FakeAuthService(),
        );

        final rating = await service.submitRating(
          rescueOrderId: 8821,
          stars: 5,
          tags: 'Đến nhanh < 15p,Nhiệt tình lội nước',
          comment: 'Thợ hỗ trợ nhiệt tình giữa đêm mưa ngập!',
        );

        expect(capturedBody['rescueOrderId'], 8821);
        expect(capturedBody['stars'], 5);
        expect(rating.id, 301);
        expect(rating.stars, 5);
        expect(rating.garageName, 'Gara Cứu Hộ Minh Phát');
        expect(rating.mechanicRatingAvg, 4.92);
      },
    );

    test(
      'submitRating ném Exception khi gửi đánh giá trùng lặp (400 Bad Request)',
      () async {
        final mockClient = MockClient((request) async {
          final errorJson = {
            'success': false,
            'message': 'Đơn cứu hộ này đã được đánh giá trước đó',
          };
          return http.Response.bytes(
            utf8.encode(jsonEncode(errorJson)),
            400,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final service = RatingService(
          client: mockClient,
          authService: _FakeAuthService(),
        );

        expect(
          () => service.submitRating(rescueOrderId: 8821, stars: 5),
          throwsA(
            predicate(
              (e) => e.toString().contains('đã được đánh giá trước đó'),
            ),
          ),
        );
      },
    );

    test(
      'getRatingByOrder lấy thông tin đánh giá của đơn cứu hộ từ GET /api/v1/ratings/order/{id}',
      () async {
        final mockClient = MockClient((request) async {
          expect(request.method, 'GET');
          expect(request.url.path, endsWith('/api/v1/ratings/order/8821'));

          final responseJson = {
            'success': true,
            'data': {
              'id': 301,
              'rescueOrderId': 8821,
              'rescueCode': '#RC-8821',
              'customerName': 'Võ Minh Khôi',
              'garageName': 'Gara Cứu Hộ Minh Phát',
              'stars': 5,
              'tags': 'Đến nhanh < 15p',
              'comment': 'Rất hài lòng',
            },
          };

          return http.Response.bytes(
            utf8.encode(jsonEncode(responseJson)),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        });

        final service = RatingService(
          client: mockClient,
          authService: _FakeAuthService(),
        );

        final rating = await service.getRatingByOrder(8821);
        expect(rating, isNotNull);
        expect(rating!.rescueOrderId, 8821);
        expect(rating.stars, 5);
      },
    );
  });
}

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/core/constants/api_constants.dart';
import 'package:mobile/core/services/payment_service.dart';
import 'package:mobile/screens/customer/payment_success_screen.dart';
import 'package:mobile/screens/customer/vietqr_payment_screen.dart';

void main() {
  testWidgets('Cancelled link stops polling and hides stale QR until retry', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({'jwt_access_token': 'test-token'});
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    int creates = 0;
    int reads = 0;
    final service = PaymentService(
      client: MockClient((request) async {
        if (request.method == 'POST') {
          creates++;
        } else {
          reads++;
        }
        return http.Response(
          jsonEncode({
            'data': {
              'id': 100,
              'payosOrderCode': 88,
              'amount': 150000,
              'status': creates == 1 ? 'CANCELLED' : 'PENDING',
              'qrCode': '00020101021238570010A000000727',
              'checkoutUrl': 'https://pay.payos.vn/web/test-link',
            },
          }),
          200,
        );
      }),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: VietQRPaymentScreen(
          orderId: 42,
          garageId: 7,
          amount: 150000,
          paymentService: service,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(QrImageView), findsNothing);
    expect(find.text('Mở trang thanh toán PayOS (Web)'), findsNothing);
    await tester.pump(const Duration(seconds: 10));
    expect(reads, 0);
    final retry = find.byTooltip('Thử lại');
    await tester.ensureVisible(retry);
    await tester.tap(retry);
    await tester.pumpAndSettle();
    expect(creates, 2);
    expect(find.byType(QrImageView), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  setUp(
    () => SharedPreferences.setMockInitialValues({
      'jwt_access_token': 'test-token',
    }),
  );

  test('Both constructor contracts preserve the rescue order identity', () {
    const oldRoute = VietQRPaymentScreen(
      orderId: 42,
      orderCode: 'SOS-42',
      amount: 150000,
    );
    const newRoute = VietQRPaymentScreen(
      rescueOrderId: 42,
      rescueCode: 'SOS-42',
      garageId: 7,
      amount: 150000,
    );
    expect(oldRoute.rescueOrderId, newRoute.rescueOrderId);
    expect(oldRoute.rescueCode, newRoute.rescueCode);
    expect(
      ApiConstants.confirmOrderArrivalUrl(42),
      endsWith('/rescue/orders/42/arrived'),
    );
    expect(ApiConstants.createPaymentUrl, endsWith('/payments/create'));
    expect(ApiConstants.paymentByOrderCodeUrl(88), endsWith('/payments/88'));
    expect(
      ApiConstants.paymentsByRescueOrderUrl(42),
      endsWith('/payments/order/42'),
    );
  });

  testWidgets(
    'Existing preview route sends no payment requests or default IDs',
    (tester) async {
      int calls = 0;
      await http.runWithClient(
        () async {
          await tester.pumpWidget(
            const MaterialApp(
              home: VietQRPaymentScreen(
                orderId: 42,
                orderCode: 'SOS-42',
                amount: 150000,
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.textContaining('SOS-42'), findsWidgets);
          expect(find.textContaining('UC-18 Preview'), findsOneWidget);
          final button = find.byType(ElevatedButton);
          await tester.ensureVisible(button);
          await tester.tap(button);
          await tester.pumpAndSettle();
          expect(find.byType(PaymentSuccessScreen), findsOneWidget);
          expect(calls, 0);
          await tester.pumpWidget(const SizedBox.shrink());
        },
        () => MockClient((request) async {
          calls++;
          return http.Response('{}', 500);
        }),
      );
    },
  );

  for (final scenario in [
    'create-failure',
    'check-failure',
    'pending',
    'success',
    'auto-success',
  ]) {
    testWidgets('Payment API contract: $scenario', (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      int statusCheckCalls = 0;

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/payments/create')) {
          final body = jsonDecode(request.body);
          expect(body['rescueOrderId'], 42);
          expect(body['garageId'], 7);
          expect(body['amount'], 150000);
          return http.Response(
            jsonEncode(
              scenario == 'create-failure'
                  ? {'message': 'Create failed'}
                  : {
                      'data': {
                        'id': 100,
                        'payosOrderCode': 88,
                        'status': 'PENDING',
                        'amount': 150000,
                        'qrCode': 'https://img.vietqr.io/image/MB-038299482910-compact2.png',
                        'bankName': 'MB Bank',
                        'accountNumber': '038299482910',
                        'accountHolder': 'HYDRORESCUE',
                        'paymentContent': 'RESCUE 88',
                      },
                    },
            ),
            scenario == 'create-failure' ? 500 : 200,
          );
        }

        // Endpoint GET /payments/88 kiểm tra trạng thái thanh toán từ server
        if (request.url.path.endsWith('/payments/88') &&
            request.method == 'GET') {
          statusCheckCalls++;
          expect(
            request.url.queryParameters['refresh'],
            scenario == 'auto-success' ? isNull : 'true',
          );
          return http.Response(
            jsonEncode({
              'message': 'Check status result',
              'data': {
                'id': 100,
                'payosOrderCode': 88,
                'status': scenario == 'success' || scenario == 'auto-success'
                    ? 'SUCCESS'
                    : 'PENDING',
                'amount': 150000,
                'bankName': 'MB Bank',
                'paidAt': scenario == 'success' ? '2026-10-25 17:00:00' : null,
              },
            }),
            scenario == 'check-failure' ? 500 : 200,
          );
        }

        return http.Response('{}', 404);
      });

      final paymentService = PaymentService(client: mockClient);

      await tester.pumpWidget(
        MaterialApp(
          home: VietQRPaymentScreen(
            rescueOrderId: 42,
            garageId: 7,
            rescueCode: 'SOS-42',
            amount: 150000,
            paymentService: paymentService,
            autoPolling: scenario == 'auto-success',
          ),
        ),
      );
      await tester.pumpAndSettle();

      if (scenario == 'auto-success') {
        await tester.pump(const Duration(seconds: 3));
      } else {
        final checkButton = find.byType(ElevatedButton);
        await tester.ensureVisible(checkButton);
        await tester.tap(checkButton);
      }
      await tester.pumpAndSettle();

      expect(statusCheckCalls, scenario == 'create-failure' ? 0 : 1);
      expect(
        find.byType(PaymentSuccessScreen),
        scenario == 'success' || scenario == 'auto-success'
            ? findsOneWidget
            : findsNothing,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }

  testWidgets(
    'PayOS raw EMVCo QR code string renders QrImageView and checkoutUrl button',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/payments/create')) {
          return http.Response(
            jsonEncode({
              'data': {
                'id': 101,
                'payosOrderCode': 89,
                'status': 'PENDING',
                'amount': 150000,
                'qrCode': '00020101021238540010A000000727012600069704220112038299482910530370454061500005802VN62130809RESCUE 896304ABCD',
                'checkoutUrl': 'https://pay.payos.vn/web/test-link',
                'bankName': 'MB Bank',
                'accountNumber': '038299482910',
                'accountHolder': 'HYDRORESCUE',
                'paymentContent': 'RESCUE 89',
                'isSimulation': false,
              },
            }),
            200,
          );
        }
        return http.Response('{}', 404);
      });

      final paymentService = PaymentService(client: mockClient);

      await tester.pumpWidget(
        MaterialApp(
          home: VietQRPaymentScreen(
            rescueOrderId: 42,
            garageId: 7,
            rescueCode: 'SOS-42',
            amount: 150000,
            paymentService: paymentService,
            autoPolling: false,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(QrImageView), findsOneWidget);
      expect(find.byIcon(Icons.qr_code_2), findsNothing);
      expect(find.text('Mở trang thanh toán PayOS (Web)'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'Missing QR data shows error container and does not render fake placeholder icon',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/payments/create')) {
          return http.Response(
            jsonEncode({
              'data': {
                'id': 102,
                'payosOrderCode': 90,
                'status': 'PENDING',
                'amount': 150000,
                'qrCode': '',
                'bankName': 'MB Bank',
                'accountNumber': '038299482910',
                'accountHolder': 'HYDRORESCUE',
                'paymentContent': 'RESCUE 90',
              },
            }),
            200,
          );
        }
        return http.Response('{}', 404);
      });

      final paymentService = PaymentService(client: mockClient);

      await tester.pumpWidget(
        MaterialApp(
          home: VietQRPaymentScreen(
            rescueOrderId: 42,
            garageId: 7,
            rescueCode: 'SOS-42',
            amount: 150000,
            paymentService: paymentService,
            autoPolling: false,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Chưa có dữ liệu mã QR'), findsOneWidget);
      expect(find.byType(QrImageView), findsNothing);
      expect(find.byIcon(Icons.qr_code_2), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}

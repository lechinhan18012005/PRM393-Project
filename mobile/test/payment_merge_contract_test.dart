import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/core/constants/api_constants.dart';
import 'package:mobile/screens/customer/payment_success_screen.dart';
import 'package:mobile/screens/customer/vietqr_payment_screen.dart';

void main() {
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
    'confirm-failure',
    'pending',
    'success',
  ]) {
    testWidgets('Payment API contract: $scenario', (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      int confirmationCalls = 0;
      await http.runWithClient(
        () async {
          await tester.pumpWidget(
            const MaterialApp(
              home: VietQRPaymentScreen(
                rescueOrderId: 42,
                garageId: 7,
                rescueCode: 'SOS-42',
                amount: 150000,
              ),
            ),
          );
          await tester.pumpAndSettle();
          final button = find.byType(ElevatedButton);
          await tester.ensureVisible(button);
          await tester.tap(button);
          await tester.pumpAndSettle();
          expect(confirmationCalls, scenario == 'create-failure' ? 0 : 1);
          expect(
            find.byType(PaymentSuccessScreen),
            scenario == 'success' ? findsOneWidget : findsNothing,
          );
          await tester.pumpWidget(const SizedBox.shrink());
        },
        () => MockClient((request) async {
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
                        'data': {'payosOrderCode': 88, 'status': 'PENDING'},
                      },
              ),
              scenario == 'create-failure' ? 500 : 200,
            );
          }
          expect(request.url.path, endsWith('/payments/88/simulate-webhook'));
          confirmationCalls++;
          return http.Response(
            jsonEncode({
              'message': 'Confirmation result',
              'data': {'status': scenario == 'pending' ? 'PENDING' : 'SUCCESS'},
            }),
            scenario == 'confirm-failure' ? 500 : 200,
          );
        }),
      );
    });
  }
}

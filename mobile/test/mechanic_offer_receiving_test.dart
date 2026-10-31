import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/core/models/mechanic_staff_model.dart';
import 'package:mobile/core/models/rescue_order_model.dart';
import 'package:mobile/core/models/user_model.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/mechanic_provider.dart';
import 'package:mobile/screens/home/mechanic_home_screen.dart';
import 'package:mobile/screens/mechanic/incoming_dispatch_screen.dart';
import 'package:mobile/screens/mechanic/route_navigation_screen.dart';

class _TestAuthProvider extends AuthProvider {
  final UserModel _user;
  _TestAuthProvider({String username = 'gps108413_mech1'})
      : _user = UserModel(
          id: 10,
          username: username,
          fullName: 'Nguyễn Văn Thợ 1',
          email: '$username@floodrescue.vn',
          role: 'FIELD_MECHANIC',
          active: true,
        );

  @override
  UserModel? get user => _user;
}

class _TestMechanicProvider extends MechanicProvider {
  String status;
  int toggleCalls = 0;
  double? lastSentLat;
  double? lastSentLon;

  _TestMechanicProvider({this.status = 'AVAILABLE'});

  @override
  MechanicStaffModel get myProfile => MechanicStaffModel(
        id: 101,
        userId: 10,
        username: 'gps108413_mech1',
        fullName: 'Nguyễn Văn Thợ 1',
        garageId: 5,
        garageName: 'Gara Phú Mỹ Hưng',
        branchName: 'Chi nhánh Huỳnh Tấn Phát',
        branchAddress: '148 Huỳnh Tấn Phát, Q.7',
        workingStatus: status,
        currentLatitude: 10.7385,
        currentLongitude: 106.7215,
      );

  @override
  Future<void> fetchMyProfile() async {}

  @override
  Future<bool> toggleStatus({
    required String status,
    double? latitude,
    double? longitude,
    String? pauseReason,
  }) async {
    toggleCalls++;
    this.status = status;
    lastSentLat = latitude;
    lastSentLon = longitude;
    notifyListeners();
    return true;
  }
}

class _DelayedProfileMechanicProvider extends MechanicProvider {
  final Completer<void> loaded = Completer<void>();
  bool ready = false;

  @override
  MechanicStaffModel? get myProfile => ready
      ? MechanicStaffModel(
          id: 101,
          userId: 10,
          username: 'delayed_mech',
          fullName: 'Delayed Mech',
          garageId: 5,
          garageName: 'Delayed Garage',
          workingStatus: 'AVAILABLE',
        )
      : null;

  @override
  Future<void> fetchMyProfile() async {
    await loaded.future;
    ready = true;
    notifyListeners();
  }
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({'token': 'test-jwt-token'});
  });

  group('Mechanic Offer Receiving Flow Tests', () {
    testWidgets(
      'Offer appears on MechanicHomeScreen after screen is already loaded and customer creates SOS',
      (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        bool offerCreated = false;
        int pendingPollCount = 0;

        await http.runWithClient(() async {
          final auth = _TestAuthProvider();
          final mechanic = _TestMechanicProvider(status: 'AVAILABLE');

          await tester.pumpWidget(
            MultiProvider(
              providers: [
                ChangeNotifierProvider<AuthProvider>.value(value: auth),
                ChangeNotifierProvider<MechanicProvider>.value(value: mechanic),
              ],
              child: const MaterialApp(
                home: MechanicHomeScreen(),
              ),
            ),
          );

          // Initial state: no offers yet
          await tester.pump();
          expect(find.text('ĐANG CHỜ ĐIỀU PHỐI'), findsOneWidget);
          expect(find.text('YÊU CẦU CỨU HỘ MỚI'), findsNothing);

          // Now customer creates SOS in background
          offerCreated = true;

          // Advance 3.5 seconds to trigger next polling tick
          await tester.pump(const Duration(milliseconds: 3500));
          await tester.pumpAndSettle();

          // Offer card should now be presented or opened in IncomingDispatchScreen
          expect(pendingPollCount, greaterThanOrEqualTo(1));
          expect(find.textContaining('SOS-9999'), findsWidgets);
          expect(find.textContaining('Hoàng Văn Khách'), findsWidgets);
        }, () => MockClient((request) async {
          if (request.url.path.contains('/api/v1/rescue/offers/pending')) {
            pendingPollCount++;
            if (!offerCreated) {
              return http.Response(
                jsonEncode({'success': true, 'data': []}),
                200,
                headers: {'content-type': 'application/json; charset=utf-8'},
              );
            }
            return http.Response(
              jsonEncode({
                'success': true,
                'data': [
                  {
                    'offerId': 888,
                    'orderId': 202,
                    'orderCode': 'SOS-9999',
                    'orderType': 'SINGLE_CROSSING',
                    'status': 'PENDING',
                    'customerName': 'Hoàng Văn Khách',
                    'customerPhone': '0912345678',
                    'vehiclePlate': '59-B1 999.88',
                    'vehicleModel': 'Honda AirBlade',
                    'pickupAddress': '85 Huỳnh Tấn Phát, Q7',
                    'pickupLatitude': 10.7385,
                    'pickupLongitude': 106.7215,
                    'dropoffAddress': 'Cầu Phú Mỹ, Q7',
                    'dropoffLatitude': 10.7490,
                    'dropoffLongitude': 106.7290,
                    'totalAmount': 160000,
                    'distanceMeters': 1200,
                    'expiresAt': DateTime.now().add(const Duration(seconds: 40)).toIso8601String(),
                    'secondsRemaining': 40,
                  }
                ],
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          if (request.url.path.contains('/api/v1/rescue/orders/active')) {
            return http.Response(
              jsonEncode({'success': true, 'data': null}),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          return http.Response('Not Found', 404);
        }));
      },
    );

    testWidgets(
      'Duplicate poll ticks do not push multiple stacked IncomingDispatchScreen routes',
      (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await http.runWithClient(() async {
          final auth = _TestAuthProvider();
          final mechanic = _TestMechanicProvider(status: 'AVAILABLE');

          await tester.pumpWidget(
            MultiProvider(
              providers: [
                ChangeNotifierProvider<AuthProvider>.value(value: auth),
                ChangeNotifierProvider<MechanicProvider>.value(value: mechanic),
              ],
              child: const MaterialApp(
                home: MechanicHomeScreen(),
              ),
            ),
          );

          // Let multiple polling ticks run with the same offer
          await tester.pump(const Duration(seconds: 4));
          await tester.pumpAndSettle();
          await tester.pump(const Duration(seconds: 4));
          await tester.pumpAndSettle();
          await tester.pump(const Duration(seconds: 4));
          await tester.pumpAndSettle();

          // IncomingDispatchScreen should be visible exactly once
          expect(find.byType(IncomingDispatchScreen), findsOneWidget);

          // Popping it returns cleanly to MechanicHomeScreen
          await tester.tap(find.text('Từ chối nhận đơn'));
          await tester.pumpAndSettle();

          expect(find.byType(MechanicHomeScreen), findsOneWidget);
        }, () => MockClient((request) async {
          if (request.url.path.contains('/api/v1/rescue/offers/pending')) {
            return http.Response(
              jsonEncode({
                'success': true,
                'data': [
                  {
                    'offerId': 777,
                    'orderId': 303,
                    'orderCode': 'SOS-7777',
                    'orderType': 'SINGLE_CROSSING',
                    'status': 'PENDING',
                    'customerName': 'Trần Văn Khách',
                    'customerPhone': '0988776655',
                    'vehiclePlate': '59-B1 777.66',
                    'vehicleModel': 'Yamaha NVX',
                    'pickupAddress': '120 Huỳnh Tấn Phát',
                    'pickupLatitude': 10.7385,
                    'pickupLongitude': 106.7215,
                    'dropoffAddress': 'Cầu Phú Mỹ',
                    'dropoffLatitude': 10.7490,
                    'dropoffLongitude': 106.7290,
                    'totalAmount': 170000,
                    'distanceMeters': 1500,
                    'expiresAt': DateTime.now().add(const Duration(seconds: 35)).toIso8601String(),
                    'secondsRemaining': 35,
                  }
                ],
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          if (request.url.path.contains('/reject')) {
            return http.Response(
              jsonEncode({'success': true, 'message': 'Từ chối thành công'}),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          if (request.url.path.contains('/api/v1/rescue/orders/active')) {
            return http.Response(
              jsonEncode({'success': true, 'data': null}),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          return http.Response('Not Found', 404);
        }));
      },
    );

    testWidgets(
      'IncomingDispatchScreen polling: initially empty screen receives offer and enables Accept button',
      (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        bool customerDispatched = false;

        await http.runWithClient(() async {
          final mechanic = _TestMechanicProvider(status: 'AVAILABLE');

          await tester.pumpWidget(
            ChangeNotifierProvider<MechanicProvider>.value(
              value: mechanic,
              child: const MaterialApp(
                home: IncomingDispatchScreen(),
              ),
            ),
          );

          await tester.pumpAndSettle();

          // When opened empty, accept button must be disabled
          expect(find.text('Đang đợi điều phối ca cứu hộ mới...'), findsOneWidget);
          final filledBtn = tester.widget<FilledButton>(find.byType(FilledButton));
          expect(filledBtn.onPressed, isNull);

          // Customer now places SOS
          customerDispatched = true;

          // Advance 3.5 seconds to trigger polling
          await tester.pump(const Duration(milliseconds: 3500));
          await tester.pumpAndSettle();

          // Offer arrives: details displayed and accept button becomes enabled
          expect(find.textContaining('SOS-5555'), findsOneWidget);
          expect(find.textContaining('Chấp nhận ca cứu hộ'), findsOneWidget);
          final enabledBtn = tester.widget<FilledButton>(find.byType(FilledButton));
          expect(enabledBtn.onPressed, isNotNull);

          // Mechanic taps Accept
          await tester.tap(find.byType(FilledButton));
          await tester.pumpAndSettle();

          // Navigates to RouteNavigationScreen with orderId
          expect(find.byType(RouteNavigationScreen), findsOneWidget);
        }, () => MockClient((request) async {
          if (request.url.path.contains('/api/v1/rescue/offers/pending')) {
            if (!customerDispatched) {
              return http.Response(
                jsonEncode({'success': true, 'data': []}),
                200,
                headers: {'content-type': 'application/json; charset=utf-8'},
              );
            }
            return http.Response(
              jsonEncode({
                'success': true,
                'data': [
                  {
                    'offerId': 555,
                    'orderId': 105,
                    'orderCode': 'SOS-5555',
                    'orderType': 'SINGLE_CROSSING',
                    'status': 'PENDING',
                    'customerName': 'Lê Văn Khách',
                    'vehiclePlate': '59-B1 555.55',
                    'vehicleModel': 'Honda Lead',
                    'pickupAddress': 'Điểm đón ngập',
                    'pickupLatitude': 10.7385,
                    'pickupLongitude': 106.7215,
                    'dropoffAddress': 'Điểm gò cao',
                    'dropoffLatitude': 10.7490,
                    'dropoffLongitude': 106.7290,
                    'totalAmount': 150000,
                    'distanceMeters': 900,
                    'expiresAt': DateTime.now().add(const Duration(seconds: 40)).toIso8601String(),
                    'secondsRemaining': 40,
                  }
                ],
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          if (request.url.path.contains('/accept')) {
            return http.Response(
              jsonEncode({
                'success': true,
                'data': {
                  'id': 105,
                  'orderCode': 'SOS-5555',
                  'status': 'DISPATCHED',
                  'customerId': 1,
                  'garageId': 5,
                  'serviceItemId': 2,
                  'pickupLatitude': 10.7385,
                  'pickupLongitude': 106.7215,
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          if (request.url.path.contains('/api/v1/rescue/orders/active')) {
            return http.Response(
              jsonEncode({
                'success': true,
                'data': {
                  'id': 105,
                  'orderCode': 'SOS-5555',
                  'status': 'DISPATCHED',
                  'customerId': 1,
                  'garageId': 5,
                  'serviceItemId': 2,
                  'pickupLatitude': 10.7385,
                  'pickupLongitude': 106.7215,
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          return http.Response('Not Found', 404);
        }));
      },
    );

    testWidgets(
      'Accept network glitch recovers cleanly via getActiveOrder without fake success',
      (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        final initialOffer = RescueOfferModel(
          offerId: 444,
          orderId: 104,
          orderCode: 'SOS-4444',
          orderType: 'SINGLE_CROSSING',
          status: 'PENDING',
          customerName: 'Nguyễn Khách',
          vehiclePlate: '59-B1 444.44',
          pickupAddress: 'Điểm đón',
          pickupLatitude: 10.7385,
          pickupLongitude: 106.7215,
          dropoffAddress: 'Điểm trả',
          dropoffLatitude: 10.7490,
          dropoffLongitude: 106.7290,
          totalAmount: 180000,
          distanceMeters: 800,
          expiresAt: DateTime.now().add(const Duration(seconds: 30)).toIso8601String(),
          secondsRemaining: 30,
        );

        await http.runWithClient(() async {
          final mechanic = _TestMechanicProvider(status: 'AVAILABLE');

          await tester.pumpWidget(
            ChangeNotifierProvider<MechanicProvider>.value(
              value: mechanic,
              child: MaterialApp(
                home: IncomingDispatchScreen(initialOffer: initialOffer),
              ),
            ),
          );

          await tester.pumpAndSettle();

          // Tap Accept
          await tester.tap(find.byType(FilledButton));
          await tester.pumpAndSettle();

          // Even though /accept threw network error, recovery detected active order on server and navigated
          expect(find.byType(RouteNavigationScreen), findsOneWidget);
        }, () => MockClient((request) async {
          if (request.url.path.contains('/accept')) {
            // Simulate network disconnect right as server finishes commit
            throw Exception('Connection closed before full response');
          }

          if (request.url.path.contains('/api/v1/rescue/orders/active')) {
            return http.Response(
              jsonEncode({
                'success': true,
                'data': {
                  'id': 104,
                  'orderCode': 'SOS-4444',
                  'status': 'DISPATCHED',
                  'customerId': 1,
                  'garageId': 5,
                  'serviceItemId': 2,
                  'pickupLatitude': 10.7385,
                  'pickupLongitude': 106.7215,
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }

          return http.Response('Not Found', 404);
        }));
      },
    );

    testWidgets(
      'An active-order response must not restart polling while app is paused',
      (tester) async {
        SharedPreferences.setMockInitialValues({'token': 'probe'});
        tester.view.physicalSize = const Size(390, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final mechanic = _TestMechanicProvider(status: 'AVAILABLE');
        final activeResponse = Completer<http.Response>();
        int polls = 0;
        await http.runWithClient(() async {
          await tester.pumpWidget(
            MultiProvider(
              providers: [
                ChangeNotifierProvider<AuthProvider>.value(value: _TestAuthProvider()),
                ChangeNotifierProvider<MechanicProvider>.value(value: mechanic),
              ],
              child: const MaterialApp(home: MechanicHomeScreen()),
            ),
          );
          await tester.pumpAndSettle();
          tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
          final pollsWhenPaused = polls;
          activeResponse.complete(http.Response(
            '{"success":true,"data":null}',
            200,
            headers: {'content-type': 'application/json'},
          ));
          await tester.pumpAndSettle();
          await tester.pump(const Duration(seconds: 4));
          await tester.pumpAndSettle();
          final actualPolls = polls;
          await tester.pumpWidget(const SizedBox.shrink());
          tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
          expect(
            actualPolls,
            pollsWhenPaused,
            reason: 'Delayed active-order response restarted polling in background',
          );
        }, () => MockClient((request) async {
          if (request.url.path.endsWith('/orders/active')) return activeResponse.future;
          if (request.url.path.endsWith('/offers/pending')) polls++;
          return http.Response('{"success":true,"data":[]}', 200, headers: {'content-type': 'application/json'});
        }));
      },
    );

    testWidgets(
      'Manually opened receive screen must not get a duplicate route from home polling',
      (tester) async {
        SharedPreferences.setMockInitialValues({'token': 'probe'});
        tester.view.physicalSize = const Size(390, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final mechanic = _TestMechanicProvider(status: 'AVAILABLE');
        final navigator = GlobalKey<NavigatorState>();
        bool created = false;
        await http.runWithClient(() async {
          await tester.pumpWidget(
            MultiProvider(
              providers: [
                ChangeNotifierProvider<AuthProvider>.value(value: _TestAuthProvider()),
                ChangeNotifierProvider<MechanicProvider>.value(value: mechanic),
              ],
              child: MaterialApp(navigatorKey: navigator, home: const MechanicHomeScreen()),
            ),
          );
          await tester.pumpAndSettle();
          navigator.currentState!.push(MaterialPageRoute<void>(builder: (_) => const IncomingDispatchScreen()));
          await tester.pumpAndSettle();
          created = true;
          await tester.pump(const Duration(seconds: 4));
          await tester.pumpAndSettle();
          final count = find.byType(IncomingDispatchScreen, skipOffstage: false).evaluate().length;
          await tester.pumpWidget(const SizedBox.shrink());
          expect(count, 1, reason: 'Home auto-pushed a second incoming route over the manual receive screen');
        }, () => MockClient((request) async {
          final data = request.url.path.endsWith('/offers/pending')
              ? (created
                  ? [
                      {
                        'offerId': 888,
                        'orderId': 202,
                        'orderCode': 'SOS-PROBE',
                        'status': 'PENDING',
                        'expiresAt': DateTime.now().add(const Duration(seconds: 40)).toIso8601String(),
                        'secondsRemaining': 40,
                      }
                    ]
                  : [])
              : null;
          return http.Response(jsonEncode({'success': true, 'data': data}), 200, headers: {'content-type': 'application/json'});
        }));
      },
    );

    testWidgets(
      'Cold login starts offer polling when delayed profile arrives',
      (tester) async {
        SharedPreferences.setMockInitialValues({'token': 'probe'});
        tester.view.physicalSize = const Size(390, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final mechanic = _DelayedProfileMechanicProvider();
        int polls = 0;
        await http.runWithClient(() async {
          await tester.pumpWidget(
            MultiProvider(
              providers: [
                ChangeNotifierProvider<AuthProvider>.value(value: _TestAuthProvider()),
                ChangeNotifierProvider<MechanicProvider>.value(value: mechanic),
              ],
              child: const MaterialApp(home: MechanicHomeScreen()),
            ),
          );
          await tester.pumpAndSettle();
          // Active-order response already returned null; profile finishes later.
          mechanic.loaded.complete();
          await tester.pumpAndSettle();
          await tester.pump(const Duration(seconds: 10));
          await tester.pumpAndSettle();
          final actualPolls = polls;
          await tester.pumpWidget(const SizedBox.shrink());
          expect(actualPolls, greaterThan(0), reason: 'AVAILABLE profile loaded, but offer timer was never started');
        }, () => MockClient((request) async {
          if (request.url.path.endsWith('/offers/pending')) polls++;
          return http.Response(jsonEncode({'success': true, 'data': request.url.path.endsWith('/offers/pending') ? [] : null}), 200, headers: {'content-type': 'application/json'});
        }));
      },
    );
  });
}

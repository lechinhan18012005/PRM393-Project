import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/flood_report_provider.dart';
import 'package:mobile/providers/mechanic_provider.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/screens/customer/community_flood_report_screen.dart';
import 'package:mobile/screens/customer/electronic_invoice_screen.dart';
import 'package:mobile/screens/customer/flood_map_screen.dart';
import 'package:mobile/screens/customer/live_tracking_screen.dart';
import 'package:mobile/screens/customer/payment_success_screen.dart';
import 'package:mobile/screens/customer/radar_dispatch_screen.dart';
import 'package:mobile/screens/customer/rating_review_screen.dart';
import 'package:mobile/screens/customer/rescue_history_screen.dart';
import 'package:mobile/screens/customer/review_quotation_screen.dart';
import 'package:mobile/screens/customer/service_selection_screen.dart';
import 'package:mobile/screens/customer/stitch_hydro_rescue_screen.dart';
import 'package:mobile/screens/customer/vehicle_profile_screen.dart';
import 'package:mobile/screens/customer/vietqr_payment_screen.dart';
import 'package:mobile/screens/mechanic/incoming_dispatch_screen.dart';
import 'package:mobile/screens/mechanic/mechanic_shift_screen.dart';
import 'package:mobile/screens/mechanic/quotation_builder_screen.dart';
import 'package:mobile/screens/mechanic/repair_execution_screen.dart';
import 'package:mobile/screens/mechanic/route_navigation_screen.dart';
import 'package:mobile/screens/home/mechanic_home_screen.dart';
import 'package:mobile/screens/auth/login_screen.dart';
import 'package:mobile/screens/auth/register_screen.dart';
import 'package:mobile/screens/demo/demo_catalog_screen.dart';

void main() {
  final screens = <String, Widget>{
    'CommunityFloodReportScreen': const CommunityFloodReportScreen(),
    'ElectronicInvoiceScreen': const ElectronicInvoiceScreen(),
    'FloodMapScreen': const FloodMapScreen(),
    'LiveTrackingScreen': const LiveTrackingScreen(),
    'PaymentSuccessScreen': const PaymentSuccessScreen(),
    'RadarDispatchScreen': const RadarDispatchScreen(),
    'RatingReviewScreen': const RatingReviewScreen(),
    'RescueHistoryScreen': const RescueHistoryScreen(),
    'ReviewQuotationScreen': const ReviewQuotationScreen(),
    'ServiceSelectionScreen': const ServiceSelectionScreen(),
    'StitchHydroRescueScreen': const StitchHydroRescueScreen(),
    'VehicleProfileScreen': const VehicleProfileScreen(),
    'VietQRPaymentScreen': const VietQRPaymentScreen(),
    'IncomingDispatchScreen': const IncomingDispatchScreen(),
    'MechanicShiftScreen': const MechanicShiftScreen(),
    'QuotationBuilderScreen': const QuotationBuilderScreen(),
    'RepairExecutionScreen': const RepairExecutionScreen(),
    'RouteNavigationScreen': const RouteNavigationScreen(),
    'MechanicHomeScreen': const MechanicHomeScreen(),
    'LoginScreen': const LoginScreen(),
    'RegisterScreen': const RegisterScreen(),
    'DemoCatalogScreen': const DemoCatalogScreen(),
  };
  for (final entry in screens.entries) {
    testWidgets('Compact layout: ${entry.key}', (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final errors = <String>[];
      final previousHandler = FlutterError.onError;
      FlutterError.onError = (details) => errors.add(details.toString());
      addTearDown(() => FlutterError.onError = previousHandler);
      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider(create: (_) => AuthProvider()),
            ChangeNotifierProvider(create: (_) => MechanicProvider()),
            ChangeNotifierProvider(create: (_) => FloodReportProvider()),
          ],
          child: MaterialApp(theme: AppTheme.light, home: entry.value),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpWidget(const SizedBox.shrink());
      FlutterError.onError = previousHandler;
      expect(errors, isEmpty);
    });
  }
}

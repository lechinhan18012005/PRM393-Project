import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/constants/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const HydroRescueApp());
}

class HydroRescueApp extends StatelessWidget {
  const HydroRescueApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [ChangeNotifierProvider(create: (_) => AuthProvider())],
      child: MaterialApp(
        title: 'HydroRescue Vietnam',
        debugShowCheckedModeBanner: false,
        builder: (context, child) => Banner(
          message: 'UI DEMO',
          location: BannerLocation.topEnd,
          color: AppColors.primaryOrange,
          child: child ?? const SizedBox.shrink(),
        ),
        theme: AppTheme.light,
        home: const SplashScreen(),
      ),
    );
  }
}

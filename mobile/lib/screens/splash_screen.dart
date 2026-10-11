import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../providers/auth_provider.dart';
import 'auth/login_screen.dart';
import 'home/customer_home_screen.dart';
import 'home/mechanic_home_screen.dart';
import 'home/garage_home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkAuth());
  }

  Future<void> _checkAuth() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.checkAuthStatus();
    if (!mounted) return;

    if (authProvider.isAuthenticated && authProvider.user != null) {
      final role = authProvider.user!.role;
      Widget targetScreen;
      if (role == 'FIELD_MECHANIC') {
        targetScreen = const MechanicHomeScreen();
      } else if (role == 'GARAGE_OWNER') {
        targetScreen = const GarageHomeScreen();
      } else {
        targetScreen = const CustomerHomeScreen();
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => targetScreen),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.surface,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircleAvatar(
              radius: 44,
              backgroundColor: AppColors.primaryContainer,
              child: Icon(
                Icons.two_wheeler,
                size: 48,
                color: AppColors.primary,
              ),
            ),
            SizedBox(height: 20),
            Text(
              'HydroRescue Vietnam',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.onSurface,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Nền tảng cứu hộ xe máy ngập lụt',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.secondary,
              ),
            ),
            SizedBox(height: 32),
            CircularProgressIndicator(
              color: AppColors.primaryOrange,
            ),
          ],
        ),
      ),
    );
  }
}

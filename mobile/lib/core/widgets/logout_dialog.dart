import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../screens/auth/login_screen.dart';

/// Hiển thị hộp thoại xác nhận đăng xuất và thực hiện đăng xuất an toàn.
Future<void> showLogoutConfirmationDialog(BuildContext context) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.logout, color: AppColors.error),
          SizedBox(width: 8),
          Text(
            'Xác nhận đăng xuất',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: const Text(
        'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?',
        style: TextStyle(fontSize: 14),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: const Text(
            'Hủy',
            style: TextStyle(color: AppColors.secondary),
          ),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.error,
          ),
          onPressed: () => Navigator.of(dialogContext).pop(true),
          child: const Text('Đăng xuất'),
        ),
      ],
    ),
  );

  if (confirmed == true && context.mounted) {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.logout();
    } catch (_) {
      // In case Provider is not in scope (e.g. isolated test)
    }

    if (context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }
}

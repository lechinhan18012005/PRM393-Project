import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';
import '../auth/login_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  bool _editing = false;
  bool _loggingOut = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AuthProvider>().refreshProfile();
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _edit() {
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    if (user == null) return;
    _name.text = user.fullName;
    _email.text = user.email;
    _phone.text = user.phone ?? '';
    auth.clearError();
    setState(() => _editing = true);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await context.read<AuthProvider>().updateProfile(
      fullName: _name.text,
      email: _email.text,
      phone: _phone.text,
    );
    if (!mounted) return;
    if (success) {
      setState(() => _editing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cập nhật tài khoản thành công')),
      );
    }
  }

  Future<void> _logout() async {
    setState(() => _loggingOut = true);
    try {
      await context.read<AuthProvider>().logout();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    } catch (_) {
      if (mounted) {
        setState(() => _loggingOut = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Chưa thể đăng xuất. Vui lòng thử lại.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final busy = auth.isLoading || _loggingOut;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tài khoản'),
        actions: [
          IconButton(
            tooltip: 'Tải lại thông tin',
            onPressed: busy || _editing ? null : () => auth.refreshProfile(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (auth.isLoading) const LinearProgressIndicator(),
                  if (auth.errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        auth.errorMessage!,
                        key: const Key('account-error'),
                        style: const TextStyle(color: AppColors.error),
                      ),
                    ),
                  if (user == null)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Text(
                        'Không có thông tin tài khoản. Vui lòng đăng nhập lại.',
                      ),
                    ),
                  if (user != null) ...[
                    RescueIntro(
                      eyebrow: 'THÔNG TIN CÁ NHÂN',
                      title: user.fullName,
                      description: user.role == 'CUSTOMER'
                          ? 'Khách hàng · Flood Rescue'
                          : 'Nhân viên cứu hộ · Flood Rescue',
                      trailing: const RescueLabel(
                        'Hồ sơ tài khoản',
                        color: Color(0xFFB9CEDB),
                      ),
                    ),
                    const RescueSection('Thông tin liên hệ'),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _info('Tên đăng nhập', user.username),
                            if (!_editing) ...[
                              _info('Họ tên', user.fullName),
                              _info('Email', user.email),
                              _info(
                                'Số điện thoại',
                                user.phone?.isNotEmpty == true
                                    ? user.phone!
                                    : 'Chưa cập nhật',
                              ),
                            ],
                            if (_editing)
                              Form(
                                key: _formKey,
                                child: Column(
                                  children: [
                                    TextFormField(
                                      key: const Key('account-name'),
                                      controller: _name,
                                      enabled: !busy,
                                      maxLength: 100,
                                      decoration: const InputDecoration(
                                        labelText: 'Họ tên',
                                      ),
                                      textCapitalization:
                                          TextCapitalization.words,
                                      validator: (value) =>
                                          value == null || value.trim().isEmpty
                                          ? 'Vui lòng nhập họ tên'
                                          : null,
                                    ),
                                    const SizedBox(height: 12),
                                    TextFormField(
                                      key: const Key('account-email'),
                                      controller: _email,
                                      enabled: !busy,
                                      maxLength: 100,
                                      keyboardType: TextInputType.emailAddress,
                                      autocorrect: false,
                                      decoration: const InputDecoration(
                                        labelText: 'Email',
                                      ),
                                      validator: (value) =>
                                          value == null ||
                                              !RegExp(
                                                r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                                              ).hasMatch(value.trim())
                                          ? 'Email không hợp lệ'
                                          : null,
                                    ),
                                    const SizedBox(height: 12),
                                    TextFormField(
                                      key: const Key('account-phone'),
                                      controller: _phone,
                                      enabled: !busy,
                                      keyboardType: TextInputType.phone,
                                      maxLength: 16,
                                      decoration: const InputDecoration(
                                        labelText: 'Số điện thoại',
                                        helperText: 'Có thể để trống',
                                      ),
                                      validator: (value) =>
                                          value != null &&
                                              value.trim().isNotEmpty &&
                                              !RegExp(r'^\+?[0-9]{9,15}$')
                                                  .hasMatch(value.trim())
                                          ? 'Số điện thoại cần từ 9 đến 15 chữ số'
                                          : null,
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (!_editing)
                      FilledButton.icon(
                        key: const Key('account-edit'),
                        onPressed: busy ? null : _edit,
                        icon: const Icon(Icons.edit_outlined),
                        label: const Text('Chỉnh sửa thông tin'),
                      ),
                    if (_editing) ...[
                      FilledButton.icon(
                        key: const Key('account-save'),
                        onPressed: busy ? null : _save,
                        icon: const Icon(Icons.save_outlined),
                        label: Text(
                          auth.isLoading ? 'Đang lưu...' : 'Lưu thay đổi',
                        ),
                      ),
                      TextButton(
                        onPressed: busy
                            ? null
                            : () {
                                auth.clearError();
                                setState(() => _editing = false);
                              },
                        child: const Text('Hủy chỉnh sửa'),
                      ),
                    ],
                  ],
                  const SizedBox(height: 20),
                  OutlinedButton.icon(
                    key: const Key('account-logout'),
                    onPressed: busy ? null : _logout,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                    ),
                    icon: const Icon(Icons.logout),
                    label: Text(
                      _loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _info(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.secondary),
        ),
        const SizedBox(height: 4),
        SelectableText(value),
      ],
    ),
  );
}

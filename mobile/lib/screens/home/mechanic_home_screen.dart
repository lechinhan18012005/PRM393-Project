import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/mechanic_provider.dart';
import '../customer/account_screen.dart';
import '../customer/vietqr_payment_screen.dart';
import '../mechanic/incoming_dispatch_screen.dart';
import '../mechanic/quotation_builder_screen.dart';
import '../mechanic/repair_execution_screen.dart';
import '../mechanic/route_navigation_screen.dart';
import '../mechanic/mechanic_shift_screen.dart';
import '../mechanic/mechanic_ui.dart';

class MechanicHomeScreen extends StatefulWidget {
  const MechanicHomeScreen({super.key});
  @override
  State<MechanicHomeScreen> createState() => _MechanicHomeScreenState();
}

class _MechanicHomeScreenState extends State<MechanicHomeScreen> {
  // Hot reload can retain a State created before these fields existed.
  // Read through defaults instead of relying on field initializers being rerun.
  int? _tab;
  int get _currentTab => _tab ?? 0;
  Set<int>? _visited;
  Set<int> get _visitedTabs => _visited ??= <int>{0};
  static const _titles = [
    'Tổng quan',
    'Công việc',
    'Ca trực',
    'Công cụ',
    'Tài khoản',
  ];
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<MechanicProvider>().fetchMyProfile();
    });
  }

  void _select(int value) => setState(() {
    _tab = value;
    _visitedTabs.add(value);
  });
  void _open(Widget page) =>
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _currentTab == 4
          ? null
          : AppBar(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'FLOOD RESCUE / ĐỘI CỨU HỘ',
                    style: TextStyle(
                      fontSize: 9,
                      letterSpacing: 1.4,
                      color: AppColors.secondary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    _titles[_currentTab],
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  tooltip: 'Làm mới hồ sơ',
                  onPressed: () =>
                      context.read<MechanicProvider>().fetchMyProfile(),
                  icon: const Icon(
                    Icons.refresh_rounded,
                    color: AppColors.secondary,
                  ),
                ),
              ],
            ),
      body: IndexedStack(
        index: _currentTab,
        children: [
          _overview(),
          _visitedTabs.contains(1) ? _jobs() : const SizedBox.shrink(),
          _visitedTabs.contains(2)
              ? const MechanicShiftScreen(embedded: true)
              : const SizedBox.shrink(),
          _visitedTabs.contains(3) ? _tools() : const SizedBox.shrink(),
          _visitedTabs.contains(4)
              ? const AccountScreen()
              : const SizedBox.shrink(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentTab,
        onDestinationSelected: _select,
        backgroundColor: Colors.white,
        indicatorColor: AppColors.primaryContainer,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(
              Icons.dashboard_rounded,
              color: AppColors.primary,
            ),
            label: 'Tổng quan',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment, color: AppColors.primary),
            label: 'Công việc',
          ),
          NavigationDestination(
            icon: Icon(Icons.schedule_outlined),
            selectedIcon: Icon(Icons.schedule, color: AppColors.primary),
            label: 'Ca trực',
          ),
          NavigationDestination(
            icon: Icon(Icons.handyman_outlined),
            selectedIcon: Icon(Icons.handyman, color: AppColors.primary),
            label: 'Công cụ',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppColors.primary),
            label: 'Tài khoản',
          ),
        ],
      ),
    );
  }

  Widget _scroll(List<Widget> children) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 760),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: children,
      ),
    ),
  );
  Widget _overview() {
    final provider = context.watch<MechanicProvider>();
    final profile = provider.myProfile;
    final name = context.watch<AuthProvider>().user?.fullName ?? 'Thợ cứu hộ';
    return _scroll([
      MechanicPanel(
        dark: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'CHÀO MỪNG TRỞ LẠI',
              style: TextStyle(
                color: Color(0xFF99B4C6),
                fontSize: 10,
                letterSpacing: 1.3,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              name,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 23,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              profile?.garageName ?? 'Không gian làm việc của đội cứu hộ',
              style: const TextStyle(color: Color(0xFFB9CEDB), fontSize: 12),
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                MechanicLabel(
                  profile == null
                      ? 'Chưa tải hồ sơ'
                      : profile.isBusy
                      ? 'Đang thực hiện việc'
                      : profile.isOnline
                      ? 'Sẵn sàng nhận đơn'
                      : 'Đang nghỉ',
                  color: const Color(0xFF76D6B5),
                ),
                if (profile?.branchName != null)
                  MechanicLabel(
                    profile!.branchName!,
                    color: const Color(0xFFB9CEDB),
                  ),
              ],
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: _metric(
              Icons.storefront_outlined,
              'Chi nhánh',
              profile?.branchName ?? 'Chưa phân công',
              AppColors.primary,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _metric(
              Icons.schedule_rounded,
              'Ca được phân',
              profile?.shiftName ?? 'Chưa phân ca',
              AppColors.tertiary,
            ),
          ),
        ],
      ),
      if (provider.errorMessage != null)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: MechanicPanel(
            child: Text(
              provider.errorMessage!,
              style: const TextStyle(color: AppColors.error, fontSize: 12),
            ),
          ),
        ),
      MechanicSection(
        'Trạng thái làm việc',
        action: TextButton(
          onPressed: () => _select(2),
          child: const Text('Xem ca trực'),
        ),
      ),
      MechanicPanel(
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.tertiary.withValues(alpha: .08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.radar, color: AppColors.tertiary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile == null
                        ? 'Chờ tải hồ sơ'
                        : profile.isBusy
                        ? 'Đang bận'
                        : profile.isOnline
                        ? 'Đang nhận yêu cầu'
                        : 'Tạm nghỉ',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Trạng thái đồng bộ với gara',
                    style: TextStyle(fontSize: 11, color: AppColors.secondary),
                  ),
                ],
              ),
            ),
            Switch(
              value: profile?.isOnline ?? false,
              onChanged: profile == null || profile.isBusy || provider.isLoading
                  ? null
                  : (_) => changeMechanicAvailability(context),
            ),
          ],
        ),
      ),
      const MechanicSection('Công việc cứu hộ'),
      _jobCard(),
      const MechanicSection('Truy cập nhanh'),
      _tool(
        Icons.receipt_long_outlined,
        'Lập báo giá',
        'Chọn dịch vụ và tính chi phí',
        () => _open(const QuotationBuilderScreen()),
      ),
      const SizedBox(height: 8),
      _tool(
        Icons.person_outline,
        'Thông tin tài khoản',
        'Xem hồ sơ, cập nhật và đăng xuất',
        () => _select(4),
        demo: false,
      ),
    ]);
  }

  Widget _metric(IconData icon, String label, String value, Color color) =>
      MechanicPanel(
        padding: 13,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 12),
            Text(
              label,
              style: const TextStyle(color: AppColors.secondary, fontSize: 10),
            ),
            const SizedBox(height: 5),
            Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      );
  Widget _jobCard() => MechanicPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            MechanicLabel('ĐƠN MINH HỌA', color: AppColors.primary),
            MechanicLabel('Sửa chữa tại chỗ'),
          ],
        ),
        const SizedBox(height: 14),
        const Text(
          'Cứu hộ xe bị ngập nước',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 5),
        const Text(
          '#SOS-8924 · Honda SH',
          style: TextStyle(fontSize: 12, color: AppColors.secondary),
        ),
        const Divider(height: 26),
        const MechanicInfo(
          icon: Icons.person_outline,
          title: 'Khách hàng',
          value: 'Hoàng Văn Khách',
        ),
        const MechanicInfo(
          icon: Icons.location_on_outlined,
          title: 'Điểm cứu hộ',
          value: '148 Trần Xuân Soạn, P. Tân Hưng, Q.7',
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: () => _open(const IncomingDispatchScreen()),
            icon: const Icon(Icons.arrow_forward, size: 17),
            label: const Text('Xem yêu cầu mô phỏng'),
          ),
        ),
      ],
    ),
  );
  Widget _jobs() => _scroll([
    const MechanicDemoNotice(),
    const Text(
      'Danh sách công việc',
      style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
    ),
    const SizedBox(height: 6),
    const Text(
      'Luồng minh họa từ nhận yêu cầu đến hoàn tất sửa chữa.',
      style: TextStyle(fontSize: 12, color: AppColors.secondary),
    ),
    const SizedBox(height: 16),
    _jobCard(),
    const SizedBox(height: 16),
    const MechanicPanel(
      child: MechanicInfo(
        icon: Icons.info_outline,
        title: 'Lưu ý',
        value: 'Chưa kết nối danh sách và phân công đơn cứu hộ thật.',
      ),
    ),
  ]);
  Widget _tools() => _scroll([
    const MechanicDemoNotice(),
    const Text(
      'Bộ công cụ hiện trường',
      style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
    ),
    const SizedBox(height: 6),
    const Text(
      'Hỗ trợ từng bước của hành trình cứu hộ.',
      style: TextStyle(fontSize: 12, color: AppColors.secondary),
    ),
    const MechanicSection('Tiếp nhận & di chuyển'),
    _tool(
      Icons.notifications_active_outlined,
      'Yêu cầu cứu hộ',
      'Xem thông tin khách và sự cố',
      () => _open(const IncomingDispatchScreen()),
    ),
    const SizedBox(height: 8),
    _tool(
      Icons.route_outlined,
      'Đường đến khách',
      'Xem lộ trình minh họa',
      () => _open(const RouteNavigationScreen()),
    ),
    const MechanicSection('Sửa chữa & thanh toán'),
    _tool(
      Icons.receipt_long_outlined,
      'Lập báo giá',
      'Danh mục dịch vụ và tổng chi phí',
      () => _open(const QuotationBuilderScreen()),
    ),
    const SizedBox(height: 8),
    _tool(
      Icons.build_outlined,
      'Thực hiện sửa chữa',
      'Theo dõi các bước công việc',
      () => _open(const RepairExecutionScreen()),
    ),
    const SizedBox(height: 8),
    _tool(
      Icons.qr_code_rounded,
      'Thanh toán VietQR',
      'Xem giao diện thanh toán mẫu',
      () => _open(const VietQRPaymentScreen()),
    ),
  ]);
  Widget _tool(
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap, {
    bool demo = true,
  }) => MechanicPanel(
    padding: 0,
    child: ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.primaryContainer,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppColors.primary, size: 21),
      ),
      title: Text(
        title,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
      ),
      subtitle: Text(
        '$subtitle${demo ? ' · Mô phỏng' : ''}',
        style: const TextStyle(fontSize: 11, color: AppColors.secondary),
      ),
      trailing: const Icon(
        Icons.chevron_right,
        size: 18,
        color: AppColors.secondary,
      ),
      onTap: onTap,
    ),
  );
}

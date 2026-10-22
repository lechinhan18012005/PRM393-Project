import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../providers/mechanic_provider.dart';
import 'mechanic_ui.dart';

Future<void> changeMechanicAvailability(BuildContext context) async {
  final provider = context.read<MechanicProvider>();
  final profile = provider.myProfile;
  if (profile == null || profile.isBusy || provider.isLoading) return;
  final target = profile.isOnline ? 'OFFLINE' : 'AVAILABLE';
  final ok = await provider.toggleStatus(status: target);
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(
        ok
            ? (target == 'AVAILABLE'
                  ? 'Đã bật trạng thái sẵn sàng nhận đơn.'
                  : 'Đã chuyển sang trạng thái tạm nghỉ.')
            : (provider.errorMessage ??
                  'Không thể cập nhật trạng thái. Vui lòng thử lại.'),
      ),
      backgroundColor: ok ? AppColors.tertiary : AppColors.error,
    ),
  );
}

class MechanicShiftScreen extends StatefulWidget {
  const MechanicShiftScreen({super.key, this.embedded = false});
  final bool embedded;
  @override
  State<MechanicShiftScreen> createState() => _MechanicShiftScreenState();
}

class _MechanicShiftScreenState extends State<MechanicShiftScreen> {
  @override
  void initState() {
    super.initState();
    if (!widget.embedded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.read<MechanicProvider>().fetchMyProfile();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MechanicProvider>();
    final p = provider.myProfile;
    final body = Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            MechanicPanel(
              dark: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'LỊCH LÀM VIỆC',
                    style: TextStyle(
                      fontSize: 10,
                      letterSpacing: 1.5,
                      color: Color(0xFF99B4C6),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    p?.shiftName ?? 'Chưa được phân ca',
                    style: const TextStyle(
                      fontSize: 23,
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    p?.garageName ?? 'Ca trực do chủ gara phân công',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFFB9CEDB),
                    ),
                  ),
                ],
              ),
            ),
            const MechanicSection('Thông tin phân công'),
            MechanicPanel(
              child: Column(
                children: [
                  MechanicInfo(
                    icon: Icons.engineering_outlined,
                    title: 'Thợ cứu hộ',
                    value: p?.fullName ?? 'Chưa tải được hồ sơ',
                  ),
                  const Divider(),
                  MechanicInfo(
                    icon: Icons.storefront_outlined,
                    title: 'Chi nhánh',
                    value: p?.branchName ?? 'Chưa phân chi nhánh',
                  ),
                  MechanicInfo(
                    icon: Icons.location_on_outlined,
                    title: 'Địa chỉ',
                    value: p?.branchAddress ?? 'Chưa cập nhật',
                  ),
                  MechanicInfo(
                    icon: Icons.schedule_outlined,
                    title: 'Ca làm việc',
                    value: p?.shiftName ?? 'Chưa được phân ca',
                  ),
                ],
              ),
            ),
            const MechanicSection('Trạng thái nhận việc'),
            MechanicPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.radar, color: AppColors.tertiary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          p == null
                              ? 'Chưa xác định'
                              : p.isBusy
                              ? 'Đang thực hiện công việc'
                              : p.isOnline
                              ? 'Sẵn sàng nhận đơn'
                              : 'Đang tạm nghỉ',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Bật nhận việc khi bạn sẵn sàng. Thay đổi trạng thái được đồng bộ với gara.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.secondary,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: p == null || p.isBusy || provider.isLoading
                        ? null
                        : () => changeMechanicAvailability(context),
                    icon: Icon(
                      p?.isOnline == true
                          ? Icons.pause_circle_outline
                          : Icons.play_circle_outline,
                    ),
                    label: Text(
                      provider.isLoading
                          ? 'Đang cập nhật...'
                          : p?.isOnline == true
                          ? 'Tạm nghỉ nhận việc'
                          : 'Bắt đầu nhận việc',
                    ),
                  ),
                ],
              ),
            ),
            if (provider.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  provider.errorMessage!,
                  style: const TextStyle(color: AppColors.error, fontSize: 12),
                ),
              ),
            const SizedBox(height: 14),
            const MechanicPanel(
              child: MechanicInfo(
                icon: Icons.info_outline,
                title: 'Cần thay đổi ca trực?',
                value: 'Liên hệ chủ gara để điều chỉnh chi nhánh hoặc ca làm được phân.',
              ),
            ),
          ],
        ),
      ),
    );
    return widget.embedded
        ? body
        : Scaffold(
            backgroundColor: AppColors.background,
            appBar: AppBar(title: const Text('Ca trực')),
            body: body,
          );
  }
}

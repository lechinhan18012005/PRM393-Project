import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/location_service.dart';
import '../../providers/mechanic_provider.dart';
import 'mechanic_ui.dart';

Future<void> changeMechanicAvailability(BuildContext context, {String? pauseReason}) async {
  final provider = context.read<MechanicProvider>();
  final profile = provider.myProfile;
  if (profile == null || profile.isBusy || provider.isLoading) return;

  final target = profile.isOnline ? 'OFFLINE' : 'AVAILABLE';

  // Guard: Chặn bật trực tuyến khi chi nhánh đóng cửa bảo trì (BR-MECH-004)
  if (target == 'AVAILABLE' && !profile.isBranchOpen) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Chi nhánh của bạn đang tạm đóng cửa bảo trì, không thể bật nhận việc!'),
        backgroundColor: AppColors.error,
      ),
    );
    return;
  }

  double? lat;
  double? lon;
  if (target == 'AVAILABLE') {
    final loc = await LocationService.instance.getCurrentLocation();
    if (loc != null) {
      final age = DateTime.now().difference(loc.timestamp).inSeconds.abs();
      if (age <= 30) {
        lat = loc.latitude;
        lon = loc.longitude;
      }
    }
  }

  final ok = await provider.toggleStatus(
    status: target,
    latitude: lat,
    longitude: lon,
    pauseReason: target == 'OFFLINE' ? (pauseReason ?? 'Tạm nghỉ giữa ca') : null,
  );
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
            const SizedBox(height: 12),
            if (p != null && !p.isBranchOpen)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: .1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.error.withValues(alpha: .3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: AppColors.error),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Chi nhánh ${p.branchName ?? ""} đang tạm đóng cửa bảo trì. Vui lòng liên hệ Chủ gara!',
                          style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (p != null && p.isPaused)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryOrange.withValues(alpha: .1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.primaryOrange.withValues(alpha: .3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.pause_circle_filled, color: AppColors.primaryOrange),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Bạn đang tạm nghỉ: ${p.pauseReason ?? "Tạm nghỉ"}. Gạt nhận việc khi sẵn sàng!',
                          style: const TextStyle(color: AppColors.primaryOrange, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
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
                              : (p.isPaused ? 'Đang tạm nghỉ' : 'Đang tạm nghỉ'),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    p != null && !p.isBranchOpen
                        ? 'Chi nhánh đang đóng cửa bảo trì. Không thể nhận đơn.'
                        : 'Bật nhận việc khi bạn sẵn sàng. Thay đổi trạng thái được đồng bộ với gara.',
                    style: TextStyle(
                      fontSize: 12,
                      color: p != null && !p.isBranchOpen ? AppColors.error : AppColors.secondary,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: p == null || p.isBusy || provider.isLoading || (!p.isOnline && !p.isBranchOpen)
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

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import 'service_selection_screen.dart';
import 'community_flood_report_screen.dart';
import 'flood_map_screen.dart';
import 'rescue_history_screen.dart';
import 'vehicle_profile_screen.dart';
import '../demo/demo_catalog_screen.dart';

/// Compact customer dashboard: one primary rescue action, then nearby context.
class StitchHydroRescueScreen extends StatefulWidget {
  const StitchHydroRescueScreen({super.key});

  @override
  State<StitchHydroRescueScreen> createState() =>
      _StitchHydroRescueScreenState();
}

class _StitchHydroRescueScreenState extends State<StitchHydroRescueScreen> {
  int _vehicle = 0;
  final _vehicles = const [
    ('Honda SH 150i', '59-B1 892.44'),
    ('Yamaha Exciter 150', '59-S3 481.09'),
    ('Honda Wave Alpha', '59-X1 204.88'),
  ];

  void _open(Widget screen) =>
      Navigator.of(context)
          .push(MaterialPageRoute<void>(builder: (_) => screen));

  void _chooseVehicle() {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Chọn xe', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              for (int i = 0; i < _vehicles.length; i++)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.surfaceContainerLow,
                    child: Icon(Icons.two_wheeler, color: AppColors.secondary),
                  ),
                  title: Text(_vehicles[i].$1),
                  subtitle: Text(_vehicles[i].$2),
                  trailing: _vehicle == i
                      ? const Icon(
                          Icons.check_circle,
                          color: AppColors.primaryOrange,
                        )
                      : null,
                  onTap: () {
                    setState(() => _vehicle = i);
                    Navigator.pop(sheetContext);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showFloodDetails() {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Ngập gần bạn',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  Icons.warning_amber_rounded,
                  color: AppColors.error,
                ),
                title: Text('Nguyễn Hữu Cảnh'),
                subtitle: Text('55 cm · Ngập sâu'),
              ),
              const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.water, color: AppColors.primaryOrange),
                title: Text('Ung Văn Khiêm'),
                subtitle: Text('45 cm · Hạn chế di chuyển'),
              ),
              const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.water, color: AppColors.tertiary),
                title: Text('Quốc Hương'),
                subtitle: Text('18 cm · Theo dõi mực nước'),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  Navigator.pop(context);
                  _open(const FloodMapScreen());
                },
                child: const Text('Mở bản đồ ngập'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.waves_rounded, color: AppColors.primaryOrange, size: 26),
            SizedBox(width: 8),
            Flexible(
              child: Text(
                'HydroRescue',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Khám phá ứng dụng mẫu',
            onPressed: () => _open(const DemoCatalogScreen()),
            icon: const Icon(Icons.apps_rounded),
          ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          children: [
            Text(
              'Bạn cần hỗ trợ?',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 6),
            Text(
              'Cứu hộ xe máy, ngay gần bạn.',
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: AppColors.secondary),
            ),
            const SizedBox(height: 22),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.location_on_outlined,
                          color: AppColors.tertiary,
                          size: 22,
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Vị trí hiện tại',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.secondary,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                '142 Nguyễn Gia Trí',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                'Bình Thạnh, TP. Hồ Chí Minh',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.secondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 30),
                    Semantics(
                      button: true,
                      label: 'Chọn xe',
                      child: InkWell(
                        key: const Key('choose-vehicle'),
                        borderRadius: BorderRadius.circular(10),
                        onTap: _chooseVehicle,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.two_wheeler_rounded,
                                color: AppColors.secondary,
                                size: 22,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _vehicles[_vehicle].$1,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      _vehicles[_vehicle].$2,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.secondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.unfold_more_rounded,
                                size: 20,
                                color: AppColors.secondary,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      key: const Key('request-rescue'),
                      onPressed: () => _open(const ServiceSelectionScreen()),
                      icon: const Icon(Icons.sos_rounded, size: 25),
                      label: const Text('Gọi cứu hộ'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(56),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Chọn dịch vụ và xem giá trước khi đặt.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.spaceBetween,
              children: [
                Text(
                  'Ngập gần bạn',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                TextButton(
                  onPressed: () => _open(const FloodMapScreen()),
                  child: const Text('Xem bản đồ'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _mapPreview(),
            const SizedBox(height: 12),
            Card(
              color: const Color(0xFFFFF7EA),
              child: InkWell(
                onTap: _showFloodDetails,
                borderRadius: BorderRadius.circular(18),
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(Icons.water_rounded, color: Color(0xFFAB731F)),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Nguyễn Hữu Cảnh · 55 cm',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            SizedBox(height: 3),
                            Text(
                              'Ngập sâu, tránh di chuyển qua khu vực.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF8C6B3A),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.chevron_right_rounded,
                        color: Color(0xFFAB731F),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('Tiện ích', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final actions = [
                  _quickAction(
                    Icons.add_location_alt_outlined,
                    'Báo ngập',
                    () => _open(const CommunityFloodReportScreen()),
                  ),
                  _quickAction(
                    Icons.receipt_long_outlined,
                    'Lịch sử cứu hộ',
                    () => _open(const RescueHistoryScreen()),
                  ),
                ];
                if (constraints.maxWidth < 300 ||
                    MediaQuery.textScalerOf(context).scale(1) > 1.3) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      actions[0],
                      const SizedBox(height: 12),
                      actions[1],
                    ],
                  );
                }
                return Row(
                  children: [
                    Expanded(child: actions[0]),
                    const SizedBox(width: 12),
                    Expanded(child: actions[1]),
                  ],
                );
              },
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        onDestinationSelected: (index) {
          if (index == 1) _open(const FloodMapScreen());
          if (index == 2) _open(const RescueHistoryScreen());
          if (index == 3) _open(const VehicleProfileScreen());
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Trang chủ',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            label: 'Bản đồ',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_rounded),
            label: 'Lịch sử',
          ),
          NavigationDestination(
            icon: Icon(Icons.two_wheeler_outlined),
            label: 'Xe của tôi',
          ),
        ],
      ),
    );
  }

  Widget _quickAction(IconData icon, String label, VoidCallback onTap) => Card(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Icon(icon, color: AppColors.tertiary, size: 23),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _mapPreview() => Semantics(
    label: 'Bản đồ minh họa các điểm ngập gần bạn. Nhấn để xem bản đồ ngập.',
    button: true,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Material(
        color: const Color(0xFFEAF1EC),
        child: InkWell(
          onTap: () => _open(const FloodMapScreen()),
          child: SizedBox(
            height: 180,
            child: Stack(
              children: [
                Positioned.fill(child: CustomPaint(painter: _GisMapPainter())),
                Positioned(
                  top: 13,
                  left: 13,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Bản đồ minh họa',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppColors.secondary,
                      ),
                    ),
                  ),
                ),
                const Align(
                  alignment: Alignment(.48, -.15),
                  child: Icon(
                    Icons.location_on_rounded,
                    color: AppColors.error,
                    size: 36,
                  ),
                ),
                const Align(
                  alignment: Alignment(-.28, .48),
                  child: Icon(
                    Icons.location_on_rounded,
                    color: AppColors.primaryOrange,
                    size: 32,
                  ),
                ),
                Align(
                  alignment: const Alignment(-.3, -.05),
                  child: Container(
                    width: 23,
                    height: 23,
                    decoration: BoxDecoration(
                      color: AppColors.tertiary,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                    ),
                  ),
                ),
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: const Icon(
                      Icons.open_in_full_rounded,
                      size: 17,
                      color: AppColors.secondary,
                    ),
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

class _GisMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final road = Paint()
      ..color = Colors.white
      ..strokeWidth = 9;
    for (var i = 1; i < 5; i++) {
      canvas.drawLine(
        Offset(size.width * i / 5 - 30, 0),
        Offset(size.width * i / 5 + 35, size.height),
        road,
      );
    }
    for (var i = 1; i < 4; i++) {
      canvas.drawLine(
        Offset(0, size.height * i / 4 + 15),
        Offset(size.width, size.height * i / 4 - 10),
        road,
      );
    }
    final river = Path()
      ..moveTo(size.width * .65, -20)
      ..cubicTo(
        size.width * .15,
        size.height * .4,
        size.width,
        size.height * .5,
        size.width * .7,
        size.height + 20,
      );
    canvas.drawPath(
      river,
      Paint()
        ..color = const Color(0xFFB8D9E3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 26,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

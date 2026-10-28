import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../core/widgets/rescue_map_painter.dart';
import '../../core/models/flood_report_model.dart';
import '../../providers/flood_report_provider.dart';
import 'community_flood_report_screen.dart';

class FloodMapScreen extends StatefulWidget {
  const FloodMapScreen({super.key});

  @override
  State<FloodMapScreen> createState() => _FloodMapScreenState();
}

class _FloodMapScreenState extends State<FloodMapScreen> {
  int _filterIndex =
      0; // 0: Tất cả, 1: Ngập sâu > 40cm, 2: Cảnh báo đỏ, 3: Đang có cứu hộ

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FloodReportProvider>().fetchActiveFloodPoints();
    });
  }

  List<FloodReportModel> _filterPoints(List<FloodReportModel> all) {
    if (_filterIndex == 1) {
      return all.where((p) => p.waterDepthLevel != 'ANKLE_20CM').toList();
    } else if (_filterIndex == 2) {
      return all.where((p) => p.waterDepthLevel == 'SEAT_60CM_PLUS').toList();
    } else if (_filterIndex == 3) {
      return all
          .where(
            (p) => p.nearbyStations != null && p.nearbyStations!.isNotEmpty,
          )
          .toList();
    }
    return all;
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<FloodReportProvider>();
    final points = provider.floodPoints;
    final visible = _filterPoints(points);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Bản đồ ngập',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            tooltip: 'Tải lại điểm ngập',
            onPressed: provider.isLoading
                ? null
                : provider.fetchActiveFloodPoints,
            icon: const Icon(Icons.refresh, color: AppColors.secondary),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: RefreshIndicator(
            onRefresh: provider.fetchActiveFloodPoints,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
              children: [
                RescueIntro(
                  eyebrow: 'THÔNG TIN ĐƯỜNG ĐI',
                  title: 'Chủ động trước điểm ngập',
                  description: 'Theo dõi danh sách được tải từ hệ thống. Sơ đồ bên dưới chỉ minh họa, không định vị hoặc dẫn đường.',
                ),
                const SizedBox(height: 14),
                RescuePanel(
                  padding: 0,
                  child: SizedBox(
                    height: 190,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(painter: RescueMapPainter()),
                        ),
                        const Positioned(
                          top: 12,
                          left: 12,
                          child: RescueLabel(
                            'SƠ ĐỒ MINH HỌA',
                            color: AppColors.secondary,
                          ),
                        ),
                        for (final entry in visible.take(3).indexed)
                          Align(
                            alignment: [
                              const Alignment(-.55, .45),
                              const Alignment(.55, .35),
                              const Alignment(.1, -.2),
                            ][entry.$1],
                            child: _buildMapPin(entry.$2),
                          ),
                      ],
                    ),
                  ),
                ),
                RescueSection(
                  'Danh sách điểm ngập',
                  action: RescueLabel(
                    provider.isLoading
                        ? 'Đang tải...'
                        : '${visible.length} điểm',
                  ),
                ),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(0, 'Tất cả (${points.length})'),
                      const SizedBox(width: 8),
                      _buildFilterChip(1, 'Ngập sâu'),
                      const SizedBox(width: 8),
                      _buildFilterChip(2, 'Cảnh báo đỏ'),
                      const SizedBox(width: 8),
                      _buildFilterChip(3, 'Có trạm cứu hộ'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                if (provider.isLoading)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 14),
                    child: LinearProgressIndicator(),
                  ),
                if (provider.errorMessage != null)
                  RescuePanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(
                          Icons.cloud_off_outlined,
                          color: AppColors.secondary,
                          size: 30,
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Chưa cập nhật được điểm ngập',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          provider.errorMessage!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.error,
                          ),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: provider.isLoading
                              ? null
                              : provider.fetchActiveFloodPoints,
                          icon: const Icon(Icons.refresh, size: 17),
                          label: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  ),
                if (visible.isEmpty &&
                    !provider.isLoading &&
                    provider.errorMessage == null)
                  const RescuePanel(
                    child: RescueInfo(
                      icon: Icons.layers_clear_outlined,
                      title: 'Chưa có điểm ngập phù hợp',
                      value: 'Danh sách hiện chưa có dữ liệu theo bộ lọc này. Hãy tải lại hoặc đổi bộ lọc.',
                    ),
                  ),
                for (final point in visible)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _buildFloodPointCard(context, point),
                  ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const CommunityFloodReportScreen(),
            ),
          );
          if (context.mounted) {
            context.read<FloodReportProvider>().fetchActiveFloodPoints();
          }
        },
        backgroundColor: AppColors.primaryOrange,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Báo điểm ngập'),
      ),
    );
  }

  Widget _buildMapPin(FloodReportModel pt) {
    return Tooltip(
      message: '${pt.address} (${pt.depthCm})',
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 2),
              ],
            ),
            child: Text(
              pt.depthCm,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: pt.levelColor,
              ),
            ),
          ),
          Icon(Icons.location_on, color: pt.levelColor, size: 32),
        ],
      ),
    );
  }

  Widget _buildFloodPointCard(BuildContext context, FloodReportModel pt) {
    return RescuePanel(
      padding: 14,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  pt.address,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: pt.levelColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  pt.levelLabel,
                  style: TextStyle(
                    color: pt.levelColor,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                'Mực nước: ${pt.depthCm}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: pt.levelColor,
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Độ tin cậy: ⭐ ${pt.confidenceScore}/5 (${pt.clusterCount} tin báo)',
                  style: TextStyle(fontSize: 10, color: Colors.blue.shade800),
                ),
              ),
            ],
          ),
          if (pt.description != null && pt.description!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              pt.description!,
              style: const TextStyle(fontSize: 11, color: AppColors.secondary),
            ),
          ],
          if (pt.nearbyStations != null && pt.nearbyStations!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                const Icon(Icons.shield, size: 14, color: AppColors.tertiary),
                const SizedBox(width: 4),
                Text(
                  pt.nearbyStations!,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.tertiary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFilterChip(int index, String label) {
    final isSelected = _filterIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _filterIndex = index),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.secondary
              : AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.white : AppColors.secondary,
          ),
        ),
      ),
    );
  }
}

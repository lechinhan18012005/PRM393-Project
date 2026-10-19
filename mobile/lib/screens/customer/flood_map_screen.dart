import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/flood_report_model.dart';
import '../../providers/flood_report_provider.dart';
import 'community_flood_report_screen.dart';

class FloodMapScreen extends StatefulWidget {
  const FloodMapScreen({super.key});

  @override
  State<FloodMapScreen> createState() => _FloodMapScreenState();
}

class _FloodMapScreenState extends State<FloodMapScreen> {
  int _filterIndex = 0; // 0: Tất cả, 1: Ngập sâu > 40cm, 2: Cảnh báo đỏ, 3: Đang có cứu hộ

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
      return all.where((p) => p.nearbyStations != null && p.nearbyStations!.isNotEmpty).toList();
    }
    return all;
  }

  @override
  Widget build(BuildContext context) {
    final floodProvider = context.watch<FloodReportProvider>();
    final allPoints = floodProvider.floodPoints;
    final displayedPoints = _filterPoints(allPoints);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Bản đồ ngập',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => floodProvider.fetchActiveFloodPoints(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Simulated Heatmap Canvas Area (Visual map with dynamic pins)
          Container(
            height: 220,
            width: double.infinity,
            color: const Color(0xFFD6E3DF),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.map,
                        size: 50,
                        color: AppColors.secondary,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Điểm ngập tại TP. Hồ Chí Minh',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: Colors.blueGrey.shade800,
                        ),
                      ),
                      Text(
                        '${allPoints.length} Điểm ngập hoạt động • Cập nhật trực tuyến',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.secondary,
                        ),
                      ),
                    ],
                  ),
                ),

                // Simulated dynamic map pins positioned across the canvas
                if (displayedPoints.isNotEmpty) ...[
                  Positioned(
                    top: 35,
                    left: 50,
                    child: _buildMapPin(displayedPoints[0]),
                  ),
                ],
                if (displayedPoints.length > 1) ...[
                  Positioned(
                    bottom: 45,
                    right: 70,
                    child: _buildMapPin(displayedPoints[1]),
                  ),
                ],
                if (displayedPoints.length > 2) ...[
                  Positioned(
                    top: 85,
                    right: 120,
                    child: _buildMapPin(displayedPoints[2]),
                  ),
                ],
                if (displayedPoints.length > 3) ...[
                  Positioned(
                    bottom: 30,
                    left: 100,
                    child: _buildMapPin(displayedPoints[3]),
                  ),
                ],
              ],
            ),
          ),

          // Filters
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip(0, 'Tất cả (${allPoints.length})'),
                  const SizedBox(width: 8),
                  _buildFilterChip(1, 'Ngập sâu > 40cm'),
                  const SizedBox(width: 8),
                  _buildFilterChip(2, 'Cảnh báo Đỏ'),
                  const SizedBox(width: 8),
                  _buildFilterChip(3, 'Có trạm cứu hộ'),
                ],
              ),
            ),
          ),

          // List of flood points
          Expanded(
            child: floodProvider.isLoading && allPoints.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : displayedPoints.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.check_circle_outline, size: 48, color: Colors.green),
                            const SizedBox(height: 8),
                            const Text('Không có điểm ngập nào theo tiêu chí này!'),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              onPressed: () => floodProvider.fetchActiveFloodPoints(),
                              icon: const Icon(Icons.refresh),
                              label: const Text('Tải lại bản đồ'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => floodProvider.fetchActiveFloodPoints(),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: displayedPoints.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final pt = displayedPoints[index];
                            return _buildFloodPointCard(context, pt);
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const CommunityFloodReportScreen(),
            ),
          );
          if (context.mounted) {
            context.read<FloodReportProvider>().fetchActiveFloodPoints();
          }
        },
        backgroundColor: AppColors.primaryOrange,
        icon: const Icon(Icons.add_location_alt, color: Colors.white),
        label: const Text(
          'Báo Điểm Ngập',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
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
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 2)],
            ),
            child: Text(
              pt.depthCm,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: pt.levelColor),
            ),
          ),
          Icon(Icons.location_on, color: pt.levelColor, size: 32),
        ],
      ),
    );
  }

  Widget _buildFloodPointCard(BuildContext context, FloodReportModel pt) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
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
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 2,
                ),
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
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.secondary,
              ),
            ),
          ],
          if (pt.nearbyStations != null && pt.nearbyStations!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                const Icon(
                  Icons.shield,
                  size: 14,
                  color: AppColors.tertiary,
                ),
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

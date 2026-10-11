import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'community_flood_report_screen.dart';

class FloodMapScreen extends StatefulWidget {
  const FloodMapScreen({super.key});

  @override
  State<FloodMapScreen> createState() => _FloodMapScreenState();
}

class _FloodMapScreenState extends State<FloodMapScreen> {
  int _filterIndex = 0;

  final List<Map<String, dynamic>> _floodPoints = [
    {
      'title': 'Đường Trần Xuân Soạn (Q.7)',
      'depth': '45cm - 50cm',
      'level': 'Nguy hiểm (Đỏ)',
      'color': Colors.red,
      'desc': 'Triều cường đạt đỉnh 1.72m, nhiều xe chết máy tại ngã 3 Tân Hưng.',
      'stations': '2 Đội thợ cơ động đang túc trực',
    },
    {
      'title': 'Bán đảo Mễ Cốc (Q.8)',
      'depth': '55cm',
      'level': 'Nguy hiểm (Đỏ)',
      'color': Colors.red,
      'desc': 'Nước sông tràn bờ kè, xe máy không thể lưu thông tự do.',
      'stations': '1 Trạm gom xe ba gác vượt ngập (40k/lượt)',
    },
    {
      'title': 'Đường Huỳnh Tấn Phát (Q.7)',
      'depth': '35cm',
      'level': 'Cảnh báo (Cam)',
      'color': Colors.orange,
      'desc': 'Đoạn từ cầu Phú Xuân đến Nguyễn Thị Thập.',
      'stations': '3 Gara liên kết đang mở cửa hỗ trợ',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Bản Đồ Cảnh Báo Ngập Lụt', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: Column(
        children: [
          // Simulated Heatmap Canvas Area
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
                      const Icon(Icons.map, size: 54, color: AppColors.secondary),
                      const SizedBox(height: 6),
                      Text('BẢN ĐỒ NHIỆT GIS TP. HỒ CHÍ MINH', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey.shade800)),
                      const Text('14 Điểm ngập hoạt động • Dữ liệu cập nhật 5 phút trước', style: TextStyle(fontSize: 11, color: AppColors.secondary)),
                    ],
                  ),
                ),
                // Simulated map pins
                const Positioned(
                  top: 40,
                  left: 60,
                  child: Icon(Icons.location_on, color: Colors.red, size: 36),
                ),
                const Positioned(
                  bottom: 60,
                  right: 80,
                  child: Icon(Icons.location_on, color: Colors.orange, size: 32),
                ),
                const Positioned(
                  top: 90,
                  right: 120,
                  child: Icon(Icons.local_shipping, color: AppColors.primaryOrange, size: 28),
                ),
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
                  _buildFilterChip(0, 'Tất cả (14)'),
                  const SizedBox(width: 8),
                  _buildFilterChip(1, 'Ngập sâu > 40cm (5)'),
                  const SizedBox(width: 8),
                  _buildFilterChip(2, 'Có trạm gom xe (3)'),
                  const SizedBox(width: 8),
                  _buildFilterChip(3, 'Gara cứu hộ (8)'),
                ],
              ),
            ),
          ),

          // List of flood points
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _floodPoints.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final pt = _floodPoints[index];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(pt['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(color: (pt['color'] as Color).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                            child: Text(pt['level'], style: TextStyle(color: pt['color'], fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text('Mức nước: ${pt['depth']}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: pt['color'])),
                      const SizedBox(height: 2),
                      Text(pt['desc'], style: const TextStyle(fontSize: 11, color: AppColors.secondary)),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.shield, size: 14, color: AppColors.tertiary),
                          const SizedBox(width: 4),
                          Text(pt['stations'], style: const TextStyle(fontSize: 11, color: AppColors.tertiary, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CommunityFloodReportScreen()),
          );
        },
        backgroundColor: AppColors.primaryOrange,
        icon: const Icon(Icons.add_location_alt, color: Colors.white),
        label: const Text('Báo Điểm Ngập', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
          color: isSelected ? AppColors.secondary : AppColors.surfaceContainerLow,
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

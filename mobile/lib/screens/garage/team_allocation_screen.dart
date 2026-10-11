import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class TeamAllocationScreen extends StatelessWidget {
  const TeamAllocationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Phân Bổ Thợ Trực Bão', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status overview
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      Text('Tổng Số Thợ', style: TextStyle(fontSize: 11, color: AppColors.secondary)),
                      Text('10', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Column(
                    children: [
                      Text('Đang Trực Tuyến', style: TextStyle(fontSize: 11, color: AppColors.secondary)),
                      Text('7', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green)),
                    ],
                  ),
                  Column(
                    children: [
                      Text('Đang Cứu Hộ', style: TextStyle(fontSize: 11, color: AppColors.secondary)),
                      Text('3', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryOrange)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text('DANH SÁCH THỢ TRỰC CHIẾN CÁC CHI NHÁNH', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline)),
            const SizedBox(height: 8),

            _buildMechanicTile('Phạm Tuấn Anh (#TECH-01)', 'Chi nhánh Q.7 • 148 Trần Xuân Soạn', 'Đang cứu hộ đơn #8924', Colors.orange),
            _buildMechanicTile('Nguyễn Văn Hải (#TECH-02)', 'Chi nhánh Q.7 • Huỳnh Tấn Phát', 'Sẵn sàng nhận đơn (Radius 3km)', Colors.green),
            _buildMechanicTile('Lê Văn Trọng (#TECH-03)', 'Chi nhánh Q.8 • Chợ Mễ Cốc', 'Đang cứu hộ đơn #8919', Colors.orange),
            _buildMechanicTile('Võ Thành Đạt (#TECH-04)', 'Chi nhánh Bình Thạnh • Ung Văn Khiêm', 'Sẵn sàng nhận đơn', Colors.green),
            _buildMechanicTile('Đỗ Minh Quân (#TECH-05)', 'Chi nhánh Q.8 • Phạm Thế Hiển', 'Nghỉ tạm thời (Offline)', Colors.grey),

            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Phát tín hiệu điều động thợ khẩn cấp sang vùng ngập Q.7 & Q.8')),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('ĐIỀU ĐỘNG THỢ SANG ĐIỂM NÓNG', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMechanicTile(String name, String branch, String status, Color statusColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1))],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: statusColor.withValues(alpha: 0.1),
            child: Icon(Icons.person, color: statusColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text(branch, style: const TextStyle(fontSize: 11, color: AppColors.secondary)),
                Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

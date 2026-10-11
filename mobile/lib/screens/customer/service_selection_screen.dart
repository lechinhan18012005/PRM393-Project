import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'radar_dispatch_screen.dart';

class ServiceSelectionScreen extends StatefulWidget {
  const ServiceSelectionScreen({super.key});

  @override
  State<ServiceSelectionScreen> createState() => _ServiceSelectionScreenState();
}

class _ServiceSelectionScreenState extends State<ServiceSelectionScreen> {
  String _selectedService = 'batch'; // 'batch', 'submerged', 'tow'
  String _waterLevel = 'wheel'; // 'ankle', 'wheel', 'seat'

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Yêu Cầu Cứu Hộ & Dịch Vụ', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Current Location Pin
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
              ),
              child: const Row(
                children: [
                  Icon(Icons.location_on, color: AppColors.primaryOrange, size: 28),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Vị trí xe gặp nạn:', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                        SizedBox(height: 2),
                        Text('148 Trần Xuân Soạn, P. Tân Hưng, Quận 7', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text('CHỌN LOẠI DỊCH VỤ CỨU HỘ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline)),
            const SizedBox(height: 8),

            // Service Card 1: Gom xe vượt ngập (Ferrying)
            _buildServiceCard(
              id: 'batch',
              title: 'Gom Xe Vượt Ngập (Ghép chuyến giá rẻ)',
              badge: 'Tiết kiệm 50%',
              desc: 'Xe chuyên dụng chở 4-6 xe máy và chủ xe qua điểm ngập khô ráo an toàn.',
              price: '40.000 đ / lượt',
              icon: Icons.fire_truck,
            ),
            const SizedBox(height: 10),

            // Service Card 2: Cứu hộ chết máy ngập nước
            _buildServiceCard(
              id: 'submerged',
              title: 'Cứu Hộ Chết Máy Ngập Nước Tại Chỗ',
              badge: 'Khẩn cấp sau 15p',
              desc: 'Thợ cơ động đến sấy bugi, xả nước bộ chế hòa khí, kiểm tra nhớt máy.',
              price: '120.000 đ (Công khám)',
              icon: Icons.build_circle,
            ),
            const SizedBox(height: 10),

            // Service Card 3: Kéo xe về Gara
            _buildServiceCard(
              id: 'tow',
              title: 'Kéo Xe Về Gara Chi Nhánh Gần Nhất',
              badge: 'Ngập sâu / Thủy kích',
              desc: 'Xe bị ngập nặng, nước vào động cơ sâu cần đại tu và rửa lốc máy tại Gara.',
              price: '200.000 đ (Bao gồm kéo)',
              icon: Icons.car_repair,
            ),
            const SizedBox(height: 20),

            // Water Level Selector
            const Text('MỨC ĐỘ NƯỚC NGẬP HIỆN TẠI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline)),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildWaterPill('ankle', 'Ngập mắt cá (20cm)'),
                const SizedBox(width: 8),
                _buildWaterPill('wheel', 'Ngập nửa bánh (35cm)'),
                const SizedBox(width: 8),
                _buildWaterPill('seat', 'Ngập yên xe (50cm+)'),
              ],
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const RadarDispatchScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Tiếp Tục Quét Thợ Cứu Hộ', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceCard({
    required String id,
    required String title,
    required String badge,
    required String desc,
    required String price,
    required IconData icon,
  }) {
    final isSelected = _selectedService == id;
    return GestureDetector(
      onTap: () => setState(() => _selectedService = id),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isSelected ? AppColors.primaryOrange : Colors.grey.shade300, width: isSelected ? 2 : 1),
          boxShadow: isSelected ? [BoxShadow(color: AppColors.primaryOrange.withValues(alpha: 0.15), blurRadius: 6)] : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primaryContainer : AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: isSelected ? AppColors.primaryOrange : AppColors.secondary, size: 28),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(4)),
                        child: Text(badge, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber.shade900)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(desc, style: const TextStyle(fontSize: 11, color: AppColors.secondary)),
                  const SizedBox(height: 6),
                  Text(price, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryOrange)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWaterPill(String id, String label) {
    final isSelected = _waterLevel == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _waterLevel = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.secondary : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? AppColors.secondary : Colors.grey.shade300),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? Colors.white : AppColors.onSurface,
            ),
          ),
        ),
      ),
    );
  }
}

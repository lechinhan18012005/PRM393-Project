import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class VehicleProfileScreen extends StatelessWidget {
  const VehicleProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Hồ Sơ Phương Tiện Xe Máy', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('DANH SÁCH XE MÁY ĐÃ ĐĂNG KÝ (1 KHÁCH - N XE)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline)),
            const SizedBox(height: 10),

            // Bike 1: Default SH
            _buildBikeCard(
              brand: 'Honda SH 150i ABS',
              plate: '59-P1 999.88',
              type: 'Xe Tay Ga Cao Cấp',
              airIntakeHeight: 'Cổ hút gió: 45cm (Dễ ngập bô)',
              isDefault: true,
            ),
            const SizedBox(height: 12),

            // Bike 2: Exciter
            _buildBikeCard(
              brand: 'Yamaha Exciter 155 VVA',
              plate: '59-N2 123.45',
              type: 'Xe Côn Tay Thể Thao',
              airIntakeHeight: 'Cổ hút gió: 55cm (Gầm cao)',
              isDefault: false,
            ),
            const SizedBox(height: 12),

            // Bike 3: Wave Alpha
            _buildBikeCard(
              brand: 'Honda Wave Alpha 110',
              plate: '59-S1 678.90',
              type: 'Xe Số Tiết Kiệm',
              airIntakeHeight: 'Cổ hút gió: 40cm (Chế hòa khí)',
              isDefault: false,
            ),
            const SizedBox(height: 24),

            OutlinedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Mở form đăng ký thêm xe máy mới')),
                );
              },
              icon: const Icon(Icons.add, color: AppColors.primaryOrange),
              label: const Text('+ Thêm Xe Máy Mới', style: TextStyle(color: AppColors.primaryOrange, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBikeCard({
    required String brand,
    required String plate,
    required String type,
    required String airIntakeHeight,
    required bool isDefault,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDefault ? AppColors.primaryOrange : Colors.grey.shade300, width: isDefault ? 1.5 : 1),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.two_wheeler, color: AppColors.primaryOrange, size: 26),
                  const SizedBox(width: 8),
                  Text(brand, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ],
              ),
              if (isDefault)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.primaryOrange, borderRadius: BorderRadius.circular(6)),
                  child: const Text('Mặc định', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Biển số: $plate • Loại: $type', style: const TextStyle(fontSize: 12, color: AppColors.secondary)),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.water, size: 14, color: Colors.blue),
              const SizedBox(width: 4),
              Text(airIntakeHeight, style: const TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}

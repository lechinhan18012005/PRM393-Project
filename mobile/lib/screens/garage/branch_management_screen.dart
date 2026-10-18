import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class BranchManagementScreen extends StatelessWidget {
  const BranchManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Chi nhánh',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Danh sách chi nhánh',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 10),

            _buildBranchCard(
              name: 'Chi nhánh 1 (Quận 7 - Trụ sở chính)',
              address: '520 Huỳnh Tấn Phát, P. Tân Phú, Quận 7',
              hotline: '0903.123.456',
              mechanicsCount: '4 Thợ cơ động',
              vehicles: '1 Xe tải nhẹ + 3 Xe máy chuyên dụng',
              isActive: true,
            ),
            const SizedBox(height: 12),

            _buildBranchCard(
              name: 'Chi nhánh 2 (Quận 8 - Cụm Mễ Cốc)',
              address: '120 Bến Bình Đông, Phường 14, Quận 8',
              hotline: '0903.654.321',
              mechanicsCount: '3 Thợ cơ động',
              vehicles: '1 Xe ba gác máy nâng',
              isActive: true,
            ),
            const SizedBox(height: 12),

            _buildBranchCard(
              name: 'Chi nhánh 3 (Bình Thạnh - Ung Văn Khiêm)',
              address: '45 Ung Văn Khiêm, Phường 25, Bình Thạnh',
              hotline: '0903.987.654',
              mechanicsCount: '3 Thợ cơ động',
              vehicles: '2 Xe máy cơ động',
              isActive: true,
            ),
            const SizedBox(height: 24),

            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Mở form đăng ký địa điểm chi nhánh mới & tọa độ GPS',
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.add_business, size: 20),
              label: const Text(
                '+ Thêm Chi Nhánh Mới',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBranchCard({
    required String name,
    required String address,
    required String hotline,
    required String mechanicsCount,
    required String vehicles,
    required bool isActive,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isActive ? 'Đang hoạt động' : 'Tạm đóng',
                  style: TextStyle(
                    color: Colors.green.shade800,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(
                Icons.location_on,
                size: 14,
                color: AppColors.secondary,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  address,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.secondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.phone, size: 14, color: AppColors.secondary),
              const SizedBox(width: 4),
              Text(
                'Hotline: $hotline',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            children: [
              Text(
                'Nhân sự: $mechanicsCount',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Phương tiện: $vehicles',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class RescueHistoryScreen extends StatelessWidget {
  const RescueHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Lịch sử cứu hộ',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildHistoryCard(
            orderId: '#PRM-8924',
            date: '11/10/2026 - 17:35',
            service: 'Cứu hộ chết máy ngập nước (Sấy bugi, thay nhớt)',
            price: '290.000 đ',
            garage: 'Gara Toàn Thắng (CN Q.7)',
            mechanic: 'Phạm Tuấn Anh',
            warrantyStatus: 'Còn bảo hành 29 ngày',
            warrantyActive: true,
          ),
          const SizedBox(height: 12),
          _buildHistoryCard(
            orderId: '#PRM-8201',
            date: '04/10/2026 - 08:20',
            service: 'Gom xe vượt ngập (Xe ba gác Mễ Cốc Q.8)',
            price: '40.000 đ',
            garage: 'Đội Gom Xe Triều Cường Q.8',
            mechanic: 'Nguyễn Văn Hải',
            warrantyStatus: 'Dịch vụ một chiều',
            warrantyActive: false,
          ),
          const SizedBox(height: 12),
          _buildHistoryCard(
            orderId: '#PRM-7819',
            date: '20/09/2026 - 19:45',
            service: 'Kéo xe về Gara súc rửa lốc máy',
            price: '450.000 đ',
            garage: 'Gara Toàn Thắng (CN Bình Thạnh)',
            mechanic: 'Lê Văn Trọng',
            warrantyStatus: 'Hết hạn bảo hành (30 ngày)',
            warrantyActive: false,
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryCard({
    required String orderId,
    required String date,
    required String service,
    required String price,
    required String garage,
    required String mechanic,
    required String warrantyStatus,
    required bool warrantyActive,
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
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            children: [
              Text(
                orderId,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              Text(
                date,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            service,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Thực hiện: $mechanic • $garage',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
          ),
          const SizedBox(height: 8),
          const Divider(),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: warrantyActive
                      ? Colors.green.shade50
                      : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  warrantyStatus,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: warrantyActive
                        ? Colors.green.shade800
                        : Colors.grey.shade600,
                  ),
                ),
              ),
              Text(
                price,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryOrange,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

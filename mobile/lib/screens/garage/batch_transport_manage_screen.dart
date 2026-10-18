import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class BatchTransportManageScreen extends StatelessWidget {
  const BatchTransportManageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Chuyến chở xe',
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
            // Overview banner
            Container(
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
              child: const Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ĐỘI XE GOM VƯỢT NGẬP',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.outline,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        '2 Chuyến Đang Hoạt Động',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Icon(
                    Icons.fire_truck,
                    color: AppColors.primaryOrange,
                    size: 36,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text(
              'Chuyến đang hoạt động',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),

            // Batch Trip 1
            _buildBatchTripCard(
              tripId: '#BATCH-TRIP-01',
              vehicle: 'Xe tải nhẹ 1.25 Tấn (BKS: 51D-891.22)',
              route: 'Dốc Cầu Tân Thuận ➔ Ngã tư Nguyễn Thị Thập',
              capacity: 'Đã gom: 4 / 6 Xe máy',
              capacityPercent: 4 / 6,
              fare: '40.000 đ / xe',
              status: 'Đang gom khách tại điểm chờ',
              statusColor: Colors.orange,
            ),
            const SizedBox(height: 12),

            // Batch Trip 2
            _buildBatchTripCard(
              tripId: '#BATCH-TRIP-02',
              vehicle: 'Xe ba gác nâng thủy lực (BKS: 59-X3 001.99)',
              route: 'Chợ Mễ Cốc ➔ Cầu Số 2 Bến Bình Đông (Q.8)',
              capacity: 'Đã gom: 4 / 4 Xe (Đầy chuyến)',
              capacityPercent: 1.0,
              fare: '35.000 đ / xe',
              status: 'Đang di chuyển chở xe qua ngập',
              statusColor: Colors.green,
            ),
            const SizedBox(height: 24),

            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Mở trình tạo chuyến gom xe mới và chỉ định tài xế',
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.add, size: 20),
              label: const Text(
                'Tạo Chuyến Xe Gom Mới',
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

  Widget _buildBatchTripCard({
    required String tripId,
    required String vehicle,
    required String route,
    required String capacity,
    required double capacityPercent,
    required String fare,
    required String status,
    required Color statusColor,
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
                tripId,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            vehicle,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 2),
          Text(
            'Lộ trình: $route',
            style: const TextStyle(fontSize: 12, color: AppColors.secondary),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            children: [
              Text(
                capacity,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                fare,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryOrange,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          LinearProgressIndicator(
            value: capacityPercent,
            backgroundColor: Colors.grey.shade200,
            color: capacityPercent >= 1.0
                ? Colors.green
                : AppColors.primaryOrange,
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class MechanicShiftScreen extends StatefulWidget {
  const MechanicShiftScreen({super.key});

  @override
  State<MechanicShiftScreen> createState() => _MechanicShiftScreenState();
}

class _MechanicShiftScreenState extends State<MechanicShiftScreen> {
  int _activeShift = 1; // 0: Ca Sáng, 1: Ca Chiều (Trực Bão), 2: Ca Đêm

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Ca trực',
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
            // Shift Header Card
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
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'ĐỘI TRỰC CHIẾN BÃO SỐ 4 • GARA TOÀN THẮNG',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryOrange,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Thợ phụ trách: Phạm Tuấn Anh (Mã thợ: #TECH-07)',
                    style: TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  Text(
                    'Địa bàn chính: Tuyến đường Trần Xuân Soạn - Huỳnh Tấn Phát (Q.7)',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text(
              'CHỌN CA TRỰC CHIẾN',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),

            _buildShiftCard(
              0,
              'Ca 1: Sáng sớm (06:00 - 14:00)',
              'Triều cường dâng ca sáng',
              '4 Thợ cơ động',
            ),
            const SizedBox(height: 8),
            _buildShiftCard(
              1,
              'Ca 2: Chiều tối (14:00 - 22:00) [Đang trực]',
              'Đỉnh triều cường + Mưa bão lớn',
              '8 Thợ cơ động trực chiến',
            ),
            const SizedBox(height: 8),
            _buildShiftCard(
              2,
              'Ca 3: Đêm khẩn cấp (22:00 - 06:00)',
              'Ứng trực tại Gara chi nhánh',
              '3 Thợ túc trực xe tải',
            ),

            const SizedBox(height: 20),
            const Text(
              'THIẾT BỊ & PHƯƠNG TIỆN ĐÃ BÀN GIAO',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Column(
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Icon(Icons.check_box, color: Colors.green, size: 20),
                      SizedBox(width: 8),
                      Text(
                        '1 Xe máy Honda Future có trang bị ống thở chống ngập',
                        style: TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                  SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Icon(Icons.check_box, color: Colors.green, size: 20),
                      SizedBox(width: 8),
                      Text(
                        '1 Thùng đồ nghề chống nước + Máy bơm hút dầu',
                        style: TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                  SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Icon(Icons.check_box, color: Colors.green, size: 20),
                      SizedBox(width: 8),
                      Text(
                        '10 Bình nhớt Castrol + 15 Bugi NGK dự phòng',
                        style: TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Điểm danh vào ca trực chiến thành công! Vị trí GPS của bạn đã được kích hoạt.',
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'ĐIỂM DANH VÀO CA TRỰC CHIẾN',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShiftCard(int index, String title, String desc, String team) {
    final isSelected = _activeShift == index;
    return GestureDetector(
      onTap: () => setState(() => _activeShift = index),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primaryOrange : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? AppColors.primaryOrange : Colors.grey,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    desc,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.secondary,
                    ),
                  ),
                  Text(
                    team,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.tertiary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../providers/mechanic_provider.dart';

class MechanicShiftScreen extends StatefulWidget {
  const MechanicShiftScreen({super.key});

  @override
  State<MechanicShiftScreen> createState() => _MechanicShiftScreenState();
}

class _MechanicShiftScreenState extends State<MechanicShiftScreen> {
  int _activeShift = 1; // 0: Ca Sáng, 1: Ca Chiều (Trực Bão), 2: Ca Đêm

  final List<Map<String, String>> _shifts = [
    {
      'title': 'Ca 1: Sáng sớm (06:00 - 14:00)',
      'desc': 'Triều cường dâng ca sáng',
      'team': '4 Thợ cơ động trực chiến',
    },
    {
      'title': 'Ca 2: Chiều tối (14:00 - 22:00) [Đang trực]',
      'desc': 'Đỉnh triều cường + Mưa bão lớn',
      'team': '8 Thợ cơ động trực chiến',
    },
    {
      'title': 'Ca 3: Đêm khẩn cấp (22:00 - 06:00)',
      'desc': 'Ứng trực tại Gara chi nhánh',
      'team': '3 Thợ túc trực xe tải',
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MechanicProvider>().fetchMyProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final mechProvider = context.watch<MechanicProvider>();
    final profile = mechProvider.myProfile;
    final isOnline = profile?.isOnline ?? false;

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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          profile?.garageName != null
                              ? 'ĐỘI CỨU HỘ • ${profile!.garageName!.toUpperCase()}'
                              : 'ĐỘI TRỰC CHIẾN BÃO SỐ 4',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryOrange,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: isOnline
                              ? Colors.green.shade50
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          isOnline ? 'ONLINE' : 'OFFLINE',
                          style: TextStyle(
                            color: isOnline
                                ? Colors.green.shade800
                                : Colors.grey.shade700,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Thợ phụ trách: ${profile?.fullName ?? "Phạm Tuấn Anh"} (Mã: #${profile?.username ?? "TECH-01"})',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondary,
                    ),
                  ),
                  Text(
                    'Chi nhánh: ${profile?.branchName ?? "Chi nhánh Q.7"} • ${profile?.branchAddress ?? "Huỳnh Tấn Phát"}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
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

            ..._shifts.asMap().entries.map((entry) {
              final idx = entry.key;
              final s = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _buildShiftCard(
                  idx,
                  s['title']!,
                  s['desc']!,
                  s['team']!,
                ),
              );
            }),

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
                  Row(
                    children: [
                      Icon(Icons.check_box, color: Colors.green, size: 20),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '1 Xe máy Honda Future trang bị ống thở chống ngập',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.check_box, color: Colors.green, size: 20),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '1 Thùng đồ nghề chống nước + Máy bơm hút dầu',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.check_box, color: Colors.green, size: 20),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '10 Bình nhớt Castrol + 15 Bugi NGK dự phòng',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            if (mechProvider.isLoading)
              const Center(child: CircularProgressIndicator())
            else
              ElevatedButton.icon(
                onPressed: () async {
                  final targetStatus = isOnline ? 'OFFLINE' : 'AVAILABLE';
                  await context.read<MechanicProvider>().toggleStatus(
                    status: targetStatus,
                    latitude: 10.7423,
                    longitude: 106.7021,
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          targetStatus == 'AVAILABLE'
                              ? 'Điểm danh vào ca trực chiến thành công! Vị trí GPS đã bật sẵn sàng nhận đơn.'
                              : 'Đã chuyển sang trạng thái Nghỉ trực (OFFLINE).',
                        ),
                        backgroundColor: targetStatus == 'AVAILABLE'
                            ? Colors.green
                            : Colors.grey.shade800,
                      ),
                    );
                  }
                },
                icon: Icon(
                  isOnline ? Icons.power_settings_new : Icons.radar,
                  size: 20,
                ),
                label: Text(
                  isOnline
                      ? 'KẾT THÚC CA TRỰC (TẮT ONLINE)'
                      : 'ĐIỂM DANH VÀO CA TRỰC CHIẾN',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isOnline
                      ? Colors.grey.shade800
                      : AppColors.primaryOrange,
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

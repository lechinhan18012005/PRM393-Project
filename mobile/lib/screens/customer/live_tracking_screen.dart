import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../core/widgets/rescue_map_painter.dart';
import 'review_quotation_screen.dart';

class LiveTrackingScreen extends StatelessWidget {
  const LiveTrackingScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    appBar: AppBar(
      title: const Text(
        'Theo dõi cứu hộ',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
      ),
    ),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const RescueIntro(
              eyebrow: 'YÊU CẦU MẪU #SOS-8924',
              title: 'Đội hỗ trợ đang đến',
              description: 'Luồng theo dõi minh họa; chưa có vị trí hoặc thời gian đến trực tiếp.',
              trailing: RescueLabel(
                'Dự kiến mẫu · 6–8 phút',
                color: Color(0xFF76D6B5),
              ),
            ),
            const SizedBox(height: 14),
            RescuePanel(
              padding: 0,
              child: SizedBox(
                height: 200,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: CustomPaint(painter: RescueMapPainter()),
                    ),
                    const Positioned(
                      top: 12,
                      left: 12,
                      child: RescueLabel(
                        'SƠ ĐỒ MINH HỌA',
                        color: AppColors.secondary,
                      ),
                    ),
                    const Align(
                      alignment: Alignment(-.4, .4),
                      child: CircleAvatar(
                        backgroundColor: AppColors.tertiary,
                        child: Icon(Icons.two_wheeler, color: Colors.white),
                      ),
                    ),
                    const Align(
                      alignment: Alignment(.5, -.2),
                      child: Icon(
                        Icons.person_pin_circle,
                        color: AppColors.primary,
                        size: 40,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const RescueSection('Nhân viên hỗ trợ'),
            RescuePanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: AppColors.primaryContainer,
                        child: Icon(
                          Icons.engineering_outlined,
                          color: AppColors.primary,
                          size: 26,
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Phạm Tuấn Anh',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Gara Toàn Thắng · Chi nhánh Q.7',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.secondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 28),
                  const RescueInfo(
                    icon: Icons.location_on_outlined,
                    title: 'Điểm đến mẫu',
                    value: '142 Nguyễn Gia Trí, Bình Thạnh, TP.HCM',
                  ),
                  const RescueInfo(
                    icon: Icons.route_outlined,
                    title: 'Khoảng cách minh họa',
                    value: '900 m',
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Liên hệ nhân viên hiện là thao tác mô phỏng.',
                        ),
                      ),
                    ),
                    icon: const Icon(Icons.call_outlined, size: 18),
                    label: const Text('Liên hệ nhân viên · Mô phỏng'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const ReviewQuotationScreen(),
                ),
              ),
              icon: const Icon(Icons.receipt_long_outlined, size: 18),
              label: const Text('Xem báo giá mẫu'),
            ),
          ],
        ),
      ),
    ),
  );
}

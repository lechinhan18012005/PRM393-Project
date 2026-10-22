import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import 'mechanic_ui.dart';
import 'quotation_builder_screen.dart';

class RouteNavigationScreen extends StatelessWidget {
  const RouteNavigationScreen({super.key});
  @override
  Widget build(BuildContext context) => MechanicPage(
    title: 'Di chuyển đến khách',
    bottom: FilledButton.icon(
      onPressed: () => Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const QuotationBuilderScreen()),
      ),
      icon: const Icon(Icons.check_circle_outline),
      label: const Text('Đã đến nơi · Lập báo giá mẫu'),
    ),
    children: [
      MechanicPanel(
        padding: 0,
        child: Column(
          children: [
            Container(
              height: 230,
              decoration: const BoxDecoration(
                color: Color(0xFFE8F1EE),
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Stack(
                children: [
                  const Positioned.fill(
                    child: CustomPaint(painter: _RouteSketch()),
                  ),
                  const Positioned(
                    left: 16,
                    top: 16,
                    child: MechanicLabel(
                      'SƠ ĐỒ MINH HỌA',
                      color: AppColors.secondary,
                    ),
                  ),
                  const Align(
                    alignment: Alignment(-.55, .55),
                    child: CircleAvatar(
                      backgroundColor: AppColors.tertiary,
                      child: Icon(Icons.navigation, color: Colors.white),
                    ),
                  ),
                  const Align(
                    alignment: Alignment(.55, -.4),
                    child: CircleAvatar(
                      backgroundColor: AppColors.primaryOrange,
                      child: Icon(Icons.location_on, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.route, color: AppColors.tertiary),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '1,1 km · khoảng 5 phút',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      const MechanicSection('Lộ trình cứu hộ'),
      const MechanicPanel(
        child: Column(
          children: [
            MechanicInfo(
              icon: Icons.my_location,
              title: 'Điểm xuất phát mẫu',
              value: 'Chi nhánh Q.7',
            ),
            Divider(),
            MechanicInfo(
              icon: Icons.turn_right_outlined,
              title: 'Di chuyển',
              value: 'Theo đường Huỳnh Tấn Phát đến Trần Xuân Soạn',
            ),
            Divider(),
            MechanicInfo(
              icon: Icons.location_on_outlined,
              title: 'Điểm đến mẫu',
              value: '148 Trần Xuân Soạn, P. Tân Hưng, Quận 7',
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      const MechanicPanel(
        child: MechanicInfo(
          icon: Icons.info_outline,
          title: 'Bản đồ mô phỏng',
          value: 'Sơ đồ không sử dụng vị trí GPS hoặc chỉ đường trực tiếp.',
        ),
      ),
    ],
  );
}

class _RouteSketch extends CustomPainter {
  const _RouteSketch();
  @override
  void paint(Canvas canvas, Size size) {
    final road = Paint()
      ..color = Colors.white
      ..strokeWidth = 22
      ..style = PaintingStyle.stroke;
    for (final x in [.15, .5, .85]) {
      canvas.drawLine(
        Offset(size.width * x, 0),
        Offset(size.width * (x - .12), size.height),
        road,
      );
    }
    for (final y in [.25, .7]) {
      canvas.drawLine(
        Offset(0, size.height * y),
        Offset(size.width, size.height * (y + .1)),
        road,
      );
    }
    final path = Path()
      ..moveTo(size.width * .23, size.height * .77)
      ..lineTo(size.width * .45, size.height * .77)
      ..lineTo(size.width * .5, size.height * .29)
      ..lineTo(size.width * .78, size.height * .29);
    canvas.drawPath(
      path,
      Paint()
        ..color = AppColors.tertiary
        ..strokeWidth = 5
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

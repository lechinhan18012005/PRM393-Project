import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import 'mechanic_ui.dart';
import 'route_navigation_screen.dart';

class IncomingDispatchScreen extends StatelessWidget {
  const IncomingDispatchScreen({super.key});
  @override
  Widget build(BuildContext context) => MechanicPage(
    title: 'Yêu cầu cứu hộ',
    bottom: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: () => Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const RouteNavigationScreen()),
          ),
          icon: const Icon(Icons.navigation_outlined, size: 18),
          label: const Text('Nhận đơn mô phỏng & xem đường'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Quay lại danh sách'),
        ),
      ],
    ),
    children: [
      MechanicPanel(
        dark: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const MechanicLabel(
              'YÊU CẦU MẪU #SOS-8924',
              color: Color(0xFFFFC09E),
            ),
            const SizedBox(height: 16),
            const Text(
              'Khách hàng cần bạn\nđến hỗ trợ',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Sửa chữa tại chỗ · Xe bị ngập nước',
              style: TextStyle(color: Color(0xFFB9CEDB), fontSize: 12),
            ),
          ],
        ),
      ),
      const MechanicSection('Thông tin khách hàng'),
      const MechanicPanel(
        child: Column(
          children: [
            MechanicInfo(
              icon: Icons.person_outline,
              title: 'Khách hàng',
              value: 'Hoàng Văn Khách',
            ),
            Divider(),
            MechanicInfo(
              icon: Icons.two_wheeler_outlined,
              title: 'Phương tiện',
              value: 'Honda SH · Xe tay ga',
            ),
            MechanicInfo(
              icon: Icons.description_outlined,
              title: 'Tình trạng được mô tả',
              value: 'Ngập ngang ống bô, chết máy và không thể khởi động.',
            ),
          ],
        ),
      ),
      const MechanicSection('Điểm cứu hộ'),
      const MechanicPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            MechanicInfo(
              icon: Icons.location_on_outlined,
              title: 'Địa chỉ mẫu',
              value: '148 Trần Xuân Soạn, P. Tân Hưng, Quận 7',
            ),
            Divider(),
            MechanicInfo(
              icon: Icons.route_outlined,
              title: 'Khoảng cách minh họa',
              value: '1,1 km · khoảng 5 phút di chuyển',
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      const MechanicLabel(
        'Luồng mô phỏng không phân công đơn thật',
        color: AppColors.secondary,
      ),
    ],
  );
}

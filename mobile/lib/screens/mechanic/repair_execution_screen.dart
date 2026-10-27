import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../customer/vietqr_payment_screen.dart';
import 'mechanic_ui.dart';

class RepairExecutionScreen extends StatefulWidget {
  const RepairExecutionScreen({super.key});
  @override
  State<RepairExecutionScreen> createState() => _RepairExecutionScreenState();
}

class _RepairExecutionScreenState extends State<RepairExecutionScreen> {
  final _done = <int>{0, 1, 2, 3};
  static const _steps = [
    'Tháo bugi, sấy khô và chống ẩm',
    'Xả sạch nước trong buồng đốt',
    'Thay nhớt cũ bị nhiễm nước',
    'Kiểm tra lọc gió và dây điện',
    'Khởi động và kiểm tra vận hành',
  ];
  @override
  Widget build(BuildContext context) => MechanicPage(
    title: 'Sửa chữa & bàn giao',
    bottom: FilledButton.icon(
      onPressed: _done.length != _steps.length
          ? null
          : () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const VietQRPaymentScreen()),
            ),
      icon: const Icon(Icons.check_circle_outline),
      label: const Text('Hoàn tất · Xem thanh toán mẫu'),
    ),
    children: [
      MechanicPanel(
        dark: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const MechanicLabel('ĐƠN MẪU #SOS-8924', color: Color(0xFF76D6B5)),
            const SizedBox(height: 14),
            const Text(
              'Khôi phục hành trình',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${_done.length}/${_steps.length} bước đã hoàn thành',
              style: const TextStyle(color: Color(0xFFB9CEDB), fontSize: 12),
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: _done.length / _steps.length,
              color: const Color(0xFF76D6B5),
              backgroundColor: Colors.white12,
              borderRadius: BorderRadius.circular(6),
              minHeight: 6,
            ),
          ],
        ),
      ),
      const MechanicSection('Quy trình sửa chữa'),
      MechanicPanel(
        padding: 0,
        child: Column(
          children: List.generate(
            _steps.length,
            (i) => CheckboxListTile(
              value: _done.contains(i),
              onChanged: (v) => setState(() {
                v == true ? _done.add(i) : _done.remove(i);
              }),
              controlAffinity: ListTileControlAffinity.leading,
              title: Text(
                _steps[i],
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(
                'Bước ${i + 1}',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 6,
              ),
            ),
          ),
        ),
      ),
      const MechanicSection('Kiểm tra trước bàn giao'),
      const MechanicPanel(
        child: Column(
          children: [
            MechanicInfo(
              icon: Icons.verified_outlined,
              title: 'An toàn vận hành',
              value: 'Kiểm tra máy nổ đều, không có tiếng lạ và rò rỉ.',
            ),
            Divider(),
            MechanicInfo(
              icon: Icons.info_outline,
              title: 'Mô phỏng quy trình',
              value: 'Checklist chỉ lưu tạm trên màn hình, chưa gửi biên bản sửa chữa lên hệ thống.',
            ),
          ],
        ),
      ),
    ],
  );
}

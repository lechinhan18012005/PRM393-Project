import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';

typedef MechanicPanel = RescuePanel;
typedef MechanicLabel = RescueLabel;
typedef MechanicSection = RescueSection;
typedef MechanicInfo = RescueInfo;

class MechanicDemoNotice extends StatelessWidget {
  const MechanicDemoNotice({super.key});
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.only(bottom: 12),
    child: MechanicLabel(
      'MÔ PHỎNG • Chưa xử lý đơn hoặc thanh toán thật',
      color: AppColors.primary,
    ),
  );
}

class MechanicPage extends StatelessWidget {
  const MechanicPage({
    super.key,
    required this.title,
    required this.children,
    this.bottom,
  });
  final String title;
  final List<Widget> children;
  final Widget? bottom;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.background,
    appBar: AppBar(
      title: Text(
        title,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
      ),
    ),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [const MechanicDemoNotice(), ...children],
        ),
      ),
    ),
    bottomNavigationBar: bottom == null
        ? null
        : SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
              child: bottom,
            ),
          ),
  );
}

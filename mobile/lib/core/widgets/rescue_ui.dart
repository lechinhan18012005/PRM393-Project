import 'package:flutter/material.dart';

import '../constants/app_colors.dart';

class RescuePanel extends StatelessWidget {
  const RescuePanel({
    super.key,
    required this.child,
    this.padding = 16,
    this.dark = false,
  });
  final Widget child;
  final double padding;
  final bool dark;
  @override
  Widget build(BuildContext context) => Material(
    color: dark ? const Color(0xFF112C42) : Colors.white,
    clipBehavior: Clip.antiAlias,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(
        color: dark ? const Color(0xFF112C42) : AppColors.outlineVariant,
      ),
    ),
    child: Padding(padding: EdgeInsets.all(padding), child: child),
  );
}

class RescueLabel extends StatelessWidget {
  const RescueLabel(this.text, {super.key, this.color = AppColors.tertiary});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(
      color: color.withValues(alpha: .1),
      borderRadius: BorderRadius.circular(6),
    ),
    child: Text(
      text,
      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
    ),
  );
}

class RescueSection extends StatelessWidget {
  const RescueSection(this.title, {super.key, this.action});
  final String title;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 20, bottom: 10),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
        ),
        ?action,
      ],
    ),
  );
}

class RescueInfo extends StatelessWidget {
  const RescueInfo({
    super.key,
    required this.icon,
    required this.title,
    required this.value,
  });
  final IconData icon;
  final String title, value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 9),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 19, color: AppColors.secondary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class RescueIntro extends StatelessWidget {
  const RescueIntro({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.description,
    this.trailing,
  });
  final String eyebrow, title, description;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => RescuePanel(
    dark: true,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow,
          style: const TextStyle(
            color: Color(0xFF99B4C6),
            fontSize: 10,
            letterSpacing: 1.3,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 9),
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w800,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          description,
          style: const TextStyle(
            color: Color(0xFFB9CEDB),
            fontSize: 12,
            height: 1.6,
          ),
        ),
        if (trailing != null) ...[const SizedBox(height: 14), trailing!],
      ],
    ),
  );
}

class RescueDemoNote extends StatelessWidget {
  const RescueDemoNote(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: RescueLabel(text, color: AppColors.primary),
  );
}

import 'package:flutter/material.dart';

import '../constants/app_colors.dart';

/// Secondary explanations stay available without crowding the main action.
class InfoDetails extends StatelessWidget {
  const InfoDetails({
    super.key,
    required this.child,
    this.title = 'Xem chi tiết',
  });

  final Widget child;
  final String title;

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      childrenPadding: const EdgeInsets.only(bottom: 12),
      expandedCrossAxisAlignment: CrossAxisAlignment.start,
      shape: const Border(),
      collapsedShape: const Border(),
      iconColor: AppColors.secondary,
      collapsedIconColor: AppColors.secondary,
      title: Text(
        title,
        style: const TextStyle(fontSize: 13, color: AppColors.secondary),
      ),
      children: [Align(alignment: Alignment.centerLeft, child: child)],
    );
  }
}

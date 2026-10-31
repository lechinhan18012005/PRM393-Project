import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../screens/customer/review_quotation_screen.dart';
import 'quotation_api.dart';
import 'quotation_models.dart';

class QuotationStatusBanner extends StatefulWidget {
  const QuotationStatusBanner({super.key, required this.orderId});

  final int orderId;

  @override
  State<QuotationStatusBanner> createState() => _QuotationStatusBannerState();
}

class _QuotationStatusBannerState extends State<QuotationStatusBanner> {
  final _api = QuotationApi();
  Timer? _timer;
  QuotationModel? _latest;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _load());
  }

  Future<void> _load() async {
    try {
      final history = await _api.history(widget.orderId);
      if (!mounted) return;
      final latest = history.where((item) => item.latest).toList();
      setState(() => _latest = latest.isEmpty ? null : latest.first);
    } catch (_) {
      // Tracking vẫn hoạt động khi endpoint báo giá chưa sẵn sàng.
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _openQuotation() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ReviewQuotationScreen(orderId: widget.orderId),
      ),
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final quotation = _latest;
    if (quotation == null) return const SizedBox.shrink();

    final pending = quotation.status == 'PENDING_APPROVAL';
    final title = switch (quotation.status) {
      'PENDING_APPROVAL' => 'Báo giá đang chờ bạn duyệt',
      'FINALIZED' => 'Báo giá đã được duyệt',
      'REVISION_REQUESTED' => 'Đã yêu cầu điều chỉnh báo giá',
      'REJECTED' => 'Báo giá đã bị từ chối',
      _ => 'Báo giá phiên bản ${quotation.version}',
    };

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Material(
        color: pending ? AppColors.primaryContainer : Colors.blueGrey.shade50,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: pending ? _openQuotation : null,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  pending
                      ? Icons.receipt_long_outlined
                      : Icons.verified_outlined,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${quotation.total.toStringAsFixed(0)} đ${pending ? ' · Chạm để xem chi tiết' : ''}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.secondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (pending) const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

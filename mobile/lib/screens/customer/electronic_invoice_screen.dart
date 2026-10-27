import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/payment_transaction_model.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/widgets/rescue_ui.dart';
import 'stitch_hydro_rescue_screen.dart';

class ElectronicInvoiceScreen extends StatelessWidget {
  final PaymentTransactionModel? transaction;
  final RescueOrderModel? order;

  const ElectronicInvoiceScreen({
    super.key,
    this.transaction,
    this.order,
  });

  bool get _isReal => transaction != null || order != null;

  String _formatVnd(double val) {
    final intVal = val.round();
    final str = intVal.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(str[i]);
    }
    return '${buffer.toString()} đ';
  }

  @override
  Widget build(BuildContext context) {
    final code = transaction?.rescueCode ??
        order?.orderCode ??
        '#RC-DEMO-8924';
    final total = transaction?.amount ??
        order?.totalAmount ??
        150000.0;
    final basePrice = order?.serviceBasePrice ?? (total - 30000.0);
    final bookingFee = order?.bookingFee ?? 30000.0;
    final garageName = transaction?.garageName ??
        order?.garageName ??
        'Trung tâm cứu hộ liên kết';
    final customerName = order?.customerName ??
        transaction?.customerName ??
        'Khách hàng cứu hộ';
    final vehicleInfo = [
      if (order?.vehiclePlate != null && order!.vehiclePlate.isNotEmpty) order!.vehiclePlate,
      if (order?.vehicleModel != null && order!.vehicleModel!.isNotEmpty) order!.vehicleModel!,
    ].join(' • ');
    final serviceName = order?.serviceName ?? 'Chở xe máy qua điểm ngập (Chuyến riêng)';
    final methodStr = (transaction?.paymentMethod == 'CASH')
        ? 'Tiền mặt tại hiện trường'
        : 'PayOS VietQR';
    final refCode = transaction?.payosOrderCode != null && transaction!.payosOrderCode > 0
        ? '#${transaction!.payosOrderCode}'
        : (order?.paymentOrderCode != null ? '#${order!.paymentOrderCode}' : 'RESCUE-$code');
    final paidAtStr = transaction?.paidAt ?? order?.paidAt ?? 'Đã hoàn tất';

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Biên nhận thanh toán cứu hộ',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const RescueIntro(
              eyebrow: 'THÔNG TIN BIÊN NHẬN',
              title: 'Biên nhận cứu hộ dịch vụ',
              description: 'Lưu lại chi tiết chi phí và xác nhận hoàn tất thanh toán.',
            ),
            const SizedBox(height: 12),
            if (!_isReal)
              const RescueDemoNote(
                'Biên nhận minh họa · Chưa có giao dịch thật',
              ),
            // Receipt Paper Box
            RescuePanel(
              padding: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'BIÊN NHẬN DỊCH VỤ',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryOrange,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Hệ thống cứu hộ Motorbike Flood Rescue',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.secondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green.shade300),
                        ),
                        child: Text(
                          'ĐÃ THANH TOÁN',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.green.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),

                  Text(
                    'Mã đơn cứu hộ: $code',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Mã tham chiếu thanh toán: $refCode',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Thời gian hoàn tất: $paidAtStr',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Đơn vị thực hiện: $garageName',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Khách hàng: $customerName${vehicleInfo.isNotEmpty ? " • $vehicleInfo" : ""}',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                  ),

                  const SizedBox(height: 16),
                  const Text(
                    'CHI TIẾT DỊCH VỤ CỨU HỘ',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.outline,
                    ),
                  ),
                  const SizedBox(height: 8),

                  _buildDetailRow(serviceName, _formatVnd(basePrice)),
                  _buildDetailRow('Phí dịch vụ khẩn cấp & điều phối', _formatVnd(bookingFee)),
                  _buildDetailRow('Phương thức thanh toán', methodStr),

                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          'TỔNG THANH TOÁN:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Text(
                        _formatVnd(total),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppColors.primaryOrange,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: Column(
                      children: [
                        const Icon(
                          Icons.verified_user_outlined,
                          size: 40,
                          color: Colors.green,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Xác nhận thanh toán hợp lệ trên hệ thống HydroRescue',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                    builder: (_) => const StitchHydroRescueScreen(),
                  ),
                  (route) => false,
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
                'Về Trang Chủ Khách Hàng',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 6,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.onSurface,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            flex: 5,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

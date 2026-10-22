import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';
import 'payment_success_screen.dart';

class VietQRPaymentScreen extends StatefulWidget {
  const VietQRPaymentScreen({super.key});

  @override
  State<VietQRPaymentScreen> createState() => _VietQRPaymentScreenState();
}

class _VietQRPaymentScreenState extends State<VietQRPaymentScreen> {
  int _paymentMethod = 0; // 0: VietQR, 1: Cash

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Thanh toán',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
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
              eyebrow: 'HOÀN TẤT HÀNH TRÌNH',
              title: 'Chọn cách thanh toán',
              description: 'Kiểm tra thông tin và phương thức thanh toán.',
            ),
            const SizedBox(height: 12),
            const RescueDemoNote(
              'Mô phỏng · Chưa xử lý giao dịch hoặc gửi dữ liệu thật',
            ),
            // Payment method selector
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _paymentMethod = 0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _paymentMethod == 0
                              ? Colors.white
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            Icon(
                              Icons.qr_code_2,
                              size: 18,
                              color: _paymentMethod == 0
                                  ? AppColors.primaryOrange
                                  : AppColors.secondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'VietQR PayOS',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: _paymentMethod == 0
                                    ? AppColors.primaryOrange
                                    : AppColors.secondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _paymentMethod = 1),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _paymentMethod == 1
                              ? Colors.white
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            Icon(
                              Icons.payments,
                              size: 18,
                              color: _paymentMethod == 1
                                  ? AppColors.primaryOrange
                                  : AppColors.secondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Tiền mặt cho thợ',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: _paymentMethod == 1
                                    ? AppColors.primaryOrange
                                    : AppColors.secondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Main VietQR Box
            RescuePanel(
              padding: 16,
              child: Column(
                children: [
                  // Timer
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Wrap(
                      spacing: 8,
                      runSpacing: 8,

                      children: [
                        Icon(
                          Icons.timer,
                          size: 14,
                          color: AppColors.primaryOrange,
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Thời gian giữ mã: 14:45',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Simulated Dynamic VietQR Code Box
                  Container(
                    width: 200,
                    constraints: const BoxConstraints(minHeight: 200),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.qr_code,
                          size: 130,
                          color: Color(0xFF111C2D),
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            const Icon(
                              Icons.verified,
                              size: 14,
                              color: Colors.blue,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'PayOS • NAPAS 247',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue.shade900,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Quét mã bằng ứng dụng ngân hàng hoặc ví điện tử.',
                    style: TextStyle(fontSize: 11, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 8),

                  // Bank details
                  _buildBankRow(
                    'Số tiền thanh toán',
                    '290.000 đ',
                    highlight: true,
                  ),
                  _buildBankRow('Ngân hàng thụ hưởng', 'MB Bank (Quân Đội)'),
                  _buildBankRow('Số tài khoản', '038299482910'),
                  _buildBankRow('Chủ tài khoản', 'HE THONG CUU HO HYDRORESCUE'),
                  _buildBankRow('Nội dung chuyển khoản', 'RESCUE 8924'),
                ],
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const PaymentSuccessScreen(),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.tertiary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Xác Nhận Đã Thanh Toán',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBankRow(String label, String value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        alignment: WrapAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppColors.secondary),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: highlight ? 16 : 12,
              fontWeight: FontWeight.bold,
              color: highlight ? AppColors.primaryOrange : AppColors.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

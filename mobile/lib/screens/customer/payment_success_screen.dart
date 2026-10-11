import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'electronic_invoice_screen.dart';
import 'rating_review_screen.dart';

class PaymentSuccessScreen extends StatelessWidget {
  const PaymentSuccessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Xác Nhận Thanh Toán', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),
            // Success Check Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.green.shade300, width: 2),
              ),
              child: const Icon(Icons.check_circle, color: Colors.green, size: 54),
            ),
            const SizedBox(height: 20),
            const Text('GIAO DỊCH THÀNH CÔNG!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green)),
            const SizedBox(height: 6),
            const Text(
              'Hệ thống PayOS Webhook đã tự động xác nhận thanh toán gạch nợ cho đơn hàng #PRM-8924',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.secondary),
            ),
            const SizedBox(height: 24),

            // Settlement Receipt Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.surfaceContainerHigh),
              ),
              child: const Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Số tiền thanh toán:', style: TextStyle(fontSize: 13, color: AppColors.secondary)),
                      Text('290.000 đ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primaryOrange)),
                    ],
                  ),
                  SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Phương thức:', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                      Text('PayOS VietQR (MB Bank)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Thợ thực hiện:', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                      Text('Phạm Tuấn Anh (Gara Q.7)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Bảo hành dịch vụ:', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                      Text('30 Ngày (đến 11/11/2026)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Button 1: Xem hóa đơn & bảo hành
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ElectronicInvoiceScreen()),
                );
              },
              icon: const Icon(Icons.receipt, size: 18),
              label: const Text('Xem Hóa Đơn Điện Tử & Bảo Hành', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),

            // Button 2: Đánh giá thợ cứu hộ
            OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const RatingReviewScreen()),
                );
              },
              icon: const Icon(Icons.star, color: Colors.amber, size: 20),
              label: const Text('Đánh Giá & Nhận Xét Thợ (1-5 ⭐)', style: TextStyle(fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

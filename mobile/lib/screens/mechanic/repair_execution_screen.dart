import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../customer/vietqr_payment_screen.dart';

class RepairExecutionScreen extends StatefulWidget {
  const RepairExecutionScreen({super.key});

  @override
  State<RepairExecutionScreen> createState() => _RepairExecutionScreenState();
}

class _RepairExecutionScreenState extends State<RepairExecutionScreen> {
  final Map<String, bool> _checklist = {
    '1. Tháo bugi, sấy khô & xịt dung dịch chống ẩm': true,
    '2. Xoay máy xả sạch nước đọng trong buồng đốt': true,
    '3. Xả nhớt cũ nhiễm nước, thay nhớt mới Castrol': true,
    '4. Kiểm tra lọc gió, vệ sinh họng ga & dây điện': true,
    '5. Đề nổ máy thành công, garanti nổ đều': false,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Sửa chữa & bàn giao',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Order status pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  Icon(Icons.check_circle, color: Colors.green, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Khách đã duyệt báo giá #QUO-8924-V2 (290.000 đ)',
                    style: TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text(
              'Các bước sửa chữa',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),

            // Checklist Card
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x05000000),
                    blurRadius: 4,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: _checklist.keys.map((task) {
                  return Material(
                    color: Colors.transparent,
                    child: CheckboxListTile(
                      title: Text(
                        task,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      value: _checklist[task],
                      activeColor: Colors.green,
                      onChanged: (val) {
                        setState(() {
                          _checklist[task] = val ?? false;
                        });
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 20),

            // Photos of Completed Repair
            const Text(
              'ẢNH NGHIỆM THU HIỆN TRƯỜNG *',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildEvidencePhoto(true, 'Ảnh bugi & nhớt cũ'),
                const SizedBox(width: 10),
                _buildEvidencePhoto(true, 'Ảnh xe nổ máy giòn'),
                const SizedBox(width: 10),
                _buildEvidencePhoto(false, '+ Thêm ảnh'),
              ],
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const VietQRPaymentScreen(),
                  ),
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
                'Hoàn tất & thanh toán',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEvidencePhoto(bool exists, String label) {
    return Expanded(
      child: Container(
        height: 75,
        decoration: BoxDecoration(
          color: exists ? Colors.green.shade50 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: exists ? Colors.green : Colors.grey.shade300,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              exists ? Icons.check_circle : Icons.camera_alt,
              color: exists ? Colors.green : Colors.grey,
              size: 22,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 9,
                color: exists ? Colors.green : Colors.grey.shade700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

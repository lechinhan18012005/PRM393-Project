import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/auth_service.dart';
import '../../core/widgets/rescue_ui.dart';
import 'payment_success_screen.dart';

class VietQRPaymentScreen extends StatefulWidget {
  final int rescueOrderId;
  final int garageId;
  final double amount;
  final String rescueCode;

  const VietQRPaymentScreen({
    super.key,
    this.rescueOrderId = 8924,
    this.garageId = 1,
    this.amount = 290000,
    this.rescueCode = '#RESCUE-8924',
  });

  @override
  State<VietQRPaymentScreen> createState() => _VietQRPaymentScreenState();
}

class _VietQRPaymentScreenState extends State<VietQRPaymentScreen> {
  int _paymentMethod = 0; // 0: VietQR, 1: Cash
  bool _isLoading = false;
  int? _payosOrderCode;
  String _bankName = 'MB Bank (Quân Đội)';
  String _accountNumber = '038299482910';
  String _accountHolder = 'HE THONG CUU HO HYDRORESCUE';
  String _paymentContent = 'RESCUE 8924';
  double _commissionRate = 12.5;
  double _platformFee = 36250;
  double _netGarageAmount = 253750;

  @override
  void initState() {
    super.initState();
    _initPaymentOrder();
  }

  Future<void> _initPaymentOrder() async {
    try {
      final token = await AuthService().getToken();
      if (token == null || token.isEmpty) return;

      final response = await http.post(
        Uri.parse(ApiConstants.createPaymentUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'rescueOrderId': widget.rescueOrderId,
          'garageId': widget.garageId,
          'rescueCode': widget.rescueCode,
          'orderType': 'SINGLE_CROSSING',
          'amount': widget.amount,
          'paymentMethod': _paymentMethod == 0 ? 'PAYOS_VIETQR' : 'CASH',
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        final data = decoded['data'];
        if (data != null && mounted) {
          setState(() {
            _payosOrderCode = (data['payosOrderCode'] as num?)?.toInt();
            _bankName = data['bankName'] ?? _bankName;
            _accountNumber = data['accountNumber'] ?? _accountNumber;
            _accountHolder = data['accountHolder'] ?? _accountHolder;
            _paymentContent = data['paymentContent'] ?? _paymentContent;
            _commissionRate =
                (data['commissionRate'] as num?)?.toDouble() ?? _commissionRate;
            _platformFee =
                (data['platformFee'] as num?)?.toDouble() ?? _platformFee;
            _netGarageAmount =
                (data['netGarageAmount'] as num?)?.toDouble() ??
                _netGarageAmount;
          });
        }
      }
    } catch (_) {
      // Fallback to local VietQR display when backend is offline
    }
  }

  Future<void> _confirmPayment() async {
    setState(() => _isLoading = true);
    try {
      final token = await AuthService().getToken();
      if (token != null && token.isNotEmpty && _payosOrderCode != null) {
        final url = _paymentMethod == 0
            ? ApiConstants.simulateWebhookUrl(_payosOrderCode!)
            : ApiConstants.confirmCashPaymentUrl(_payosOrderCode!);

        await http.post(
          Uri.parse(url),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        );
      }
    } catch (_) {
      // Continue to success screen in demo/offline mode
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const PaymentSuccessScreen()),
        );
      }
    }
  }

  String _formatVnd(double value) {
    final intVal = value.round();
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
                    _formatVnd(widget.amount),
                    highlight: true,
                  ),
                  _buildBankRow('Ngân hàng thụ hưởng', _bankName),
                  _buildBankRow('Số tài khoản', _accountNumber),
                  _buildBankRow('Chủ tài khoản', _accountHolder),
                  _buildBankRow('Nội dung chuyển khoản', _paymentContent),
                  _buildBankRow(
                    'Phí điều phối (${_commissionRate.toStringAsFixed(1)}%)',
                    _formatVnd(_platformFee),
                  ),
                  _buildBankRow(
                    'Thực cộng ví Gara',
                    _formatVnd(_netGarageAmount),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: _isLoading ? null : _confirmPayment,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.tertiary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                _isLoading ? 'Đang xử lý...' : 'Xác Nhận Đã Thanh Toán',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
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

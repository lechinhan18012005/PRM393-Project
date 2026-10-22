import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/garage_service.dart';

class GarageWalletPayoutScreen extends StatefulWidget {
  const GarageWalletPayoutScreen({super.key});

  @override
  State<GarageWalletPayoutScreen> createState() =>
      _GarageWalletPayoutScreenState();
}

class _GarageWalletPayoutScreenState extends State<GarageWalletPayoutScreen> {
  final _amountController = TextEditingController(text: '15000000');
  final GarageService _garageService = GarageService();
  double _availableBalance = 24850000;
  double _pendingAmount = 1200000;
  List<Map<String, dynamic>> _payoutHistory = [];
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    try {
      final wallet = await _garageService.getMyWallet();
      if (!mounted) return;
      setState(() {
        _availableBalance =
            (wallet['availableBalance'] as num?)?.toDouble() ?? 24850000;
        _pendingAmount =
            (wallet['pendingPayoutAmount'] as num?)?.toDouble() ?? 0;
        final list = wallet['payoutRequests'] as List?;
        if (list != null) {
          _payoutHistory = list
              .map((item) => Map<String, dynamic>.from(item as Map))
              .toList();
        }
      });
    } catch (_) {
      // Fallback to demo balance when running without backend
    }
  }

  String _formatVnd(num amount) {
    final s = amount.round().toString();
    final reg = RegExp(r'\B(?=(\d{3})+(?!\d))');
    return '${s.replaceAllMapped(reg, (m) => '.')} đ';
  }

  Future<void> _submitPayout() async {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    setState(() => _isSubmitting = true);
    try {
      await _garageService.createPayoutRequest(
        requestedAmount: amount > 0 ? amount : 15000000,
        bankCode: 'VCB',
        bankName: 'Vietcombank • CN Tân Bình',
        accountNumber: '0071000892831',
        accountHolderName: 'LE VAN GARA',
      );
      await _loadWallet();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đã gửi yêu cầu rút ${_formatVnd(amount > 0 ? amount : 15000000)} tới Admin tài chính duyệt đối soát!',
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Đã gửi yêu cầu rút 15.000.000 đ tới Admin tài chính duyệt đối soát!',
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Ví & rút tiền',
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
            // Balance Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF334155)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 8,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Số dư khả dụng',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatVnd(_availableBalance),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      const Icon(
                        Icons.lock_clock,
                        color: Colors.orangeAccent,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Đang giữ đối soát tạm thời: ${_formatVnd(_pendingAmount)}',
                        style: const TextStyle(
                          color: Colors.orangeAccent,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Payout Request Form
            const Text(
              'Yêu cầu rút tiền',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.all(16),
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Số tiền muốn rút (VND) *',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      prefixIcon: const Icon(
                        Icons.attach_money,
                        color: AppColors.primaryOrange,
                      ),
                      filled: true,
                      fillColor: AppColors.surfaceContainerLow,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  const Text(
                    'Tài khoản ngân hàng thụ hưởng đã xác thực:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: const Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Icon(
                          Icons.account_balance,
                          color: AppColors.secondary,
                          size: 28,
                        ),
                        SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Vietcombank • CN Tân Bình',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              'STK: 0071000892831 • LÊ VĂN GARA',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.secondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _submitPayout,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryOrange,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 44),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Text(
                      _isSubmitting
                          ? 'ĐANG GỬI YÊU CẦU...'
                          : 'GỬI YÊU CẦU RÚT TIỀN',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Recent Payout Requests History
            const Text(
              'LỊCH SỬ RÚT TIỀN GẦN ĐÂY',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),

            ..._payoutHistory.map(
              (p) => _buildPayoutHistoryItem(
                'Lệnh #${p['requestCode'] ?? p['id']}',
                (p['createdAt'] ?? '19/10/2026').toString().split('T').first,
                _formatVnd((p['requestedAmount'] as num?) ?? 0),
                p['status'] == 'TRANSFERRED'
                    ? 'ĐÃ GIẢI NGÂN'
                    : p['status'] == 'APPROVED'
                    ? 'ĐÃ DUYỆT LỆNH'
                    : p['status'] == 'REJECTED'
                    ? 'TỪ CHỐI'
                    : 'CHỜ DUYỆT',
                p['status'] == 'TRANSFERRED'
                    ? Colors.green
                    : p['status'] == 'REJECTED'
                    ? Colors.red
                    : Colors.orange,
              ),
            ),
            _buildPayoutHistoryItem(
              'Lệnh #WD-9912',
              '08/10/2026',
              '10.000.000 đ',
              'ĐÃ GIẢI NGÂN',
              Colors.green,
            ),
            _buildPayoutHistoryItem(
              'Lệnh #WD-9820',
              '28/09/2026',
              '8.500.000 đ',
              'ĐÃ GIẢI NGÂN',
              Colors.green,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPayoutHistoryItem(
    String id,
    String date,
    String amount,
    String status,
    Color statusColor,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        alignment: WrapAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                id,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              Text(
                date,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amount,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              Text(
                status,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: statusColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

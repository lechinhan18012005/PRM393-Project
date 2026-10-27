import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/payment_transaction_model.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/rescue_service.dart';
import '../../core/widgets/rescue_ui.dart';
import 'payment_success_screen.dart';

class VietQRPaymentScreen extends StatefulWidget {
  final int? orderId;
  final int? garageId;
  final double? amount;
  final String? orderCode;
  final RescueOrderModel? rescueOrder;
  final PaymentService? paymentService;
  final RescueService? rescueService;
  final bool enableDemoSimulation;
  final bool autoPolling;

  int? get rescueOrderId => orderId ?? rescueOrder?.id;
  String get rescueCode =>
      orderCode ??
      rescueOrder?.orderCode ??
      (orderId != null ? 'SOS-$orderId' : 'RO-DEMO-8924');

  const VietQRPaymentScreen({
    super.key,
    int? orderId,
    int? rescueOrderId,
    this.garageId,
    this.amount,
    String? orderCode,
    String? rescueCode,
    this.rescueOrder,
    this.paymentService,
    this.rescueService,
    this.enableDemoSimulation = false,
    this.autoPolling = true,
  }) : assert(
         orderId == null || rescueOrderId == null || orderId == rescueOrderId,
       ),
       orderId = orderId ?? rescueOrderId,
       orderCode = orderCode ?? rescueCode;

  @override
  State<VietQRPaymentScreen> createState() => _VietQRPaymentScreenState();
}

class _VietQRPaymentScreenState extends State<VietQRPaymentScreen>
    with WidgetsBindingObserver {
  late final PaymentService _paymentService;
  late final RescueService _rescueService;

  PaymentTransactionModel? _transaction;
  bool _isLoading = false;
  bool _isCheckingStatus = false;
  String? _errorMessage;
  Timer? _pollingTimer;
  bool _isScreenActive = true;
  bool _statusRequestInFlight = false;
  bool _successPresented = false;

  bool get _isPreview =>
      (widget.rescueOrderId == null && widget.rescueOrder == null) ||
      (widget.garageId == null && widget.rescueOrder?.garageId == null) ||
      (widget.amount == null && widget.rescueOrder?.totalAmount == null);

  bool get _isSimulation =>
      _transaction?.isSimulation == true || widget.enableDemoSimulation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _paymentService = widget.paymentService ?? PaymentService();
    _rescueService = widget.rescueService ?? RescueService();

    if (!_isPreview) {
      _initPaymentOrder();
    }
  }

  @override
  void dispose() {
    _stopPolling();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _isScreenActive = true;
      if (_transaction?.isSuccess == true) {
        _handlePaymentSuccess(_transaction!);
      } else if (_transaction != null && !_transaction!.isTerminal) {
        _checkPaymentStatus(silent: true);
        _startPolling();
      }
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _isScreenActive = false;
      _stopPolling();
    }
  }

  void _startPolling() {
    _stopPolling();
    if (!widget.autoPolling ||
        !_isScreenActive ||
        _transaction == null ||
        _transaction!.isTerminal) {
      return;
    }
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (_isScreenActive && mounted) {
        _checkPaymentStatus(silent: true);
      }
    });
  }

  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> _initPaymentOrder() async {
    if (_isLoading) return;
    final orderId = widget.rescueOrderId;
    if (orderId == null) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final tx = await _paymentService.createPayment(
        rescueOrderId: orderId,
        garageId: widget.garageId ?? widget.rescueOrder?.garageId,
        amount: widget.amount ?? widget.rescueOrder?.totalAmount,
        rescueCode: widget.rescueCode,
        paymentMethod: 'PAYOS_VIETQR',
      );

      if (!mounted) return;

      setState(() {
        _transaction = tx;
        _isLoading = false;
      });

      if (tx.isSuccess) {
        _handlePaymentSuccess(tx);
      } else if (tx.isTerminal) {
        _showTerminalPayment(tx);
      } else {
        _startPolling();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _checkPaymentStatus({bool silent = false}) async {
    final tx = _transaction;
    if (tx == null ||
        _statusRequestInFlight ||
        !_isScreenActive ||
        _successPresented) {
      return;
    }
    _statusRequestInFlight = true;

    if (!silent) {
      setState(() => _isCheckingStatus = true);
    }

    try {
      final updated = await _paymentService.getPaymentByOrderCode(
        tx.payosOrderCode,
        forceRefresh: !silent,
      );
      if (!mounted) return;

      setState(() {
        _transaction = updated;
        if (!silent) _isCheckingStatus = false;
      });

      if (updated.isSuccess) {
        _stopPolling();
        _handlePaymentSuccess(updated);
      } else if (updated.isTerminal) {
        _showTerminalPayment(updated);
      } else if (!silent) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Chưa có xác nhận thanh toán mới. Hệ thống sẽ tự kiểm tra lại sau vài giây.',
            ),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      if (!silent) {
        setState(() => _isCheckingStatus = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      _statusRequestInFlight = false;
    }
  }

  void _showTerminalPayment(PaymentTransactionModel tx) {
    _stopPolling();
    if (!mounted) return;
    setState(
      () => _errorMessage = tx.isDuplicatePaid
          ? 'Khoản thanh toán đang chờ đối soát. Vui lòng liên hệ hỗ trợ, không thanh toán thêm.'
          : 'Giao dịch ${tx.status}. Chọn thử lại để xác minh và khởi tạo lại khi hợp lệ.',
    );
  }

  Future<void> _syncOrderDetails() async {
    final orderId = widget.rescueOrderId;
    if (orderId == null) return;
    try {
      await _rescueService.getOrderById(orderId);
    } catch (_) {
      // Ignore background sync errors
    }
  }

  void _handlePaymentSuccess(PaymentTransactionModel tx) {
    if (!mounted || !_isScreenActive || _successPresented) return;
    _successPresented = true;
    _stopPolling();
    unawaited(_syncOrderDetails());

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => PaymentSuccessScreen(
          transaction: tx,
          order: widget.rescueOrder,
          orderId: widget.rescueOrderId,
          rescueCode: widget.rescueCode,
          amount: tx.amount,
        ),
      ),
    );
  }

  // Phương thức hỗ trợ demo / mock test nếu có yêu cầu
  Future<void> _simulateWebhookDemo() async {
    final tx = _transaction;
    if (tx == null) return;

    setState(() => _isCheckingStatus = true);
    try {
      final updated = await _paymentService.simulateWebhook(tx.payosOrderCode);
      if (!mounted) return;
      setState(() => _isCheckingStatus = false);
      if (updated.isSuccess) {
        _handlePaymentSuccess(updated);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isCheckingStatus = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
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
    final displayAmount =
        _transaction?.amount ??
        widget.amount ??
        widget.rescueOrder?.totalAmount ??
        150000.0;
    final commissionRate = _transaction?.commissionRate ?? 10.0;
    final platformFee =
        _transaction?.platformFee ?? (displayAmount * commissionRate / 100);
    final netGarageAmount =
        _transaction?.netGarageAmount ?? (displayAmount - platformFee);
    final bankName = _transaction?.bankName ?? 'MB Bank (Quân Đội)';
    final accountNumber = _transaction?.accountNumber ?? '038299482910';
    final accountHolder =
        _transaction?.accountHolder ?? 'HE THONG CUU HO HYDRORESCUE';
    final paymentContent =
        _transaction?.paymentContent ?? 'RESCUE ${widget.rescueCode}';

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Thanh toán dịch vụ',
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
            RescueIntro(
              eyebrow: 'HOÀN TẤT HÀNH TRÌNH',
              title: 'Thanh toán đơn #${widget.rescueCode}',
              description:
                  'Quét mã VietQR chuyển khoản nhanh 24/7 qua cổng PayOS.',
            ),
            const SizedBox(height: 12),
            if (_isPreview)
              const RescueDemoNote(
                'UC-18 Preview · Chưa tạo giao dịch thanh toán',
              )
            else if (_isSimulation)
              const RescueDemoNote(
                'Môi trường Test · Có bật nút giả lập xác nhận PayOS',
              ),

            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: Colors.red,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.red.shade800,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 20),
                      onPressed: _initPaymentOrder,
                      tooltip: 'Thử lại',
                    ),
                  ],
                ),
              ),
            ],

            // Main VietQR Box
            RescuePanel(
              padding: 16,
              child: Column(
                children: [
                  // Status & Polling Indicator
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_transaction?.isFailed == true) ...[
                            const Icon(
                              Icons.cancel,
                              size: 14,
                              color: Colors.red,
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'Thanh toán không thành công',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.red,
                              ),
                            ),
                          ] else if (_transaction?.isDuplicatePaid == true) ...[
                            const Icon(
                              Icons.warning_amber_rounded,
                              size: 14,
                              color: Colors.orange,
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'Thanh toán trùng / Chờ đối soát',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.orange,
                              ),
                            ),
                          ] else if (_isCheckingStatus) ...[
                            const SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Đang kiểm tra kết quả...',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ] else ...[
                            const Icon(
                              Icons.sync,
                              size: 14,
                              color: AppColors.primaryOrange,
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'Tự động kiểm tra mỗi 3s',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Dynamic VietQR Code Box
                  Container(
                    width: 220,
                    constraints: const BoxConstraints(minHeight: 220),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade300),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildQrDisplayWidget(),
                        const SizedBox(height: 6),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
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
                        ),
                      ],
                    ),
                  ),
                  if (_transaction?.isTerminal != true &&
                      _transaction?.checkoutUrl != null &&
                      _transaction!.checkoutUrl!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: () =>
                          _openCheckoutUrl(_transaction!.checkoutUrl!),
                      icon: const Icon(Icons.open_in_browser, size: 18),
                      label: const Text('Mở trang thanh toán PayOS (Web)'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.blue.shade900,
                        side: BorderSide(color: Colors.blue.shade300),
                        padding: const EdgeInsets.symmetric(
                          vertical: 8,
                          horizontal: 14,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  const Text(
                    'Mở app ngân hàng bất kỳ để quét mã QR và thanh toán.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: AppColors.secondary),
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 8),

                  // Bank details
                  _buildBankRow(
                    'Số tiền thanh toán',
                    _formatVnd(displayAmount),
                    highlight: true,
                  ),
                  _buildBankRow('Ngân hàng thụ hưởng', bankName),
                  _buildBankRow('Số tài khoản', accountNumber),
                  _buildBankRow('Chủ tài khoản', accountHolder),
                  _buildBankRow('Nội dung chuyển khoản', paymentContent),
                  _buildBankRow(
                    'Phí điều phối (${commissionRate.toStringAsFixed(1)}%)',
                    _formatVnd(platformFee),
                  ),
                  _buildBankRow('Thực nhận Gara', _formatVnd(netGarageAmount)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Nút "Kiểm tra thanh toán" chính thức
            ElevatedButton.icon(
              onPressed: (_isLoading || _isCheckingStatus)
                  ? null
                  : () {
                      if (_isPreview) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const PaymentSuccessScreen(),
                          ),
                        );
                      } else {
                        _checkPaymentStatus(silent: false);
                      }
                    },
              icon: _isCheckingStatus
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.check_circle_outline, size: 20),
              label: Text(
                _isLoading
                    ? 'Đang khởi tạo...'
                    : (_isPreview
                          ? 'Xác nhận xem trước (Preview)'
                          : 'Kiểm tra thanh toán'),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),

            // Nút giả lập demo nếu môi trường simulation được bật
            if (_isSimulation && !_isPreview) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: (_isLoading || _isCheckingStatus)
                    ? null
                    : _simulateWebhookDemo,
                icon: const Icon(Icons.science_outlined, size: 18),
                label: const Text('Giả lập xác nhận PayOS (Demo Test)'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildQrDisplayWidget() {
    if (_transaction?.isTerminal == true) {
      return const Text('Mã thanh toán không còn hiệu lực.');
    }
    if (_isLoading) {
      return const SizedBox(
        height: 160,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final qr = _transaction?.qrCode;
    if (qr == null || qr.trim().isEmpty) {
      return Container(
        height: 160,
        width: 160,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.qr_code_scanner_outlined,
              size: 40,
              color: Colors.orange.shade800,
            ),
            const SizedBox(height: 8),
            const Text(
              'Chưa có dữ liệu mã QR',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.secondary,
              ),
            ),
          ],
        ),
      );
    }

    final trimmedQr = qr.trim();
    if (trimmedQr.startsWith('http://') || trimmedQr.startsWith('https://')) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          trimmedQr,
          width: 160,
          height: 160,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) => Container(
            height: 160,
            width: 160,
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.broken_image_outlined,
                  size: 40,
                  color: Colors.red.shade400,
                ),
                const SizedBox(height: 6),
                const Text(
                  'Lỗi tải ảnh QR',
                  style: TextStyle(fontSize: 11, color: Colors.red),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // PayOS raw EMVCo VietQR String payload (e.g. 000201...)
    return Container(
      width: 160,
      height: 160,
      alignment: Alignment.center,
      child: QrImageView(
        data: trimmedQr,
        version: QrVersions.auto,
        size: 160.0,
        backgroundColor: Colors.white,
      ),
    );
  }

  Future<void> _openCheckoutUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null) {
      try {
        final canLaunch = await canLaunchUrl(uri);
        if (canLaunch) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          return;
        }
      } catch (_) {}
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không thể mở liên kết thanh toán.')),
      );
    }
  }

  Widget _buildBankRow(String label, String value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 5,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.secondary),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontSize: highlight ? 16 : 12,
                fontWeight: FontWeight.bold,
                color: highlight
                    ? AppColors.primaryOrange
                    : AppColors.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

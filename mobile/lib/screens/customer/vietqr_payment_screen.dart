// ============================================================================
// TẬP TIN: vietqr_payment_screen.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 5: Thanh toán & Đối soát (UC-18)
// MÔ TẢ NGHIỆP VỤ & KỸ THUẬT:
//   - Màn hình thanh toán trực tuyến VietQR 24/7 tích hợp cổng thanh toán PayOS
//     dành cho khách hàng sau khi đội cứu hộ hoàn tất dịch vụ (UC-18).
//   - Các cơ chế kỹ thuật trọng tâm được triển khai trong màn hình này:
//       1) Khởi tạo giao dịch thanh toán tự động (`_initPaymentOrder`) ngay khi
//          vào màn hình thông qua `PaymentService.createPayment(...)`.
//       2) Cơ chế Auto-Polling thông minh (`_startPolling` / `_stopPolling`):
//          Sử dụng `Timer.periodic` mỗi 3 giây gọi API kiểm tra trạng thái giao
//          dịch ngầm (`silent: true`) và sử dụng cờ khóa `_statusRequestInFlight`
//          để chống chồng chéo (race-condition) nhiều request mạng cùng lúc.
//       3) Quản lý vòng đời ứng dụng (`WidgetsBindingObserver`):
//          Tự động tạm dừng polling khi người dùng chuyển sang ứng dụng Ngân hàng
//          để quét QR (`paused`/`inactive`), và tự động kiểm tra lại ngay lập tức
//          khi người dùng quay lại ứng dụng (`resumed`).
//       4) Kết xuất mã VietQR đa định dạng (`_buildQrDisplayWidget`):
//          Hỗ trợ đồng thời việc vẽ mã QR vector trực tiếp từ chuỗi payload chuẩn
//          EMVCo VietQR (`000201...`) bằng thư viện `qr_flutter` (`QrImageView`)
//          hoặc tải ảnh QR qua mạng (`Image.network`) nếu trả về URL hình ảnh.
//       5) Minh bạch hóa thông tin chuyển khoản và bảng phân bổ phí điều phối
//          nền tảng / doanh thu thực nhận của Gara, kèm tính năng giả lập Webhook
//          PayOS (`_simulateWebhookDemo`) phục vụ kiểm thử / thuyết trình.
// ============================================================================

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

/// Widget màn hình thanh toán dịch vụ cứu hộ qua cổng PayOS VietQR (UC-18).
///
/// Hỗ trợ cả chế độ chạy thực tế (kết nối đơn cứu hộ thật từ Backend) và chế độ
/// xem trước / kiểm thử (Preview & Simulation Mode).
class VietQRPaymentScreen extends StatefulWidget {
  /// Mã định danh (ID) của đơn cứu hộ cần thanh toán.
  final int? orderId;

  /// Mã định danh (ID) của Gara cứu hộ thụ hưởng.
  final int? garageId;

  /// Tổng số tiền cần thanh toán cho đơn cứu hộ (VNĐ).
  final double? amount;

  /// Mã hiển thị của đơn cứu hộ (ví dụ: 'SOS-1024', '#RC-8924').
  final String? orderCode;

  /// Đối tượng chi tiết đơn cứu hộ (nếu được truyền trực tiếp từ màn hình theo dõi đơn).
  final RescueOrderModel? rescueOrder;

  /// Dịch vụ thanh toán tùy chọn (cho phép inject Mock Service khi chạy Widget Test).
  final PaymentService? paymentService;

  /// Dịch vụ đơn cứu hộ tùy chọn (dùng để đồng bộ lại trạng thái đơn sau khi thanh toán).
  final RescueService? rescueService;

  /// Cờ cho phép hiển thị nút giả lập xác nhận Webhook PayOS trên giao diện Demo.
  final bool enableDemoSimulation;

  /// Cờ bật/tắt cơ chế tự động kiểm tra trạng thái thanh toán định kỳ (mặc định: `true`).
  final bool autoPolling;

  /// Getter truy xuất ID đơn cứu hộ ưu tiên từ `orderId` hoặc từ đối tượng `rescueOrder`.
  int? get rescueOrderId => orderId ?? rescueOrder?.id;

  /// Getter truy xuất mã tham chiếu đơn cứu hộ để hiển thị trên tiêu đề và nội dung chuyển khoản.
  String get rescueCode =>
      orderCode ??
      rescueOrder?.orderCode ??
      (orderId != null ? 'SOS-$orderId' : 'RO-DEMO-8924');

  /// Hàm khởi tạo [VietQRPaymentScreen] hỗ trợ linh hoạt cả hai tên tham số
  /// (`orderId` / `rescueOrderId` và `orderCode` / `rescueCode`) để tương thích
  /// với mọi luồng điều hướng trong ứng dụng.
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

/// Lớp quản lý trạng thái (State) của [VietQRPaymentScreen].
///
/// Tích hợp mixin [WidgetsBindingObserver] để lắng nghe sự kiện chuyển đổi
/// vòng đời ứng dụng (Background <-> Foreground) khi khách hàng mở App Ngân hàng.
class _VietQRPaymentScreenState extends State<VietQRPaymentScreen>
    with WidgetsBindingObserver {
  /// Instance dịch vụ gọi API thanh toán (UC-18).
  late final PaymentService _paymentService;

  /// Instance dịch vụ gọi API đồng bộ thông tin đơn cứu hộ.
  late final RescueService _rescueService;

  /// Bản ghi giao dịch thanh toán hiện tại nhận được từ Backend (chứa mã QR, số tài khoản, trạng thái...).
  PaymentTransactionModel? _transaction;

  /// Cờ trạng thái đang khởi tạo giao dịch thanh toán lần đầu.
  bool _isLoading = false;

  /// Cờ trạng thái đang kiểm tra kết quả thanh toán theo yêu cầu thủ công của người dùng.
  bool _isCheckingStatus = false;

  /// Thông báo lỗi hiển thị trên banner cảnh báo nếu khởi tạo hoặc giao dịch gặp sự cố.
  String? _errorMessage;

  /// Bộ đếm thời gian định kỳ (Timer) phục vụ cơ chế auto-polling kiểm tra trạng thái giao dịch.
  Timer? _pollingTimer;

  /// Cờ theo dõi màn hình hiện tại có đang hiển thị ở tiền cảnh (Foreground) hay không.
  bool _isScreenActive = true;

  /// Cờ khóa (Mutex Flag) ngăn không cho gửi trùng request kiểm tra trạng thái khi request trước chưa xong.
  bool _statusRequestInFlight = false;

  /// Cờ đảm bảo việc điều hướng sang màn hình `PaymentSuccessScreen` chỉ diễn ra duy nhất 1 lần.
  bool _successPresented = false;

  /// Kiểm tra xem màn hình có đang mở ở chế độ Xem trước (Preview Mode) không có dữ liệu đơn thật hay không.
  bool get _isPreview =>
      (widget.rescueOrderId == null && widget.rescueOrder == null) ||
      (widget.garageId == null && widget.rescueOrder?.garageId == null) ||
      (widget.amount == null && widget.rescueOrder?.totalAmount == null);

  /// Kiểm tra xem giao dịch hiện tại có đang bật chế độ giả lập (Simulation / Demo Test) hay không.
  bool get _isSimulation =>
      _transaction?.isSimulation == true || widget.enableDemoSimulation;

  // ==========================================================================
  // QUẢN LÝ VÒNG ĐỜI WIDGET & ỨNG DỤNG (LIFECYCLE MANAGEMENT)
  // ==========================================================================

  @override
  void initState() {
    super.initState();
    // Đăng ký observer lắng nghe trạng thái vòng đời ứng dụng (resumed, paused, inactive)
    WidgetsBinding.instance.addObserver(this);
    // Khởi tạo các dịch vụ API (ưu tiên sử dụng instance truyền từ widget nếu có)
    _paymentService = widget.paymentService ?? PaymentService();
    _rescueService = widget.rescueService ?? RescueService();

    // Nếu có đầy đủ thông tin đơn cứu hộ thực tế, tiến hành gọi API khởi tạo giao dịch VietQR ngay
    if (!_isPreview) {
      _initPaymentOrder();
    }
  }

  @override
  void dispose() {
    // Hủy bộ đếm Timer polling và gỡ bỏ observer khi màn hình bị hủy để tránh rò rỉ bộ nhớ (Memory Leak)
    _stopPolling();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Xử lý khi người dùng chuyển đổi qua lại giữa ứng dụng Cứu hộ và ứng dụng Ngân hàng / Trình duyệt PayOS.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Khi người dùng quay trở lại ứng dụng sau khi quét QR trên app ngân hàng:
      _isScreenActive = true;
      if (_transaction?.isSuccess == true) {
        // Nếu giao dịch đã thành công, chuyển ngay sang màn hình xác nhận
        _handlePaymentSuccess(_transaction!);
      } else if (_transaction != null && !_transaction!.isTerminal) {
        // Nếu giao dịch vẫn đang chờ (PENDING), lập tức kiểm tra trạng thái mới nhất và kích hoạt lại polling
        _checkPaymentStatus(silent: true);
        _startPolling();
      }
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      // Khi ứng dụng xuống nền (Background), tạm dừng Timer polling để tiết kiệm tài nguyên và băng thông
      _isScreenActive = false;
      _stopPolling();
    }
  }

  // ==========================================================================
  // CƠ CHẾ TỰ ĐỘNG KIỂM TRA TRẠNG THÁI GIAO DỊCH (AUTO-POLLING MECHANISM)
  // ==========================================================================

  /// Bắt đầu chu kỳ tự động kiểm tra trạng thái giao dịch mỗi 3 giây.
  void _startPolling() {
    // Luôn hủy timer cũ (nếu có) trước khi tạo timer mới để tránh nhân bản nhiều timer chạy song song
    _stopPolling();
    // Chỉ chạy polling nếu tính năng autoPolling được bật, màn hình đang active và giao dịch chưa kết thúc
    if (!widget.autoPolling ||
        !_isScreenActive ||
        _transaction == null ||
        _transaction!.isTerminal) {
      return;
    }
    // Thiết lập Timer định kỳ mỗi 3 giây gọi hàm kiểm tra trạng thái ở chế độ chạy ngầm (silent: true)
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (_isScreenActive && mounted) {
        _checkPaymentStatus(silent: true);
      }
    });
  }

  /// Dừng và giải phóng bộ đếm thời gian auto-polling hiện tại.
  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  // ==========================================================================
  // CÁC PHƯƠNG THỨC XỬ LÝ NGHIỆP VỤ THANH TOÁN (UC-18 API HANDLERS)
  // ==========================================================================

  /// Gọi API khởi tạo giao dịch thanh toán PayOS VietQR cho đơn cứu hộ.
  Future<void> _initPaymentOrder() async {
    // Ngăn chặn gọi lặp nếu đang trong quá trình tải
    if (_isLoading) return;
    final orderId = widget.rescueOrderId;
    if (orderId == null) return;

    // Cập nhật giao diện sang trạng thái đang tải và xóa thông báo lỗi cũ
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Gửi yêu cầu khởi tạo thanh toán VietQR lên Backend
      final tx = await _paymentService.createPayment(
        rescueOrderId: orderId,
        garageId: widget.garageId ?? widget.rescueOrder?.garageId,
        amount: widget.amount ?? widget.rescueOrder?.totalAmount,
        rescueCode: widget.rescueCode,
        paymentMethod: 'PAYOS_VIETQR',
      );

      if (!mounted) return;

      // Lưu thông tin giao dịch nhận được (bao gồm mã QR, số tài khoản, phí đối soát) vào State
      setState(() {
        _transaction = tx;
        _isLoading = false;
      });

      // Kiểm tra trạng thái giao dịch ngay sau khi khởi tạo:
      if (tx.isSuccess) {
        // Nếu đơn đã được thanh toán thành công từ trước, chuyển thẳng tới màn hình thành công
        _handlePaymentSuccess(tx);
      } else if (tx.isTerminal) {
        // Nếu giao dịch rơi vào trạng thái kết thúc khác (FAILED, CANCELLED, DUPLICATE_PAID...), hiển thị cảnh báo
        _showTerminalPayment(tx);
      } else {
        // Nếu đang ở trạng thái PENDING, kích hoạt cơ chế auto-polling mỗi 3 giây
        _startPolling();
      }
    } catch (e) {
      if (!mounted) return;
      // Bắt lỗi mạng hoặc lỗi nghiệp vụ từ Backend để hiển thị lên khung thông báo lỗi kèm nút "Thử lại"
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  /// Truy vấn trạng thái giao dịch thanh toán mới nhất từ Backend theo mã `payosOrderCode`.
  ///
  /// - Nếu [silent] == `true` (gọi tự động từ Timer polling): Không hiển thị vòng xoay loading
  ///   trên nút bấm và không bật SnackBar làm phiền người dùng khi chưa có thay đổi.
  /// - Nếu [silent] == `false` (người dùng chủ động bấm nút "Kiểm tra thanh toán"):
  ///   Bật hiệu ứng loading, gửi cờ `forceRefresh: true` yêu cầu Backend đồng bộ trực tiếp với PayOS,
  ///   và hiển thị SnackBar thông báo kết quả rõ ràng.
  Future<void> _checkPaymentStatus({bool silent = false}) async {
    final tx = _transaction;
    // Bỏ qua nếu chưa có giao dịch, đang có request khác chạy, màn hình khuất, hoặc đã chuyển trang thành công
    if (tx == null ||
        _statusRequestInFlight ||
        !_isScreenActive ||
        _successPresented) {
      return;
    }
    // Đặt khóa đánh dấu đang có request kiểm tra trạng thái đang thực thi
    _statusRequestInFlight = true;

    if (!silent) {
      setState(() => _isCheckingStatus = true);
    }

    try {
      // Gọi API lấy thông tin giao dịch theo mã đơn PayOS
      final updated = await _paymentService.getPaymentByOrderCode(
        tx.payosOrderCode,
        forceRefresh: !silent,
      );
      if (!mounted) return;

      // Cập nhật bản ghi giao dịch mới nhất vào State
      setState(() {
        _transaction = updated;
        if (!silent) _isCheckingStatus = false;
      });

      // Phân nhánh xử lý theo trạng thái giao dịch mới nhất:
      if (updated.isSuccess) {
        // Giao dịch đã thanh toán thành công -> Dừng polling và điều hướng sang màn hình thành công
        _stopPolling();
        _handlePaymentSuccess(updated);
      } else if (updated.isTerminal) {
        // Giao dịch kết thúc với trạng thái lỗi / hủy / trùng lặp -> Dừng polling và báo lỗi
        _showTerminalPayment(updated);
      } else if (!silent) {
        // Nếu người dùng bấm kiểm tra thủ công mà giao dịch vẫn đang PENDING, hiển thị thông báo nhắc nhở
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
      // Chỉ hiển thị SnackBar báo lỗi khi người dùng bấm kiểm tra thủ công (silent == false)
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
      // Luôn mở khóa cờ _statusRequestInFlight sau khi kết thúc để các lần polling tiếp theo có thể chạy
      _statusRequestInFlight = false;
    }
  }

  /// Hiển thị thông báo khi giao dịch rơi vào trạng thái kết thúc không thành công
  /// (ví dụ: `FAILED`, `CANCELLED`, `EXPIRED`, hoặc `DUPLICATE_PAID`).
  void _showTerminalPayment(PaymentTransactionModel tx) {
    _stopPolling();
    if (!mounted) return;
    setState(
      () => _errorMessage = tx.isDuplicatePaid
          ? 'Khoản thanh toán đang chờ đối soát. Vui lòng liên hệ hỗ trợ, không thanh toán thêm.'
          : 'Giao dịch ${tx.status}. Chọn thử lại để xác minh và khởi tạo lại khi hợp lệ.',
    );
  }

  /// Đồng bộ ngầm thông tin chi tiết đơn cứu hộ từ Backend sau khi thanh toán hoàn tất.
  Future<void> _syncOrderDetails() async {
    final orderId = widget.rescueOrderId;
    if (orderId == null) return;
    try {
      await _rescueService.getOrderById(orderId);
    } catch (_) {
      // Ignore background sync errors
    }
  }

  /// Xử lý hoàn tất luồng thanh toán khi giao dịch đạt trạng thái `'SUCCESS'`.
  ///
  /// Dừng bộ đếm polling, kích hoạt đồng bộ đơn cứu hộ ngầm và điều hướng thay thế
  /// (`pushReplacement`) sang màn hình [PaymentSuccessScreen].
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
  /// Kích hoạt giả lập tín hiệu Webhook xác nhận thanh toán thành công từ PayOS (dành cho Demo / Test).
  Future<void> _simulateWebhookDemo() async {
    final tx = _transaction;
    if (tx == null) return;

    setState(() => _isCheckingStatus = true);
    try {
      // Gọi API simulateWebhook trên Backend để chuyển trạng thái giao dịch sang SUCCESS
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

  /// Định dạng số tiền kiểu `double` sang chuỗi tiền tệ Việt Nam Đồng có dấu chấm phân cách hàng nghìn
  /// (ví dụ: `150000.0` -> `'150.000 đ'`).
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

  // ==========================================================================
  // XÂY DỰNG GIAO DIỆN NGƯỜI DÙNG (WIDGET TREE BUILDER)
  // ==========================================================================

  @override
  Widget build(BuildContext context) {
    // Tính toán các thông số tài chính và thông tin tài khoản thụ hưởng để hiển thị
    // (sử dụng giá trị thực từ _transaction nếu đã khởi tạo, hoặc fallback mặc định khi Preview)
    final displayAmount =
        _transaction?.amount ??
        widget.amount ??
        widget.rescueOrder?.totalAmount ??
        150000.0;
    final commissionRate = _transaction?.commissionRate;
    final platformFee = _transaction?.platformFee;
    final netGarageAmount = _transaction?.netGarageAmount;
    final bankName = _transaction?.bankName ?? 'MB Bank (Quân Đội)';
    final accountNumber = _transaction?.accountNumber ?? '038299482910';
    final accountHolder =
        _transaction?.accountHolder ?? 'HE THONG CUU HO HYDRORESCUE';
    final paymentContent =
        _transaction?.paymentContent ?? 'RESCUE ${widget.rescueCode}';

    return Scaffold(
      backgroundColor: AppColors.surface,
      // Thanh tiêu đề màn hình thanh toán
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
            // Phần tiêu đề giới thiệu bước hoàn tất hành trình cứu hộ
            RescueIntro(
              eyebrow: 'HOÀN TẤT HÀNH TRÌNH',
              title: 'Thanh toán đơn #${widget.rescueCode}',
              description:
                  'Quét mã VietQR chuyển khoản nhanh 24/7 qua cổng PayOS.',
            ),
            const SizedBox(height: 12),

            // Hiển thị thẻ ghi chú trạng thái môi trường (Preview hoặc Test Simulation)
            if (_isPreview)
              const RescueDemoNote(
                'Chế độ xem trước · Chưa tạo giao dịch thanh toán',
              )
            else if (_isSimulation)
              const RescueDemoNote(
                'Môi trường Test · Có bật nút giả lập xác nhận PayOS',
              ),

            // Khung cảnh báo lỗi (Error Banner) kèm nút "Thử lại" nếu quá trình tạo mã QR thất bại
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

            // Main VietQR Box: Khung hiển thị mã QR, trạng thái polling và chi tiết chuyển khoản
            RescuePanel(
              padding: 16,
              child: Column(
                children: [
                  // Status & Polling Indicator: Nhãn hiển thị trạng thái tự động kiểm tra mỗi 3s
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

                  // Dynamic VietQR Code Box: Khung chứa hình ảnh mã VietQR động và huy hiệu PayOS • NAPAS 247
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
                        // Gọi hàm kết xuất mã QR theo dữ liệu thực tế từ PayOS
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

                  // Nút phụ mở trực tiếp trang cổng thanh toán PayOS trên trình duyệt Web (nếu có checkoutUrl)
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

                  // Bank details: Bảng thông tin tài khoản thụ hưởng và chi tiết phân bổ dòng tiền đối soát
                  _buildBankRow(
                    'Số tiền thanh toán',
                    _formatVnd(displayAmount),
                    highlight: true,
                  ),
                  _buildBankRow('Ngân hàng thụ hưởng', bankName),
                  _buildBankRow('Số tài khoản', accountNumber),
                  _buildBankRow('Chủ tài khoản', accountHolder),
                  _buildBankRow('Nội dung chuyển khoản', paymentContent),
                  if (commissionRate != null && platformFee != null) _buildBankRow(
                    'Phí chiết khấu của nền tảng (${commissionRate.toStringAsFixed(1)}%)',
                    _formatVnd(platformFee),
                  ),
                  if (netGarageAmount != null) _buildBankRow('Thực nhận Gara', _formatVnd(netGarageAmount)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Nút "Kiểm tra thanh toán" chính thức: Cho phép khách hàng chủ động kích hoạt đồng bộ kết quả ngay
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

  // ==========================================================================
  // CÁC HÀM BỔ TRỢ KẾT XUẤT MÃ VIETQR & LIÊN KẾT NGOÀI (HELPER WIDGETS)
  // ==========================================================================

  /// Xây dựng Widget hiển thị mã QR thanh toán dựa trên trạng thái và định dạng dữ liệu `qrCode`.
  ///
  /// Xử lý 4 trường hợp:
  /// 1. Giao dịch đã kết thúc (`isTerminal == true`): Hiển thị thông báo mã hết hiệu lực.
  /// 2. Đang gọi API khởi tạo (`_isLoading == true`): Hiển thị vòng xoay `CircularProgressIndicator`.
  /// 3. Dữ liệu `qrCode` là đường dẫn URL (`http://` hoặc `https://`): Tải ảnh QR bằng `Image.network`.
  /// 4. Dữ liệu `qrCode` là chuỗi EMVCo VietQR thô (ví dụ: `000201...`): Kết xuất mã QR sắc nét bằng `QrImageView`.
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

  /// Mở đường dẫn trang thanh toán PayOS (`checkoutUrl`) bằng trình duyệt mặc định ngoài ứng dụng.
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

  /// Xây dựng một dòng thông tin (Nhãn - Giá trị) trong bảng chi tiết chuyển khoản ngân hàng.
  ///
  /// Nếu [highlight] == `true`, giá trị sẽ được tô màu cam nổi bật với cỡ chữ lớn hơn (dùng cho Tổng tiền).
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

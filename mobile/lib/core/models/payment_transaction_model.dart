// ============================================================================
// TẬP TIN: payment_transaction_model.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 5: Thanh toán & Đối soát (UC-18)
// MÔ TẢ NGHIỆP VỤ:
//   - Định nghĩa mô hình dữ liệu giao dịch thanh toán (PaymentTransactionModel)
//     phản ánh đầy đủ cấu trúc bản ghi thanh toán từ Backend Spring Boot trả về.
//   - Hỗ trợ cả hai phương thức thanh toán cốt lõi trong UC-18:
//       1) Chuyển khoản nhanh 24/7 qua cổng PayOS VietQR ('PAYOS_VIETQR')
//       2) Thanh toán tiền mặt tại hiện trường ('CASH')
//   - Bao gồm các thông tin chi tiết phục vụ:
//       + Hiển thị mã QR động (chuỗi EMVCo VietQR hoặc URL ảnh QR) và đường dẫn
//         trang thanh toán PayOS (checkoutUrl).
//       + Hiển thị thông tin tài khoản ngân hàng thụ hưởng (bankName,
//         accountNumber, accountHolder, paymentContent).
//       + Tính toán và minh bạch hóa dòng tiền đối soát giữa Hệ thống và Gara
//         (amount, commissionRate, platformFee, netGarageAmount).
//       + Quản lý vòng đời trạng thái giao dịch (PENDING, SUCCESS, FAILED,
//         CANCELLED, EXPIRED, REFUNDED, DUPLICATE_PAID) và trạng thái đối soát
//         (reconciled, checksumValid).
// ============================================================================

/// Lớp mô hình dữ liệu đại diện cho một giao dịch thanh toán đơn cứu hộ (UC-18).
///
/// Đối tượng này được sử dụng xuyên suốt các màn hình:
/// - `VietQRPaymentScreen`: Khởi tạo thanh toán, hiển thị mã VietQR và polling
///   kiểm tra trạng thái giao dịch định kỳ.
/// - `PaymentSuccessScreen`: Hiển thị biên nhận xác nhận thanh toán thành công.
/// - `ElectronicInvoiceScreen`: Hiển thị hóa đơn điện tử chi tiết và hỗ trợ
///   liên kết mã giao dịch khi khách hàng gửi yêu cầu khiếu nại/hoàn tiền (UC-23).
class PaymentTransactionModel {
  /// Định danh duy nhất (Primary Key) của bản ghi giao dịch thanh toán trong CSDL.
  final int id;

  /// Mã định danh (ID) của đơn cứu hộ liên kết trực tiếp với giao dịch thanh toán này.
  final int? rescueOrderId;

  /// Mã tham chiếu hiển thị của đơn cứu hộ (ví dụ: 'SOS-1024', '#RC-8924').
  final String? rescueCode;

  /// Phân loại hình thức đơn cứu hộ (ví dụ: 'SINGLE_CROSSING' - chở qua điểm ngập).
  final String? orderType;

  /// Định danh của Gara / Đội cứu hộ thực hiện dịch vụ và thụ hưởng khoản thanh toán.
  final int? garageId;

  /// Tên hiển thị của Gara / Trung tâm cứu hộ liên kết thực hiện đơn.
  final String? garageName;

  /// Định danh tài khoản khách hàng thực hiện thanh toán.
  final int? customerId;

  /// Họ và tên của khách hàng sử dụng dịch vụ cứu hộ.
  final String? customerName;

  /// Số điện thoại liên hệ của khách hàng.
  final String? customerPhone;

  /// Mã đơn hàng số nguyên (Order Code) đăng ký với cổng thanh toán PayOS.
  /// Mã này được dùng để truy vấn trạng thái giao dịch hoặc đối chiếu Webhook.
  final int payosOrderCode;

  /// Tổng số tiền khách hàng cần thanh toán cho đơn cứu hộ (đơn vị: VNĐ).
  final double amount;

  /// Tỷ lệ phần trăm hoa hồng / phí điều phối nền tảng thu trên giao dịch (ví dụ: 10.0%).
  final double? commissionRate;

  /// Số tiền phí điều phối nền tảng được trích lại (VNĐ), tính theo `amount * commissionRate / 100`.
  final double? platformFee;

  /// Số tiền thực nhận của Gara cứu hộ sau khi trừ phí điều phối nền tảng (VNĐ).
  final double? netGarageAmount;

  /// Phương thức thanh toán được áp dụng ('PAYOS_VIETQR' hoặc 'CASH').
  final String paymentMethod;

  /// Trạng thái hiện tại của giao dịch thanh toán:
  /// - 'PENDING': Đang chờ khách hàng quét mã QR / chuyển khoản.
  /// - 'SUCCESS': Đã nhận tiền và xác nhận thanh toán thành công.
  /// - 'FAILED': Giao dịch thất bại.
  /// - 'CANCELLED': Giao dịch bị hủy.
  /// - 'EXPIRED': Mã thanh toán hết hạn hiệu lực.
  /// - 'REFUNDED': Đã hoàn tiền theo quyết định giải quyết khiếu nại (UC-23).
  /// - 'DUPLICATE_PAID': Phát hiện thanh toán trùng lặp, chờ bộ phận đối soát xử lý.
  final String status;

  /// Cờ đánh dấu giao dịch đã được đối soát dòng tiền với Gara hay chưa.
  final bool reconciled;

  /// Cờ xác thực chữ ký bảo mật (HMAC-SHA256 Checksum) từ PayOS Webhook có hợp lệ hay không.
  final bool checksumValid;

  /// Dữ liệu mã QR thanh toán trả về từ PayOS:
  /// Có thể là chuỗi payload chuẩn EMVCo VietQR (bắt đầu bằng '000201...')
  /// hoặc đường dẫn URL hình ảnh mã QR.
  final String? qrCode;

  /// Đường dẫn URL mở trang cổng thanh toán PayOS trên trình duyệt Web.
  final String? checkoutUrl;

  /// Tên ngân hàng thụ hưởng hiển thị trên hướng dẫn chuyển khoản (ví dụ: 'MB Bank').
  final String? bankName;

  /// Số tài khoản ngân hàng thụ hưởng (hoặc tài khoản định danh ảo VA từ PayOS).
  final String? accountNumber;

  /// Tên chủ tài khoản ngân hàng thụ hưởng (ví dụ: 'HE THONG CUU HO HYDRORESCUE').
  final String? accountHolder;

  /// Nội dung chuyển khoản bắt buộc để hệ thống tự động nhận diện giao dịch qua Webhook.
  final String? paymentContent;

  /// Thời điểm khởi tạo giao dịch thanh toán (chuỗi thời gian chuẩn ISO-8601 hoặc định dạng hiển thị).
  final String? createdAt;

  /// Thời điểm khách hàng hoàn tất thanh toán và hệ thống ghi nhận thành công.
  final String? paidAt;

  /// Thời điểm hoàn tất đối soát tài chính cho giao dịch.
  final String? reconciledAt;

  /// Cờ đánh dấu giao dịch đang chạy ở chế độ giả lập (Simulation / Sandbox Mode)
  /// cho phép hiển thị nút kích hoạt giả lập Webhook PayOS trên giao diện Mobile.
  final bool isSimulation;

  /// Hàm khởi tạo đối tượng [PaymentTransactionModel] với các giá trị mặc định an toàn
  /// cho phương thức thanh toán ('PAYOS_VIETQR') và trạng thái khởi đầu ('PENDING').
  PaymentTransactionModel({
    required this.id,
    this.rescueOrderId,
    this.rescueCode,
    this.orderType,
    this.garageId,
    this.garageName,
    this.customerId,
    this.customerName,
    this.customerPhone,
    required this.payosOrderCode,
    required this.amount,
    this.commissionRate,
    this.platformFee,
    this.netGarageAmount,
    this.paymentMethod = 'PAYOS_VIETQR',
    this.status = 'PENDING',
    this.reconciled = false,
    this.checksumValid = true,
    this.qrCode,
    this.checkoutUrl,
    this.bankName,
    this.accountNumber,
    this.accountHolder,
    this.paymentContent,
    this.createdAt,
    this.paidAt,
    this.reconciledAt,
    this.isSimulation = false,
  });

  // ==========================================================================
  // CÁC THUỘC TÍNH KIỂM TRA TRẠNG THÁI NGHIỆP VỤ (COMPUTED GETTERS - UC-18)
  // ==========================================================================

  /// Kiểm tra giao dịch đã được thanh toán thành công ('SUCCESS') hay chưa.
  /// Khi `isSuccess == true`, màn hình VietQR sẽ dừng timer polling và điều hướng
  /// sang màn hình `PaymentSuccessScreen`.
  bool get isSuccess => status == 'SUCCESS';

  /// Kiểm tra giao dịch có đang ở trạng thái chờ khách hàng thanh toán ('PENDING') hay không.
  bool get isPending => status == 'PENDING';

  /// Kiểm tra giao dịch có bị lỗi/thất bại ('FAILED') trong quá trình xử lý hay không.
  bool get isFailed => status == 'FAILED';

  /// Kiểm tra giao dịch đã bị hủy bỏ ('CANCELLED') hay chưa.
  bool get isCancelled => status == 'CANCELLED';

  /// Kiểm tra giao dịch có bị đánh dấu thanh toán trùng lặp ('DUPLICATE_PAID') cần đối soát thủ công không.
  bool get isDuplicatePaid => status == 'DUPLICATE_PAID';

  /// Kiểm tra phương thức thanh toán có phải là thu tiền mặt trực tiếp ('CASH') hay không.
  bool get isCash => paymentMethod == 'CASH';

  /// Kiểm tra giao dịch đã rơi vào trạng thái kết thúc (Terminal State) hay chưa.
  /// Nếu `isTerminal == true`, tiến trình auto-polling trên Mobile sẽ tự động dừng lại
  /// để tránh gửi request dư thừa lên Backend.
  bool get isTerminal => const {
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'EXPIRED',
    'REFUNDED',
    'DUPLICATE_PAID',
  }.contains(status);

  // ==========================================================================
  // CƠ CHẾ ÁNH XẠ DỮ LIỆU JSON (SERIALIZATION / DESERIALIZATION)
  // ==========================================================================

  /// Factory constructor khởi tạo đối tượng [PaymentTransactionModel] từ cấu trúc Map JSON
  /// nhận được từ phản hồi HTTP REST API của Backend.
  ///
  /// Xử lý ép kiểu an toàn (`num?` sang `int`/`double`) và cung cấp giá trị dự phòng (fallback)
  /// nhằm ngăn ngừa lỗi NullPointerException hoặc TypeCastException khi dữ liệu thiếu trường.
  factory PaymentTransactionModel.fromJson(Map<String, dynamic> json) {
    return PaymentTransactionModel(
      // Đọc ID giao dịch, mặc định là 0 nếu chưa xác định
      id: json['id'] as int? ?? 0,
      // Đọc ID đơn cứu hộ liên kết
      rescueOrderId: json['rescueOrderId'] as int?,
      // Đọc mã hiển thị đơn cứu hộ
      rescueCode: json['rescueCode'] as String?,
      // Đọc loại đơn cứu hộ
      orderType: json['orderType'] as String?,
      // Đọc ID và tên Gara thực hiện cứu hộ
      garageId: json['garageId'] as int?,
      garageName: json['garageName'] as String?,
      // Đọc thông tin định danh khách hàng
      customerId: json['customerId'] as int?,
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      // Chuyển đổi an toàn mã đơn PayOS từ kiểu số (num) sang số nguyên (int)
      payosOrderCode: (json['payosOrderCode'] as num?)?.toInt() ?? 0,
      // Chuyển đổi an toàn tổng số tiền thanh toán sang kiểu số thực (double)
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      // Chuyển đổi các thông số đối soát hoa hồng và doanh thu thực nhận của Gara
      commissionRate: (json['commissionRate'] as num?)?.toDouble(),
      platformFee: (json['platformFee'] as num?)?.toDouble(),
      netGarageAmount: (json['netGarageAmount'] as num?)?.toDouble(),
      // Phương thức thanh toán, mặc định là 'PAYOS_VIETQR'
      paymentMethod: json['paymentMethod'] as String? ?? 'PAYOS_VIETQR',
      // Trạng thái giao dịch, mặc định là 'PENDING'
      status: json['status'] as String? ?? 'PENDING',
      // Các cờ kiểm tra đối soát và tính toàn vẹn chữ ký số
      reconciled: json['reconciled'] as bool? ?? false,
      checksumValid: json['checksumValid'] as bool? ?? true,
      // Dữ liệu hiển thị mã VietQR và thông tin chuyển khoản ngân hàng
      qrCode: json['qrCode'] as String?,
      checkoutUrl: json['checkoutUrl'] as String?,
      bankName: json['bankName'] as String?,
      accountNumber: json['accountNumber'] as String?,
      accountHolder: json['accountHolder'] as String?,
      paymentContent: json['paymentContent'] as String?,
      // Dấu thời gian tạo, thanh toán và đối soát giao dịch
      createdAt: json['createdAt'] as String?,
      paidAt: json['paidAt'] as String?,
      reconciledAt: json['reconciledAt'] as String?,
      // Cờ nhận biết chế độ giả lập thử nghiệm
      isSimulation: (json['isSimulation'] as bool?) ?? false,
    );
  }

  /// Chuyển đổi đối tượng [PaymentTransactionModel] hiện tại sang cấu trúc `Map<String, dynamic>`
  /// để phục vụ tuần tự hóa JSON (serialization), lưu trữ bộ nhớ đệm hoặc truyền qua lại giữa các tầng.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'rescueOrderId': rescueOrderId,
      'rescueCode': rescueCode,
      'orderType': orderType,
      'garageId': garageId,
      'garageName': garageName,
      'customerId': customerId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'payosOrderCode': payosOrderCode,
      'amount': amount,
      'commissionRate': commissionRate,
      'platformFee': platformFee,
      'netGarageAmount': netGarageAmount,
      'paymentMethod': paymentMethod,
      'status': status,
      'reconciled': reconciled,
      'checksumValid': checksumValid,
      'qrCode': qrCode,
      'checkoutUrl': checkoutUrl,
      'bankName': bankName,
      'accountNumber': accountNumber,
      'accountHolder': accountHolder,
      'paymentContent': paymentContent,
      'createdAt': createdAt,
      'paidAt': paidAt,
      'reconciledAt': reconciledAt,
      'isSimulation': isSimulation,
    };
  }
}

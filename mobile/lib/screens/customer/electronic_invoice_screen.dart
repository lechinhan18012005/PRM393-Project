// ============================================================================
// TẬP TIN: electronic_invoice_screen.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 5 (UC-18) & Luồng 6 (UC-23)
// MÔ TẢ NGHIỆP VỤ & KỸ THUẬT:
//   - Màn hình hiển thị Biên nhận thanh toán / Hóa đơn điện tử chi tiết sau khi
//     khách hàng đã hoàn tất thanh toán đơn cứu hộ (UC-18).
//   - Trình bày đầy đủ và minh bạch các thông tin chứng từ thanh toán:
//       + Mã đơn cứu hộ, mã tham chiếu giao dịch PayOS, thời gian hoàn tất.
//       + Đơn vị thực hiện (Gara cứu hộ), thông tin khách hàng và biển số/dòng xe.
//       + Bóc tách chi tiết cấu thành chi phí: Giá dịch vụ cứu hộ cơ bản
//         (`serviceBasePrice`), Phí dịch vụ khẩn cấp & điều phối (`bookingFee`),
//         Phương thức thanh toán và Tổng số tiền thanh toán.
//   - Tích hợp trực tiếp cửa sổ BottomSheet gửi hồ sơ Khiếu nại & Yêu cầu hoàn tiền
//     sau cứu hộ (UC-23 - `_showDisputeBottomSheet`):
//       + Cho phép khách hàng chọn nhóm lý do khiếu nại (`OVERCHARGE`, `POOR_QUALITY`,
//         `DAMAGE`, `FAKE_RESCUE`), nhập số tiền đề nghị hoàn trả (ràng buộc
//         `0 < amount <= paidAmount`) và mô tả chi tiết sự việc để gửi lên
//         bộ phận CSKH (Staff) và Quản trị viên (Admin) thông qua `DisputeService`.
// ============================================================================

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/payment_transaction_model.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/dispute_service.dart';
import '../../core/services/media_service.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/widgets/rescue_ui.dart';
import 'customer_disputes_screen.dart';
import 'stitch_hydro_rescue_screen.dart';

/// Widget màn hình Biên nhận thanh toán cứu hộ & Gửi yêu cầu khiếu nại hoàn tiền (UC-18 & UC-23).
class ElectronicInvoiceScreen extends StatelessWidget {
  /// Dữ liệu giao dịch thanh toán (PayOS VietQR hoặc Tiền mặt) đã hoàn tất.
  final PaymentTransactionModel? transaction;

  /// Dữ liệu chi tiết đơn cứu hộ (chứa thông tin xe, phí cơ bản, phí điều phối...).
  final RescueOrderModel? order;

  /// Khởi tạo [ElectronicInvoiceScreen] với đối tượng [transaction] và [order] tùy chọn.
  const ElectronicInvoiceScreen({super.key, this.transaction, this.order});

  /// Kiểm tra xem biên nhận đang hiển thị dữ liệu giao dịch thật hay chế độ minh họa (Preview).
  bool get _isReal => transaction != null || order != null;

  /// Hàm tiện ích định dạng số thực sang chuỗi tiền tệ VNĐ có dấu chấm phân cách hàng nghìn.
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

  // ==========================================================================
  // MODAL BOTTOM SHEET: GỬI HỒ SƠ KHIẾU NẠI & YÊU CẦU HOÀN TIỀN (UC-23)
  // ==========================================================================

  /// Hiển thị biểu mẫu Modal BottomSheet cho phép khách hàng gửi khiếu nại dịch vụ
  /// và yêu cầu hoàn tiền (UC-23) gắn trực tiếp với biên nhận thanh toán hiện tại.
  ///
  /// Tham số đầu vào:
  /// - [context]: BuildContext của màn hình biên nhận.
  /// - [rescueOrderId]: Mã định danh đơn cứu hộ cần khiếu nại.
  /// - [paymentTransactionId]: Mã định danh giao dịch thanh toán để đối chiếu hoàn tiền.
  /// - [rescueCode]: Mã hiển thị đơn cứu hộ.
  /// - [paidAmount]: Tổng số tiền khách hàng đã thanh toán (dùng làm mức trần hoàn tiền tối đa).
  void _showDisputeBottomSheet(
    BuildContext context, {
    required int rescueOrderId,
    int? paymentTransactionId,
    required String rescueCode,
    required double paidAmount,
    String? garageName,
  }) {
    // Khởi tạo controller cho ô nhập số tiền yêu cầu hoàn (mặc định điền sẵn toàn bộ số tiền đã trả)
    final amountController = TextEditingController(
      text: formatVndInput(paidAmount),
    );
    // Khởi tạo controller cho ô nhập mô tả chi tiết lý do khiếu nại và bằng chứng
    final reasonController = TextEditingController();
    // Nhóm lý do khiếu nại mặc định: Thu vượt báo giá ('OVERCHARGE')
    String selectedType = 'OVERCHARGE';
    // Danh sách ảnh bằng chứng đính kèm khiếu nại được chọn từ thiết bị
    final List<PickedMediaFile> pickedImages = [];
    // Cờ kiểm soát trạng thái đang gửi request API để khóa nút bấm tránh gửi trùng
    bool isSubmitting = false;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) {
        // Sử dụng StatefulBuilder để quản lý state cục bộ (selectedType, isSubmitting) bên trong BottomSheet
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              // Tự động đẩy nội dung lên phía trên bàn phím ảo khi người dùng nhập liệu (viewInsets.bottom)
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Hàng tiêu đề Modal và nút đóng (X)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'Gửi khiếu nại & Yêu cầu hoàn tiền',
                            style: Theme.of(ctx).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.of(sheetCtx).pop(),
                        ),
                      ],
                    ),
                    // Dòng tóm tắt mã đơn cứu hộ và tổng số tiền đã thanh toán
                    Text(
                      'Đơn cứu hộ: $rescueCode • Đã thanh toán: ${_formatVnd(paidAmount)}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.secondary,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Trường 1: Dropdown chọn nhóm lý do khiếu nại chuẩn hóa theo nghiệp vụ UC-23
                    DropdownButtonFormField<String>(
                      isExpanded: true,
                      initialValue: selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Nhóm lý do khiếu nại',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'OVERCHARGE',
                          child: Text(
                            'Thu vượt báo giá / phụ phí ngoài luồng',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'POOR_QUALITY',
                          child: Text(
                            'Chất lượng cứu hộ / sửa chữa không đạt',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'DAMAGE',
                          child: Text(
                            'Hư hỏng phương tiện trong lúc cứu hộ',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'FAKE_RESCUE',
                          child: Text(
                            'Báo hoàn tất khống / hủy sau khi thu tiền',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() => selectedType = val);
                        }
                      },
                    ),
                    const SizedBox(height: 12),

                    // Trường 2: Ô nhập số tiền yêu cầu hoàn trả (VNĐ)
                    TextField(
                      controller: amountController,
                      readOnly: true,
                      enableInteractiveSelection: false,
                      decoration: InputDecoration(
                        labelText: 'Số tiền yêu cầu hoàn trả (VNĐ)',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixText: '₫',
                        helperText:
                            'Cố định bằng số tiền đã thanh toán: ${formatVnd(paidAmount)}',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Trường 3: Ô nhập mô tả chi tiết sự việc & bằng chứng phục vụ CSKH thẩm định
                    TextField(
                      controller: reasonController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Mô tả chi tiết sự việc & bằng chứng',
                        hintText: 'Nhập lý do khiếu nại để bộ phận CSKH (Staff) đối chiếu và đề xuất Admin hoàn tiền...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Section: Bằng chứng ảnh
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Ảnh chụp bằng chứng (${pickedImages.length}/3)',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.secondary,
                          ),
                        ),
                        if (pickedImages.length < 3)
                          Align(
                            alignment: Alignment.centerRight,
                            child: Wrap(
                              spacing: 4,
                              children: [
                                TextButton.icon(
                                  onPressed: isSubmitting
                                      ? null
                                      : () async {
                                          final photo = await MediaService
                                              .instance
                                              .pickImageFromCamera();
                                          if (photo != null) {
                                            setModalState(() {
                                              if (pickedImages.length < 3) {
                                                pickedImages.add(photo);
                                              }
                                            });
                                          }
                                        },
                                  icon: const Icon(
                                    Icons.camera_alt_outlined,
                                    size: 16,
                                  ),
                                  label: const Text(
                                    'Chụp',
                                    style: TextStyle(fontSize: 12),
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: isSubmitting
                                      ? null
                                      : () async {
                                          final photo = await MediaService
                                              .instance
                                              .pickImageFromGallery();
                                          if (photo != null) {
                                            setModalState(() {
                                              if (pickedImages.length < 3) {
                                                pickedImages.add(photo);
                                              }
                                            });
                                          }
                                        },
                                  icon: const Icon(
                                    Icons.photo_library_outlined,
                                    size: 16,
                                  ),
                                  label: const Text(
                                    'Thư viện',
                                    style: TextStyle(fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),

                    if (pickedImages.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 74,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: pickedImages.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (ctx, idx) {
                            final img = pickedImages[idx];
                            return Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.memory(
                                    img.bytes,
                                    width: 74,
                                    height: 74,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  top: 2,
                                  right: 2,
                                  child: GestureDetector(
                                    onTap: isSubmitting
                                        ? null
                                        : () {
                                            setModalState(() {
                                              pickedImages.removeAt(idx);
                                            });
                                          },
                                    child: const CircleAvatar(
                                      radius: 10,
                                      backgroundColor: Colors.black54,
                                      child: Icon(
                                        Icons.close,
                                        size: 12,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Nút xác nhận gửi hồ sơ khiếu nại lên Backend
                    ElevatedButton.icon(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              // Bước 1: Kiểm tra tính hợp lệ (Validation) của số tiền và lý do khiếu nại
                              final amount = parseVnd(amountController.text);
                              final reason = reasonController.text.trim();
                              // Ràng buộc nghiệp vụ: Số tiền hoàn phải lớn hơn 0 và không vượt quá số tiền đã thanh toán
                              if (amount <= 0 || amount > paidAmount) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Số tiền yêu cầu hoàn phải từ 1đ đến ${_formatVnd(paidAmount)}',
                                    ),
                                  ),
                                );
                                return;
                              }
                              // Ràng buộc nghiệp vụ: Bắt buộc phải có mô tả lý do khiếu nại
                              if (reason.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Vui lòng nhập mô tả chi tiết lý do khiếu nại',
                                    ),
                                  ),
                                );
                                return;
                              }

                              // Bước 2: Bật trạng thái loading và gọi DisputeService.createDispute(...)
                              setModalState(() => isSubmitting = true);
                              try {
                                // Upload photos
                                final List<String> uploadedUrls = [];
                                for (final img in pickedImages) {
                                  final url = await DisputeService()
                                      .uploadEvidencePhoto(
                                        img.bytes,
                                        img.filename,
                                      );
                                  uploadedUrls.add(url);
                                }
                                final evidenceUrls = uploadedUrls.isNotEmpty
                                    ? uploadedUrls.join(',')
                                    : null;

                                final created = await DisputeService()
                                    .createDispute(
                                      rescueOrderId: rescueOrderId,
                                      paymentTransactionId:
                                          paymentTransactionId,
                                      disputeType: selectedType,
                                      requestedRefundAmount: amount,
                                      customerReason: reason,
                                      evidenceImageUrls: evidenceUrls,
                                      rescueCode: rescueCode,
                                      garageName: garageName,
                                      originalAmount: paidAmount,
                                    );
                                // Đóng BottomSheet sau khi gửi thành công
                                if (sheetCtx.mounted) {
                                  Navigator.of(sheetCtx).pop();
                                }
                                // Hiển thị thông báo xác nhận kèm mã hồ sơ khiếu nại (disputeCode)
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      backgroundColor: Colors.green.shade700,
                                      duration: const Duration(seconds: 5),
                                      content: Text(
                                        'Đã gửi hồ sơ khiếu nại ${created.disputeCode}! Bộ phận CSKH sẽ xác minh sớm nhất.',
                                      ),
                                      action: SnackBarAction(
                                        label: 'Xem hồ sơ',
                                        textColor: Colors.white,
                                        onPressed: () {
                                          Navigator.of(context).push(
                                            MaterialPageRoute<void>(
                                              builder: (_) =>
                                                  const CustomerDisputesScreen(),
                                            ),
                                          );
                                        },
                                      ),
                                    ),
                                  );
                                }
                              } catch (e) {
                                // Xử lý ngoại lệ nếu gọi API thất bại (hoặc khi đang ở chế độ Demo Preview)
                                if (sheetCtx.mounted) {
                                  Navigator.of(sheetCtx).pop();
                                }
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      backgroundColor: _isReal
                                          ? Colors.red.shade700
                                          : Colors.green.shade700,
                                      content: Text(
                                        _isReal
                                            ? 'Đã ghi nhận yêu cầu khiếu nại ($e)'
                                            : 'Đã gửi hồ sơ khiếu nại mẫu thành công! Bộ phận CSKH đang tiếp nhận xử lý.',
                                      ),
                                      action: SnackBarAction(
                                        label: 'Xem hồ sơ',
                                        textColor: Colors.white,
                                        onPressed: () {
                                          Navigator.of(context).push(
                                            MaterialPageRoute<void>(
                                              builder: (_) =>
                                                  const CustomerDisputesScreen(),
                                            ),
                                          );
                                        },
                                      ),
                                    ),
                                  );
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      icon: const Icon(Icons.report_problem_outlined),
                      label: Text(
                        isSubmitting
                            ? 'Đang gửi hồ sơ & ảnh...'
                            : 'Gửi Khiếu Nại & Yêu Cầu Hoàn Tiền',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // ==========================================================================
  // XÂY DỰNG GIAO DIỆN BIÊN NHẬN THANH TOÁN ĐIỆN TỬ (WIDGET TREE)
  // ==========================================================================

  @override
  Widget build(BuildContext context) {
    // Bước 1: Chuẩn bị và trích xuất dữ liệu hiển thị trên biên nhận từ transaction và order
    final code = transaction?.rescueCode ?? order?.orderCode ?? '#RC-DEMO-8924';
    final total = transaction?.amount ?? order?.totalAmount ?? 150000.0;
    // Bóc tách giá dịch vụ cơ bản và phí đặt đơn khẩn cấp / điều phối
    final basePrice = order?.serviceBasePrice ?? total;
    final bookingFee = order?.bookingFee ?? 0;
    final garageName = transaction?.garageName ??
        order?.garageName ??
        'Trung tâm cứu hộ liên kết';
    final customerName =
        order?.customerName ?? transaction?.customerName ?? 'Khách hàng cứu hộ';
    // Ghép biển số xe và mẫu xe (nếu có)
    final vehicleInfo = [
      if (order?.vehiclePlate != null && order!.vehiclePlate.isNotEmpty)
        order!.vehiclePlate,
      if (order?.vehicleModel != null && order!.vehicleModel!.isNotEmpty)
        order!.vehicleModel!,
    ].join(' • ');
    final serviceName =
        order?.serviceName ?? 'Chở xe máy qua điểm ngập (Chuyến riêng)';
    final methodStr = (transaction?.paymentMethod == 'CASH')
        ? 'Tiền mặt tại hiện trường'
        : 'PayOS VietQR';
    final refCode =
        transaction?.payosOrderCode != null && transaction!.payosOrderCode > 0
        ? '#${transaction!.payosOrderCode}'
        : (order?.paymentOrderCode != null
              ? '#${order!.paymentOrderCode}'
              : 'RESCUE-$code');
    final paidAtStr = transaction?.paidAt ?? order?.paidAt ?? 'Đã hoàn tất';
    final rescueOrderId = transaction?.rescueOrderId ?? order?.id ?? 8924;

    return Scaffold(
      backgroundColor: AppColors.surface,
      // Thanh tiêu đề màn hình biên nhận thanh toán
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
            // Phần mở đầu giới thiệu mục đích màn hình biên nhận
            const RescueIntro(
              eyebrow: 'THÔNG TIN BIÊN NHẬN',
              title: 'Biên nhận cứu hộ dịch vụ',
              description:
                  'Lưu lại chi tiết chi phí và xác nhận hoàn tất thanh toán.',
            ),
            const SizedBox(height: 12),
            // Hiển thị nhãn ghi chú nếu đang ở chế độ xem mẫu không có giao dịch thật
            if (!_isReal)
              const RescueDemoNote(
                'Biên nhận minh họa · Chưa có giao dịch thật',
              ),

            // Receipt Paper Box: Khung giấy biên nhận dịch vụ chính
            RescuePanel(
              padding: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Phần Header biên nhận: Tiêu đề hệ thống và con dấu trạng thái "ĐÃ THANH TOÁN"
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
                              'Hệ thống cứu hộ HydroRescue',
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
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

                  // Phần Thông tin định danh chung của đơn cứu hộ và giao dịch
                  Text(
                    'Mã đơn cứu hộ: $code',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Mã tham chiếu thanh toán: $refCode',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Thời gian hoàn tất: $paidAtStr',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Đơn vị thực hiện: $garageName',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Khách hàng: $customerName${vehicleInfo.isNotEmpty ? " • $vehicleInfo" : ""}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondary,
                    ),
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

                  // Phần Bảng kê chi tiết từng hạng mục chi phí dịch vụ
                  _buildDetailRow(serviceName, _formatVnd(basePrice)),
                  if (bookingFee > 0)
                    _buildDetailRow('Phí đặt xe (đơn cũ)', _formatVnd(bookingFee)),
                  if (transaction?.platformFee != null)
                    _buildDetailRow(
                      'Phí chiết khấu của nền tảng (đã gồm trong giá)',
                      _formatVnd(transaction!.platformFee!),
                    ),
                  _buildDetailRow('Phương thức thanh toán', methodStr),

                  const Divider(height: 24),
                  // Dòng Tổng thanh toán được tô đậm và làm nổi bật
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

                  // Huy hiệu chứng nhận biên nhận điện tử hợp lệ trên hệ thống HydroRescue
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
            const SizedBox(height: 16),

            // Nút mở biểu mẫu Khiếu nại dịch vụ / Yêu cầu hoàn tiền (UC-23)
            OutlinedButton.icon(
              onPressed: () => _showDisputeBottomSheet(
                context,
                rescueOrderId: rescueOrderId,
                paymentTransactionId: transaction?.id,
                rescueCode: code,
                paidAmount: total,
                garageName: garageName,
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red.shade700,
                side: BorderSide(color: Colors.red.shade300),
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.gavel_outlined, size: 18),
              label: const Text(
                'Khiếu nại dịch vụ / Yêu cầu hoàn tiền',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 12),

            // Nút điều hướng quay về Trang chủ Khách hàng (xóa toàn bộ lịch sử stack trước đó)
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

  /// Xây dựng một dòng hiển thị hạng mục chi phí (Tên hạng mục - Số tiền / Giá trị) trong biên nhận.
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
              style: const TextStyle(fontSize: 12, color: AppColors.onSurface),
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

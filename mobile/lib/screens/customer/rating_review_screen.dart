// ============================================================================
// TẬP TIN: rating_review_screen.dart
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long
// PHÂN HỆ: Mobile Customer App - Luồng 9: Đánh giá Dịch vụ & Thợ cứu hộ (UC-19)
// MÔ TẢ NGHIỆP VỤ & KỸ THUẬT:
//   - Màn hình cho phép khách hàng đánh giá chất lượng phục vụ của Thợ cứu hộ
//     và Gara liên kết ngay sau khi hoàn tất thanh toán đơn cứu hộ (UC-19).
//   - Các cơ chế kỹ thuật và trải nghiệm người dùng (UI/UX) được triển khai:
//       1) Kiểm tra đánh giá đã tồn tại (`_checkExistingRating`):
//          Ngay trong `initState()`, ứng dụng gọi `RatingService.getRatingByOrder(...)`
//          để kiểm tra xem đơn cứu hộ này đã được đánh giá trước đó chưa.
//          Nếu đã có (`_existingRating != null`), toàn bộ giao diện (chọn sao,
//          chọn thẻ tag, ô nhập nhận xét và nút gửi) sẽ tự động chuyển sang chế độ
//          chỉ đọc (Read-only) và hiển thị lại đúng nội dung khách đã gửi.
//       2) Chọn mức độ hài lòng tương tác từ 1 đến 5 sao (`_stars`):
//          Cập nhật trạng thái tức thì thông qua dãy 5 nút `IconButton` hình ngôi sao.
//       3) Bộ thẻ nhận xét nhanh đa lựa chọn (`FilterChip` - `_selectedTags`):
//          Hỗ trợ khách hàng chọn/bỏ chọn nhanh các ưu điểm nổi bật của thợ cứu hộ
//          ("Đến nhanh < 15p", "Nhiệt tình lội nước", "Báo giá minh bạch",
//          "Tay nghề chuẩn", "Cứu xe chạy êm").
//       4) Gửi dữ liệu đánh giá (`_handleSubmit`) lên Backend để hệ thống tự động
//          tính toán lại điểm uy tín trung bình (CSAT / `mechanicRatingAvg`) của
//          thợ và Gara, sau đó điều hướng quay về trang chủ khách hàng.
// ============================================================================

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/rating_service.dart';
import '../../core/widgets/rescue_ui.dart';
import 'stitch_hydro_rescue_screen.dart';

/// Widget màn hình Đánh giá chất lượng dịch vụ & Thợ cứu hộ sau hành trình (UC-19).
class RatingReviewScreen extends StatefulWidget {
  /// Mã định danh (ID) của đơn cứu hộ cần đánh giá.
  final int? rescueOrderId;

  /// Mã hiển thị của đơn cứu hộ (ví dụ: '#RC-8821', 'SOS-1024').
  final String? rescueCode;

  /// Tên hiển thị của Gara / Đội cứu hộ thực hiện dịch vụ.
  final String? garageName;

  /// Họ và tên của Thợ cứu hộ trực tiếp hỗ trợ khách hàng tại hiện trường.
  final String? mechanicName;

  /// Khởi tạo [RatingReviewScreen] với các thông tin đơn cứu hộ và thợ phụ trách.
  const RatingReviewScreen({
    super.key,
    this.rescueOrderId,
    this.rescueCode,
    this.garageName,
    this.mechanicName,
  });

  @override
  State<RatingReviewScreen> createState() => _RatingReviewScreenState();
}

/// Lớp quản lý trạng thái (State) cho màn hình [RatingReviewScreen].
class _RatingReviewScreenState extends State<RatingReviewScreen> {
  /// Dịch vụ kết nối REST API phục vụ gửi và tra cứu đánh giá (UC-19).
  final RatingService _ratingService = RatingService();

  /// Số sao đánh giá hiện tại do khách hàng chọn (thang điểm 1 - 5, mặc định là 5 sao).
  int _stars = 5;

  /// Tập hợp (Set) lưu các thẻ nhận xét nhanh đang được khách hàng lựa chọn.
  final Set<String> _selectedTags = {'Đến nhanh < 15p', 'Nhiệt tình lội nước'};

  /// Bộ điều khiển văn bản (TextEditingController) quản lý nội dung ô nhập nhận xét chi tiết.
  final _commentController = TextEditingController();

  /// Cờ kiểm soát trạng thái đang gửi dữ liệu lên máy chủ để vô hiệu hóa nút bấm tránh gửi lặp.
  bool _isSubmitting = false;

  /// Lưu bản ghi đánh giá đã tồn tại của đơn cứu hộ này (nếu khách hàng đã đánh giá trước đó).
  ServiceRatingModel? _existingRating;

  /// Danh sách các thẻ đánh giá nhanh (Quick Tags) chuẩn hóa cho dịch vụ cứu hộ ngập nước.
  final List<String> _tags = [
    'Đến nhanh < 15p',
    'Nhiệt tình lội nước',
    'Báo giá minh bạch',
    'Tay nghề chuẩn',
    'Cứu xe chạy êm',
  ];

  // ==========================================================================
  // QUẢN LÝ VÒNG ĐỜI & KIỂM TRA ĐÁNH GIÁ ĐÃ TỒN TẠI (LIFECYCLE & INIT)
  // ==========================================================================

  @override
  void initState() {
    super.initState();
    // Nếu màn hình được truyền mã ID đơn cứu hộ thực tế, kiểm tra ngay xem đơn đã có đánh giá chưa
    if (widget.rescueOrderId != null) {
      _checkExistingRating(widget.rescueOrderId!);
    }
  }

  /// Truy vấn Backend để kiểm tra xem đơn cứu hộ [orderId] đã được đánh giá trước đó hay chưa.
  ///
  /// Nếu đã tồn tại bản ghi đánh giá, khôi phục lại số sao, danh sách thẻ tags và nội dung bình luận
  /// lên giao diện, đồng thời khóa biểu mẫu sang chế độ chỉ xem (Read-only).
  Future<void> _checkExistingRating(int orderId) async {
    try {
      final existing = await _ratingService.getRatingByOrder(orderId);
      if (existing != null && mounted) {
        setState(() {
          _existingRating = existing;
          _stars = existing.stars;
          // Tách chuỗi tags phân cách bằng dấu phẩy từ Backend thành Set các thẻ đã chọn
          if (existing.tags != null && existing.tags!.isNotEmpty) {
            _selectedTags
              ..clear()
              ..addAll(existing.tags!.split(',').map((e) => e.trim()));
          }
          // Điền lại nội dung bình luận đã gửi vào TextEditingController
          if (existing.comment != null) {
            _commentController.text = existing.comment!;
          }
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    // Giải phóng tài nguyên của TextEditingController khi đóng màn hình
    _commentController.dispose();
    super.dispose();
  }

  // ==========================================================================
  // XỬ LÝ GỬI ĐÁNH GIÁ LÊN HỆ THỐNG BACKEND (UC-19 SUBMISSION HANDLER)
  // ==========================================================================

  /// Thu thập dữ liệu (số sao, thẻ tags, nhận xét) và gửi yêu cầu tạo đánh giá lên máy chủ.
  Future<void> _handleSubmit() async {
    // Ngăn chặn gửi trùng nếu đang có tiến trình gửi đang chạy
    if (_isSubmitting) return;
    final orderId = widget.rescueOrderId ?? 8821;
    setState(() => _isSubmitting = true);

    try {
      // Gọi API submitRating qua RatingService
      final created = await _ratingService.submitRating(
        rescueOrderId: orderId,
        stars: _stars,
        tags: _selectedTags.join(','),
        comment: _commentController.text.trim(),
      );
      if (!mounted) return;

      // Hiển thị SnackBar thông báo gửi đánh giá thành công
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đã gửi đánh giá ${created.stars} sao cho đơn ${created.rescueCode} thành công!',
          ),
          backgroundColor: Colors.green,
        ),
      );

      // Điều hướng quay về màn hình Trang chủ Khách hàng và xóa các màn hình thanh toán/đánh giá khỏi stack
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const StitchHydroRescueScreen()),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;
      final message = e.toString().replaceAll('Exception: ', '');
      // Nếu đang mở ở chế độ xem trước (Preview không có rescueOrderId thật), vẫn cho phép hoàn tất luồng mượt mà
      if (widget.rescueOrderId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Đã ghi nhận đánh giá (Chế độ xem trước khi chưa kết nối đơn thực tế).',
            ),
          ),
        );
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const StitchHydroRescueScreen()),
          (route) => false,
        );
      } else {
        // Hiển thị thông báo lỗi cụ thể từ Backend nếu gửi thất bại trên đơn thật
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } finally {
      // Khôi phục lại trạng thái nút bấm sau khi kết thúc xử lý
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  // ==========================================================================
  // XÂY DỰNG GIAO DIỆN ĐÁNH GIÁ DỊCH VỤ & THỢ CỨU HỘ (WIDGET TREE)
  // ==========================================================================

  @override
  Widget build(BuildContext context) {
    // Chuẩn bị thông tin hiển thị tên Thợ cứu hộ, tên Gara và mã đơn cứu hộ
    final mechanicDisplay = widget.mechanicName ?? 'Thợ Phạm Tuấn Anh';
    final garageDisplay =
        widget.garageName ?? 'Đội cứu hộ cơ động • Gara Toàn Thắng (Q.7)';
    final orderCodeDisplay =
        widget.rescueCode ??
        (widget.rescueOrderId != null
            ? '#RC-${widget.rescueOrderId}'
            : '#RC-8821');

    return Scaffold(
      backgroundColor: AppColors.surface,
      // Thanh tiêu đề hiển thị mã đơn cứu hộ đang được đánh giá
      appBar: AppBar(
        title: Text(
          'Đánh giá cứu hộ ($orderCodeDisplay)',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Phần tiêu đề giới thiệu ý nghĩa của việc đánh giá CSAT trong hệ thống
            const RescueIntro(
              eyebrow: 'CHẤT LƯỢNG HỖ TRỢ',
              title: 'Chia sẻ trải nghiệm',
              description: 'Đánh giá số sao và nhận xét để hệ thống cập nhật điểm uy tín (CSAT) của Thợ & Gara cứu hộ.',
            ),
            const SizedBox(height: 12),

            // Banner thông báo màu xanh nếu đơn cứu hộ này đã được khách hàng đánh giá trước đó
            if (_existingRating != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Text(
                  'Đơn cứu hộ này đã được bạn đánh giá ${_existingRating!.stars} sao.',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.green.shade800,
                  ),
                ),
              ),

            // Mechanic Portrait Card: Khung thông tin Thợ cứu hộ, Gara và dãy 5 ngôi sao tương tác
            RescuePanel(
              padding: 16,
              child: Column(
                children: [
                  // Ảnh đại diện minh họa Thợ kỹ thuật cứu hộ
                  const CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.surfaceContainerHigh,
                    child: Icon(
                      Icons.engineering,
                      size: 44,
                      color: AppColors.primaryOrange,
                    ),
                  ),
                  const SizedBox(height: 10),
                  // Tên Thợ cứu hộ phụ trách
                  Text(
                    mechanicDisplay,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  // Tên Gara / Đội cứu hộ liên kết
                  Text(
                    garageDisplay,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Interactive 5 Stars: Dãy 5 nút ngôi sao cho phép chạm để chọn điểm từ 1 đến 5
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      return IconButton(
                        icon: Icon(
                          index < _stars ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                          size: 36,
                        ),
                        // Vô hiệu hóa thao tác chọn lại nếu đơn đã được đánh giá (_existingRating != null)
                        onPressed: _existingRating != null
                            ? null
                            : () {
                                setState(() {
                                  _stars = index + 1;
                                });
                              },
                      );
                    }),
                  ),
                  // Nhãn mô tả mức độ hài lòng tương ứng với số sao đã chọn
                  Text(
                    _stars == 5
                        ? 'Cứu hộ xuất sắc! Rất hài lòng'
                        : '$_stars Sao',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.secondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'ĐIỂM NỔI BẬT CỦA THỢ:',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),

            // Tag chips: Danh sách các thẻ FilterChip cho phép chọn nhanh nhiều ưu điểm của thợ
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _tags.map((tag) {
                final isSelected = _selectedTags.contains(tag);
                return FilterChip(
                  label: Text(
                    tag,
                    style: TextStyle(
                      fontSize: 12,
                      color: isSelected ? Colors.white : AppColors.onSurface,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: AppColors.primaryOrange,
                  backgroundColor: Colors.white,
                  checkmarkColor: Colors.white,
                  // Chỉ cho phép bật/tắt thẻ tag khi đơn chưa từng được đánh giá
                  onSelected: _existingRating != null
                      ? null
                      : (val) {
                          setState(() {
                            if (val) {
                              _selectedTags.add(tag);
                            } else {
                              _selectedTags.remove(tag);
                            }
                          });
                        },
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // Comment text area: Ô nhập nhận xét chi tiết của khách hàng
            TextField(
              controller: _commentController,
              enabled: _existingRating == null,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Chia sẻ trải nghiệm của bạn...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Nút xác nhận "Gửi Đánh Giá Cứu Hộ"
            ElevatedButton(
              onPressed: (_isSubmitting || _existingRating != null)
                  ? null
                  : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                _existingRating != null
                    ? 'Đã Gửi Đánh Giá'
                    : (_isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá Cứu Hộ'),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

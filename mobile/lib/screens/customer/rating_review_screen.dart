import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/rating_service.dart';
import '../../core/widgets/rescue_ui.dart';
import 'stitch_hydro_rescue_screen.dart';

class RatingReviewScreen extends StatefulWidget {
  final int? rescueOrderId;
  final String? rescueCode;
  final String? garageName;
  final String? mechanicName;

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

class _RatingReviewScreenState extends State<RatingReviewScreen> {
  final RatingService _ratingService = RatingService();
  int _stars = 5;
  final Set<String> _selectedTags = {'Đến nhanh < 15p', 'Nhiệt tình lội nước'};
  final _commentController = TextEditingController();
  bool _isSubmitting = false;
  ServiceRatingModel? _existingRating;

  final List<String> _tags = [
    'Đến nhanh < 15p',
    'Nhiệt tình lội nước',
    'Báo giá minh bạch',
    'Tay nghề chuẩn',
    'Cứu xe chạy êm',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.rescueOrderId != null) {
      _checkExistingRating(widget.rescueOrderId!);
    }
  }

  Future<void> _checkExistingRating(int orderId) async {
    try {
      final existing = await _ratingService.getRatingByOrder(orderId);
      if (existing != null && mounted) {
        setState(() {
          _existingRating = existing;
          _stars = existing.stars;
          if (existing.tags != null && existing.tags!.isNotEmpty) {
            _selectedTags
              ..clear()
              ..addAll(existing.tags!.split(',').map((e) => e.trim()));
          }
          if (existing.comment != null) {
            _commentController.text = existing.comment!;
          }
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_isSubmitting) return;
    final orderId = widget.rescueOrderId ?? 8821;
    setState(() => _isSubmitting = true);

    try {
      final created = await _ratingService.submitRating(
        rescueOrderId: orderId,
        stars: _stars,
        tags: _selectedTags.join(','),
        comment: _commentController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đã gửi đánh giá ${created.stars} sao cho đơn ${created.rescueCode} thành công!',
          ),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => const StitchHydroRescueScreen(),
        ),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;
      final message = e.toString().replaceAll('Exception: ', '');
      if (widget.rescueOrderId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Đã ghi nhận đánh giá (Chế độ xem trước khi chưa kết nối đơn thực tế).',
            ),
          ),
        );
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => const StitchHydroRescueScreen(),
          ),
          (route) => false,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final mechanicDisplay = widget.mechanicName ?? 'Thợ Phạm Tuấn Anh';
    final garageDisplay =
        widget.garageName ?? 'Đội cứu hộ cơ động • Gara Toàn Thắng (Q.7)';
    final orderCodeDisplay = widget.rescueCode ??
        (widget.rescueOrderId != null ? '#RC-${widget.rescueOrderId}' : '#RC-8821');

    return Scaffold(
      backgroundColor: AppColors.surface,
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
            const RescueIntro(
              eyebrow: 'CHẤT LƯỢNG HỖ TRỢ • UC-19',
              title: 'Chia sẻ trải nghiệm',
              description:
                  'Đánh giá số sao và nhận xét để hệ thống cập nhật điểm uy tín (CSAT) của Thợ & Gara cứu hộ.',
            ),
            const SizedBox(height: 12),
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
            // Mechanic Portrait Card
            RescuePanel(
              padding: 16,
              child: Column(
                children: [
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
                  Text(
                    mechanicDisplay,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    garageDisplay,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Interactive 5 Stars
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      return IconButton(
                        icon: Icon(
                          index < _stars ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                          size: 36,
                        ),
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

            // Tag chips
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

            // Comment text area
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

            ElevatedButton(
              onPressed:
                  (_isSubmitting || _existingRating != null) ? null : _handleSubmit,
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
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

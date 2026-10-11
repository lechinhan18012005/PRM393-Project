import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../home/customer_home_screen.dart';

class RatingReviewScreen extends StatefulWidget {
  const RatingReviewScreen({super.key});

  @override
  State<RatingReviewScreen> createState() => _RatingReviewScreenState();
}

class _RatingReviewScreenState extends State<RatingReviewScreen> {
  int _stars = 5;
  final Set<String> _selectedTags = {'Đến nhanh < 15p', 'Nhiệt tình lội nước'};
  final _commentController = TextEditingController();

  final List<String> _tags = [
    'Đến nhanh < 15p',
    'Nhiệt tình lội nước',
    'Báo giá minh bạch',
    'Tay nghề chuẩn',
    'Cứu xe chạy êm',
  ];

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Đánh Giá & Nhận Xét', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Mechanic Portrait Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2))],
              ),
              child: Column(
                children: [
                  const CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.surfaceContainerHigh,
                    child: Icon(Icons.engineering, size: 44, color: AppColors.primaryOrange),
                  ),
                  const SizedBox(height: 10),
                  const Text('Thợ Phạm Tuấn Anh', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  const Text('Đội cứu hộ cơ động • Gara Toàn Thắng (Q.7)', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
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
                        onPressed: () {
                          setState(() {
                            _stars = index + 1;
                          });
                        },
                      );
                    }),
                  ),
                  Text(
                    _stars == 5 ? 'Cứu hộ xuất sắc! Rất hài lòng' : '$_stars Sao',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.secondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            const Text('ĐIỂM NỔI BẬT CỦA THỢ:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.outline)),
            const SizedBox(height: 8),

            // Tag chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _tags.map((tag) {
                final isSelected = _selectedTags.contains(tag);
                return FilterChip(
                  label: Text(tag, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : AppColors.onSurface)),
                  selected: isSelected,
                  selectedColor: AppColors.primaryOrange,
                  backgroundColor: Colors.white,
                  checkmarkColor: Colors.white,
                  onSelected: (val) {
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
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Viết nhận xét chi tiết để giúp cộng đồng và tăng uy tín thợ...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Cảm ơn bạn đã gửi đánh giá! Điểm uy tín của thợ đã được cập nhật.')),
                );
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const CustomerHomeScreen()),
                  (route) => false,
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Gửi Đánh Giá Cứu Hộ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}

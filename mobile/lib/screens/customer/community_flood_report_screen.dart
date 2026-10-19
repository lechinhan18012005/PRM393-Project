import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../providers/flood_report_provider.dart';

class CommunityFloodReportScreen extends StatefulWidget {
  const CommunityFloodReportScreen({super.key});

  @override
  State<CommunityFloodReportScreen> createState() =>
      _CommunityFloodReportScreenState();
}

class _CommunityFloodReportScreenState
    extends State<CommunityFloodReportScreen> {
  int _depthLevel = 2; // 1: Mắt cá, 2: Bánh xe, 3: Yên xe
  final _addressController = TextEditingController(
    text: 'Số 148 Trần Xuân Soạn, P. Tân Hưng, Q.7',
  );
  final _noteController = TextEditingController();
  final List<String> _attachedPhotos = [
    'https://res.cloudinary.com/demo/image/upload/v1/floodrescue/flood_sample_01.jpg'
  ];

  @override
  void dispose() {
    _addressController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  String _getDepthEnum() {
    switch (_depthLevel) {
      case 1:
        return 'ANKLE_20CM';
      case 3:
        return 'SEAT_60CM_PLUS';
      case 2:
      default:
        return 'HALF_WHEEL_40CM';
    }
  }

  void _addPhotoSlot(int slotIndex) async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    // Simulate attaching a real captured flood photo and uploading to Cloudinary
    final photoUrl = await context.read<FloodReportProvider>().uploadPhoto(
      utf8.encode('SIMULATED_FLOOD_IMAGE_BYTES_$slotIndex'),
      'flood_photo_$slotIndex.jpg',
    );
    setState(() {
      if (_attachedPhotos.length < 3) {
        _attachedPhotos.add(photoUrl);
      }
    });
    scaffoldMessenger.showSnackBar(
      const SnackBar(
        content: Text('Đã đính kèm ảnh hiện trường qua Cloudinary!'),
        backgroundColor: Colors.blue,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final floodProvider = context.watch<FloodReportProvider>();

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text(
          'Báo ngập',
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
            // Warning Banner
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info, color: Colors.blue, size: 24),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Chia sẻ vị trí và mực nước để cảnh báo cộng đồng và các đội cứu hộ.',
                      style: TextStyle(fontSize: 11, color: Colors.blue),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Location
            const Text(
              'VỊ TRÍ ĐIỂM NGẬP LỤT *',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _addressController,
              decoration: InputDecoration(
                prefixIcon: const Icon(
                  Icons.pin_drop,
                  color: AppColors.primaryOrange,
                ),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.my_location, color: Colors.blue),
                  onPressed: () {
                    setState(() {
                      _addressController.text = 'Đường Mễ Cốc, Phường 15, Quận 8';
                    });
                  },
                ),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Water Depth selector
            const Text(
              'Mực nước hiện tại *',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildDepthOption(1, '20cm', 'Ngập mắt cá chân', Colors.amber.shade700),
                const SizedBox(width: 8),
                _buildDepthOption(2, '40cm', 'Ngập nửa bánh xe', Colors.orange),
                const SizedBox(width: 8),
                _buildDepthOption(3, '60cm+', 'Ngập lút yên xe', Colors.red),
              ],
            ),
            const SizedBox(height: 20),

            // Photos upload section
            const Text(
              'Ảnh hiện trường (Tải lên Cloudinary) · Tối đa 3 ảnh',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildPhotoSlot(0, 'Ảnh 1'),
                const SizedBox(width: 10),
                _buildPhotoSlot(1, 'Ảnh 2'),
                const SizedBox(width: 10),
                _buildPhotoSlot(2, 'Ảnh 3'),
              ],
            ),
            const SizedBox(height: 20),

            // Note
            const Text(
              'MÔ TẢ CHI TIẾT TÌNH TRẠNG',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.outline,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _noteController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'VD: Triều cường đang dâng nhanh, đã có 4 xe chết máy tại dốc cầu...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),

            if (floodProvider.isLoading)
              const Center(child: CircularProgressIndicator())
            else
              ElevatedButton.icon(
                onPressed: () async {
                  if (_addressController.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Vui lòng nhập địa chỉ điểm ngập!')),
                    );
                    return;
                  }

                  final success = await context.read<FloodReportProvider>().submitFloodReport(
                    latitude: 10.7420 + (0.005 * (_depthLevel)),
                    longitude: 106.7020 + (0.005 * (_depthLevel)),
                    address: _addressController.text.trim(),
                    waterDepthLevel: _getDepthEnum(),
                    description: _noteController.text.trim().isNotEmpty
                        ? _noteController.text.trim()
                        : 'Triều cường dâng nhanh gây cản trở lưu thông xe máy.',
                    imageUrls: _attachedPhotos.join(','),
                  );

                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          success
                              ? 'Đã gửi báo cáo điểm ngập! Hệ thống đang cập nhật cảnh báo bản đồ.'
                              : 'Gửi báo cáo thất bại: ${floodProvider.errorMessage}',
                        ),
                        backgroundColor: success ? Colors.green : Colors.red,
                      ),
                    );
                    if (success) {
                      Navigator.of(context).pop();
                    }
                  }
                },
                icon: const Icon(Icons.send, size: 18),
                label: const Text(
                  'Gửi Báo Cáo Điểm Ngập',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
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
          ],
        ),
      ),
    );
  }

  Widget _buildDepthOption(int level, String cm, String desc, Color color) {
    final isSelected = _depthLevel == level;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _depthLevel = level),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.1) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? color : Colors.grey.shade300,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Text(
                cm,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoSlot(int index, String label) {
    final hasPhoto = index < _attachedPhotos.length;
    return Expanded(
      child: GestureDetector(
        onTap: () => _addPhotoSlot(index + 1),
        child: Container(
          height: 80,
          decoration: BoxDecoration(
            color: hasPhoto ? Colors.blue.shade50 : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: hasPhoto ? Colors.blue : Colors.grey.shade300,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                hasPhoto ? Icons.image : Icons.add_a_photo,
                color: hasPhoto ? Colors.blue : Colors.grey,
                size: 24,
              ),
              const SizedBox(height: 4),
              Text(
                hasPhoto ? '$label (Cloudinary)' : '+ Thêm ảnh',
                style: TextStyle(
                  fontSize: 9,
                  color: hasPhoto ? Colors.blue : Colors.grey.shade700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../core/widgets/rescue_ui.dart';
import '../../providers/flood_report_provider.dart';
import 'my_flood_reports_screen.dart';

class CommunityFloodReportScreen extends StatefulWidget {
  const CommunityFloodReportScreen({super.key});

  @override
  State<CommunityFloodReportScreen> createState() =>
      _CommunityFloodReportScreenState();
}

class _CommunityFloodReportScreenState
    extends State<CommunityFloodReportScreen> {
  int _depthLevel = 2; // 1: Mắt cá (20cm), 2: Bánh xe (40cm), 3: Yên xe (60cm+)
  double _latitude = 10.7423;
  double _longitude = 106.7021;

  final _addressController = TextEditingController(
    text: 'Số 148 Trần Xuân Soạn, P. Tân Hưng, Q.7',
  );
  final _noteController = TextEditingController();
  final List<String> _attachedPhotos = [
    'https://res.cloudinary.com/demo/image/upload/v1/floodrescue/flood_sample_01.jpg',
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

  void _removePhoto(int index) {
    setState(() {
      if (index >= 0 && index < _attachedPhotos.length) {
        _attachedPhotos.removeAt(index);
      }
    });
  }

  // UC-20 (4.2.1): Chọn vị trí ghim thủ công từ danh sách điểm nóng hoặc nhập tọa độ
  void _openManualPinSelector() {
    final hotspots = [
      {
        'title': 'Trần Xuân Soạn, Quận 7 (Điểm triều cường)',
        'address': 'Số 148 Trần Xuân Soạn, P. Tân Hưng, Quận 7',
        'lat': 10.7423,
        'lng': 106.7021,
      },
      {
        'title': 'Huỳnh Tấn Phát, Quận 7 (Khu vực ngập sâu)',
        'address': '520 Huỳnh Tấn Phát, P. Tân Phú, Quận 7',
        'lat': 10.7381,
        'lng': 106.7212,
      },
      {
        'title': 'Đường Mễ Cốc, Quận 8 (Vỡ bờ bao/triều dâng)',
        'address': 'Đường Mễ Cốc, Phường 15, Quận 8',
        'lat': 10.7510,
        'lng': 106.6620,
      },
      {
        'title': 'Bến Bình Đông, Quận 8 (Đoạn mé sông ngập lút bánh)',
        'address': 'Bến Bình Đông, Phường 13, Quận 8',
        'lat': 10.7420,
        'lng': 106.7020,
      },
      {
        'title': 'Đường Quốc Hương, Thảo Điền (TP. Thủ Đức)',
        'address': 'Đường Quốc Hương, P. Thảo Điền, TP. Thủ Đức',
        'lat': 10.8035,
        'lng': 106.7350,
      },
      {
        'title': 'Nguyễn Văn Quá, Quận 12 (Trũng ngập mưa lớn)',
        'address': 'Đường Nguyễn Văn Quá, P. Đông Hưng Thuận, Quận 12',
        'lat': 10.8410,
        'lng': 106.6210,
      },
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chọn hoặc Chỉnh ghim vị trí ngập',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: ListView.separated(
                  itemCount: hotspots.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, i) {
                    final h = hotspots[i];
                    return ListTile(
                      leading: const Icon(
                        Icons.pin_drop,
                        color: AppColors.primaryOrange,
                      ),
                      title: Text(
                        h['title'] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text(
                        h['address'] as String,
                        style: const TextStyle(fontSize: 12),
                      ),
                      onTap: () {
                        setState(() {
                          _addressController.text = h['address'] as String;
                          _latitude = h['lat'] as double;
                          _longitude = h['lng'] as double;
                        });
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Đã ghim vị trí: ${h['address']}'),
                            backgroundColor: Colors.green,
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
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
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const MyFloodReportsScreen(),
                ),
              );
            },
            icon: const Icon(Icons.history, size: 18),
            label: const Text('Báo cáo của tôi'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const RescueIntro(
              eyebrow: 'CỘNG ĐỒNG ĐỒNG HÀNH',
              title: 'Chia sẻ điểm ngập',
              description:
                  'Cung cấp địa chỉ và mực nước để hỗ trợ cộng đồng né tránh kịp thời và kích hoạt thợ cứu hộ ứng trực.',
            ),
            const SizedBox(height: 16),

            // Location
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'VỊ TRÍ ĐIỂM NGẬP LỤT *',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.outline,
                  ),
                ),
                GestureDetector(
                  onTap: _openManualPinSelector,
                  child: const Text(
                    '📍 Chọn điểm ngập / Chỉnh ghim',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                ),
              ],
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
                  tooltip: 'Tự động lấy vị trí hiện tại',
                  onPressed: () {
                    setState(() {
                      _latitude = 10.7423;
                      _longitude = 106.7021;
                      _addressController.text =
                          'Số 148 Trần Xuân Soạn, P. Tân Hưng, Q.7';
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Đã cập nhật vị trí GPS hiện tại!'),
                      ),
                    );
                  },
                ),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Tọa độ GPS: $_latitude, $_longitude (TP.HCM)',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
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
                _buildDepthOption(
                  1,
                  '20cm',
                  'Ngập mắt cá chân',
                  Colors.amber.shade700,
                ),
                const SizedBox(width: 8),
                _buildDepthOption(2, '40cm', 'Ngập nửa bánh xe', Colors.orange),
                const SizedBox(width: 8),
                _buildDepthOption(3, '60cm+', 'Ngập lút yên xe', Colors.red),
              ],
            ),
            const SizedBox(height: 16),

            // Photos section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'ẢNH CHỤP HIỆN TRƯỜNG (TÙY CHỌN)',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.outline,
                  ),
                ),
                Text(
                  '${_attachedPhotos.length}/3 ảnh',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildPhotoSlot(0, 'Ảnh 1'),
                const SizedBox(width: 8),
                _buildPhotoSlot(1, 'Ảnh 2'),
                const SizedBox(width: 8),
                _buildPhotoSlot(2, 'Ảnh 3'),
              ],
            ),
            const SizedBox(height: 16),

            // Note/Description
            const Text(
              'MÔ TẢ CHI TIẾT TÌNH HÌNH',
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
                hintText:
                    'VD: Nước chảy xiết, nhiều xe chết máy, có ổ gà lớn bên phải...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            if (floodProvider.isLoading)
              const Center(child: CircularProgressIndicator())
            else
              ElevatedButton.icon(
                onPressed: () async {
                  if (_addressController.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Vui lòng nhập địa chỉ điểm ngập!'),
                      ),
                    );
                    return;
                  }

                  final success = await context
                      .read<FloodReportProvider>()
                      .submitFloodReport(
                        latitude: _latitude,
                        longitude: _longitude,
                        address: _addressController.text.trim(),
                        waterDepthLevel: _getDepthEnum(),
                        description: _noteController.text.trim().isNotEmpty
                            ? _noteController.text.trim()
                            : 'Triều cường dâng nhanh gây cản trở lưu thông xe máy.',
                        imageUrls: _attachedPhotos.isNotEmpty
                            ? _attachedPhotos.join(',')
                            : null,
                      );

                  if (context.mounted) {
                    if (success) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Đã gửi báo cáo điểm ngập! Hệ thống đang cập nhật cảnh báo bản đồ (+10 điểm uy tín).',
                          ),
                          backgroundColor: Colors.green,
                        ),
                      );
                      Navigator.of(context).pop();
                    } else {
                      // Xử lý lỗi offline hoặc lỗi khác
                      final errorMsg = floodProvider.errorMessage ?? '';
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Gửi thất bại: $errorMsg'),
                          backgroundColor: Colors.red,
                          action: SnackBarAction(
                            label: 'Lưu ngoại tuyến',
                            textColor: Colors.white,
                            onPressed: () {
                              context
                                  .read<FloodReportProvider>()
                                  .enqueueOfflineReport(
                                    latitude: _latitude,
                                    longitude: _longitude,
                                    address: _addressController.text.trim(),
                                    waterDepthLevel: _getDepthEnum(),
                                    description: _noteController.text.trim(),
                                    imageUrls: _attachedPhotos.isNotEmpty
                                        ? _attachedPhotos.join(',')
                                        : null,
                                  );
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Đã lưu vào hàng đợi ngoại tuyến. Sẽ tự động gửi khi có mạng!',
                                  ),
                                  backgroundColor: Colors.blue,
                                ),
                              );
                              Navigator.of(context).pop();
                            },
                          ),
                        ),
                      );
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
      child: Stack(
        children: [
          GestureDetector(
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
              child: Center(
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
          ),
          if (hasPhoto)
            Positioned(
              top: 2,
              right: 2,
              child: GestureDetector(
                onTap: () => _removePhoto(index),
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.close,
                    size: 14,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/location_service.dart';
import '../../core/services/media_service.dart';
import '../../core/services/rescue_service.dart';
import '../home/mechanic_home_screen.dart';
import 'mechanic_ui.dart';

class CrossingTransportScreen extends StatefulWidget {
  final int? orderId;

  const CrossingTransportScreen({super.key, this.orderId});

  @override
  State<CrossingTransportScreen> createState() => _CrossingTransportScreenState();
}

class _CrossingTransportScreenState extends State<CrossingTransportScreen> {
  final RescueService _rescueService = RescueService();
  RescueOrderModel? _order;
  Timer? _transitLocationTimer;
  PickedMediaFile? _pickedFile;
  bool _isUploadingPhoto = false;
  bool _isLoading = false;
  String _currentStage = 'NONE';
  String? _photoUrl;
  String? _errorMessage;

  static const List<Map<String, dynamic>> _stageDefinitions = [
    {
      'key': 'VEHICLE_RECEIVED',
      'stepNumber': 1,
      'title': '1. Tiếp nhận xe của khách',
      'desc': 'Khách bàn giao xe và chìa khóa tại điểm đón',
      'icon': Icons.two_wheeler,
    },
    {
      'key': 'STRAPPED_SECURE',
      'stepNumber': 2,
      'title': '2. Cố định chằng buộc an toàn',
      'desc': 'Chằng buộc chắc chắn trên sàn xe bán tải/chuyên dụng',
      'icon': Icons.lock_outline,
    },
    {
      'key': 'IN_TRANSIT',
      'stepNumber': 3,
      'title': '3. Bắt đầu chở xe qua ngập',
      'desc': 'Vận chuyển xe và khách vượt qua đoạn ngập lụt',
      'icon': Icons.local_shipping_outlined,
    },
    {
      'key': 'ARRIVED_DROPOFF',
      'stepNumber': 4,
      'title': '4. Đã tới điểm trả khô ráo',
      'desc': 'Đến vị trí cao ráo an toàn bên kia điểm ngập',
      'icon': Icons.wb_sunny_outlined,
    },
    {
      'key': 'HANDED_OVER',
      'stepNumber': 5,
      'title': '5. Bàn giao xe cho khách',
      'desc': 'Hạ xe khỏi sàn chở, bàn giao lại xe và chìa khóa',
      'icon': Icons.handshake_outlined,
    },
  ];

  int _getStageIndex(String stage) {
    switch (stage) {
      case 'VEHICLE_RECEIVED':
        return 1;
      case 'STRAPPED_SECURE':
        return 2;
      case 'IN_TRANSIT':
        return 3;
      case 'ARRIVED_DROPOFF':
        return 4;
      case 'HANDED_OVER':
        return 5;
      default:
        return 0;
    }
  }

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  @override
  void dispose() {
    _transitLocationTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadOrder() async {
    if (widget.orderId == null) return;
    try {
      final order = await _rescueService.getOrderById(widget.orderId!);
      if (mounted) {
        setState(() {
          _order = order;
          _currentStage = order.transportStage;
        });

        _reportLocation();
        _transitLocationTimer = Timer.periodic(const Duration(seconds: 8), (_) {
          _reportLocation();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = e.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  Future<void> _reportLocation() async {
    if (_order == null) return;
    final loc = await LocationService.instance.getCurrentLocation();
    if (loc == null) return;
    final age = DateTime.now().difference(loc.timestamp).abs();
    if (age.inSeconds > 30) return;
    try {
      await _rescueService.updateLocation(
        _order!.id,
        loc.latitude,
        loc.longitude,
        accuracyMeters: loc.accuracyMeters,
        bearing: loc.bearing,
        speed: loc.speed,
        recordedAt: loc.timestamp.toIso8601String(),
      );
    } catch (_) {}
  }

  Future<void> _updateStage(String targetStage) async {
    if (_order == null) return;

    final currentIndex = _getStageIndex(_currentStage);
    final targetIndex = _getStageIndex(targetStage);

    // Enforce strict state progression: next step must be currentIndex + 1
    if (targetIndex != currentIndex + 1) {
      if (targetIndex <= currentIndex) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bước này đã được hoàn thành trước đó.')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Vui lòng thực hiện tuần tự, không được nhảy cóc các bước!'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    setState(() => _isLoading = true);
    try {
      final updated = await _rescueService.updateTransitStage(
        _order!.id,
        targetStage,
        note: 'Cập nhật tiến độ: $targetStage',
      );
      if (mounted) {
        setState(() {
          _order = updated;
          _currentStage = updated.transportStage;
          _isLoading = false;
        });
        _reportLocation();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã cập nhật tiến độ: $targetStage'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString().replaceFirst("Exception: ", "")}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _selectProofPhotoSource() {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: AppColors.primary),
              title: const Text('Chụp ảnh từ Camera'),
              onTap: () {
                Navigator.of(sheet).pop();
                _pickAndUploadPhoto(fromCamera: true);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: AppColors.secondary),
              title: const Text('Chọn ảnh từ Thư viện'),
              onTap: () {
                Navigator.of(sheet).pop();
                _pickAndUploadPhoto(fromCamera: false);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndUploadPhoto({required bool fromCamera}) async {
    final picked = fromCamera
        ? await MediaService.instance.pickImageFromCamera()
        : await MediaService.instance.pickImageFromGallery();

    if (!mounted) return;
    if (picked == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chưa có ảnh nào được chọn hoặc quyền truy cập bị từ chối.')),
      );
      return;
    }

    setState(() {
      _pickedFile = picked;
      _photoUrl = null;
    });

    await _uploadEvidenceFile();
  }

  Future<void> _uploadEvidenceFile() async {
    if (_pickedFile == null) return;
    if (_order == null) {
      setState(() {
        _photoUrl = 'https://res.cloudinary.com/demo/image/upload/sample_handover_success.jpg';
      });
      return;
    }

    setState(() => _isUploadingPhoto = true);
    try {
      final uploadedUrl = await _rescueService.uploadOrderEvidence(
        _order!.id,
        _pickedFile!.bytes,
        _pickedFile!.filename,
      );
      if (mounted) {
        setState(() {
          _photoUrl = uploadedUrl;
          _isUploadingPhoto = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã tải ảnh nghiệm thu bàn giao xe an toàn lên hệ thống!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi upload ảnh: ${e.toString().replaceFirst("Exception: ", "")}. Vui lòng thử lại.'),
            backgroundColor: Colors.red,
            action: SnackBarAction(
              label: 'Thử lại',
              textColor: Colors.white,
              onPressed: _uploadEvidenceFile,
            ),
          ),
        );
      }
    }
  }

  Future<void> _completeRescue() async {
    if (_order == null) return;

    if (_currentStage != 'HANDED_OVER') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bạn phải hoàn tất bước 5 (Bàn giao xe cho khách) trước khi nghiệm thu!'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_photoUrl == null || _photoUrl!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bắt buộc phải chụp ảnh nghiệm thu bàn giao trước khi hoàn tất!'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await _rescueService.completeOrder(
        _order!.id,
        _photoUrl!,
        handoverPhotoUrl: _photoUrl,
        notes: 'Đã chở xe máy qua điểm ngập an toàn và bàn giao đầy đủ cho khách',
      );

      if (mounted) {
        await showDialog<void>(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green, size: 28),
                SizedBox(width: 10),
                Text('Hoàn tất ca cứu hộ!'),
              ],
            ),
            content: const Text(
              'Ca chở xe vượt ngập đơn lẻ đã hoàn thành và nghiệm thu thành công!\n\n'
              '• Đơn hàng đã chuyển sang trạng thái CHỜ THANH TOÁN (PAYMENT_PENDING).\n'
              '• Bạn đã được giải phóng và quay về trạng thái SẴN SÀNG NHẬN ĐƠN (ONLINE).'
            ),
            actions: [
              FilledButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const MechanicHomeScreen()),
                    (route) => false,
                  );
                },
                child: const Text('Về trang chủ nhận đơn mới'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final currentIdx = _getStageIndex(_currentStage);

    return MechanicPage(
      title: 'Vận chuyển chở xe qua ngập',
      bottom: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: currentIdx == 5 ? Colors.green.shade700 : Colors.grey,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: (_isLoading || currentIdx < 5) ? null : _completeRescue,
            icon: _isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.verified),
            label: Text(
              currentIdx < 5
                  ? 'Hoàn thành bước 5 để nghiệm thu ($currentIdx/5)'
                  : 'Nghiệm thu & Hoàn tất ca cứu hộ',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      children: [
        if (_errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red, fontSize: 12),
            ),
          ),
        MechanicPanel(
          dark: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MechanicLabel(
                order != null ? 'ĐƠN HÀNG #${order.orderCode}' : 'CHUYẾN CHỞ RIÊNG',
                color: const Color(0xFFFFC09E),
              ),
              const SizedBox(height: 12),
              const Text(
                'Thực hiện chở xe\nqua vùng nước sâu',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Cước thu: ${order != null ? "${order.totalAmount.toStringAsFixed(0)} ₫" : "150.000 ₫"} · Giá niêm yết chốt cố định',
                style: const TextStyle(color: Color(0xFFB9CEDB), fontSize: 13),
              ),
            ],
          ),
        ),

        const MechanicSection('Tiến độ thực hiện (tuần tự các bước)'),
        MechanicPanel(
          child: Column(
            children: [
              for (var i = 0; i < _stageDefinitions.length; i++) ...[
                if (i > 0) const Divider(),
                _buildStageTile(_stageDefinitions[i], currentIdx),
              ],
            ],
          ),
        ),

        const MechanicSection('Chụp ảnh nghiệm thu hoàn tất'),
        MechanicPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_pickedFile != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.memory(
                    _pickedFile!.bytes,
                    height: 180,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 10),
              ] else if (_photoUrl != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    _photoUrl!,
                    height: 180,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 10),
              ],
              if (_isUploadingPhoto)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                      SizedBox(width: 8),
                      Text('Đang tải ảnh bằng chứng lên Cloudinary...', style: TextStyle(fontSize: 12, color: AppColors.primary)),
                    ],
                  ),
                )
              else if (_photoUrl != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 18),
                      SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Ảnh bàn giao đã được ghi nhận thành công trên hệ thống',
                          style: TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                )
              else if (_pickedFile != null && !_isUploadingPhoto) ...[
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.primaryOrange),
                  onPressed: _uploadEvidenceFile,
                  icon: const Icon(Icons.cloud_upload_outlined),
                  label: const Text('Thử lại tải ảnh lên hệ thống'),
                ),
                const SizedBox(height: 6),
              ],
              OutlinedButton.icon(
                onPressed: _isUploadingPhoto ? null : _selectProofPhotoSource,
                icon: const Icon(Icons.camera_alt_outlined),
                label: Text(
                  _photoUrl != null || _pickedFile != null
                      ? 'Chụp lại hoặc chọn ảnh khác'
                      : 'Mở Camera / Thư viện chụp ảnh xe bàn giao',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStageTile(Map<String, dynamic> def, int currentIdx) {
    final stepNum = def['stepNumber'] as int;
    final stageKey = def['key'] as String;
    final title = def['title'] as String;
    final desc = def['desc'] as String;
    final icon = def['icon'] as IconData;

    final isCompleted = stepNum <= currentIdx;
    final isNext = stepNum == currentIdx + 1;
    final isLocked = stepNum > currentIdx + 1;

    return InkWell(
      onTap: isNext ? () => _updateStage(stageKey) : null,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        decoration: BoxDecoration(
          color: isNext ? Colors.amber.shade50 : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: isCompleted
                  ? Colors.green.shade100
                  : isNext
                      ? AppColors.primaryContainer
                      : Colors.grey.shade100,
              child: Icon(
                icon,
                color: isCompleted
                    ? Colors.green.shade800
                    : isNext
                        ? AppColors.primary
                        : Colors.grey.shade400,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: isCompleted
                          ? Colors.green.shade800
                          : isNext
                              ? AppColors.primary
                              : Colors.grey.shade500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    desc,
                    style: TextStyle(
                      fontSize: 12,
                      color: isLocked ? Colors.grey.shade400 : AppColors.secondary,
                    ),
                  ),
                ],
              ),
            ),
            if (isCompleted)
              const Icon(Icons.check_circle, color: Colors.green, size: 22)
            else if (isNext)
              FilledButton.tonal(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  visualDensity: VisualDensity.compact,
                ),
                onPressed: _isLoading ? null : () => _updateStage(stageKey),
                child: const Text('Bấm xác nhận', style: TextStyle(fontSize: 11)),
              )
            else
              const Icon(Icons.lock_outline, color: Colors.grey, size: 18),
          ],
        ),
      ),
    );
  }
}

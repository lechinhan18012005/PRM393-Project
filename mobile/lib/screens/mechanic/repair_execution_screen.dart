import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/rescue_order_model.dart';
import '../../core/services/media_service.dart';
import '../../core/services/rescue_service.dart';
import '../../features/execution/execution_api.dart';
import '../customer/vietqr_payment_screen.dart';
import 'mechanic_ui.dart';

class RepairExecutionScreen extends StatefulWidget {
  const RepairExecutionScreen({super.key, this.orderId, this.orderType});

  final int? orderId;
  final String? orderType;

  @override
  State<RepairExecutionScreen> createState() => _RepairExecutionScreenState();
}

class _RepairExecutionScreenState extends State<RepairExecutionScreen> {
  final _api = ExecutionApi();
  final _rescueService = RescueService();
  final _done = <int>{};
  bool _started = false;
  bool _towing = false;
  bool _pickedUp = false;
  bool _transferred = false;
  bool _delivered = false;
  bool _busy = false;
  bool _uploadingEvidence = false;
  PickedMediaFile? _evidenceFile;
  String? _evidenceUrl;
  String? _evidenceUploadError;
  RescueOrderModel? _order;

  static const _steps = [
    'Tháo bugi, sấy khô và chống ẩm',
    'Xả sạch nước trong buồng đốt',
    'Thay nhớt cũ bị nhiễm nước',
    'Kiểm tra lọc gió và dây điện',
    'Khởi động và kiểm tra vận hành',
  ];

  @override
  void initState() {
    super.initState();
    _towing = widget.orderType == 'TOWING';
    if (widget.orderId != null) {
      _loadHistory();
      _loadOrder();
    }
  }

  Future<void> _loadOrder() async {
    try {
      final order = await _rescueService.getOrderById(widget.orderId!);
      if (!mounted) return;
      setState(() => _order = order);
    } catch (_) {
      // Thao tác chính vẫn có thể tiếp tục; backend luôn tự xác định chi nhánh đích.
    }
  }

  Future<void> _loadHistory() async {
    try {
      final records = await _api.history(widget.orderId!);
      if (!mounted) return;
      final actions = records
          .map((record) => record['action']?.toString())
          .toSet();
      final completedSteps = <int>{};
      for (final record in records) {
        if (record['action']?.toString() != 'PROGRESS_UPDATED') continue;
        final note = record['note']?.toString() ?? '';
        final match = RegExp(r'^CHECKLIST_STEP:(\d+)$').firstMatch(note);
        final step = match == null ? null : int.tryParse(match.group(1)!);
        if (step != null && step >= 0 && step < _steps.length) {
          completedSteps.add(step);
        }
      }
      String? evidence;
      for (final record in records.reversed) {
        final url = record['evidenceImageUrl']?.toString();
        if (url != null && url.isNotEmpty) {
          evidence = url;
          break;
        }
      }
      setState(() {
        _started = actions.contains('SERVICE_STARTED');
        _towing = _towing || actions.contains('TRANSFER_TO_GARAGE');
        _pickedUp = actions.contains('VEHICLE_PICKED_UP');
        _transferred = actions.contains('TRANSFER_TO_GARAGE');
        _delivered = actions.contains('VEHICLE_DELIVERED');
        _evidenceUrl = evidence;
        _done
          ..clear()
          ..addAll(completedSteps);
      });
    } catch (_) {
      // Màn hình vẫn cho phép thử lại thao tác chính khi lịch sử tạm lỗi.
    }
  }

  Future<bool> _run(Future<void> Function() action, String success) async {
    setState(() => _busy = true);
    try {
      await action();
      if (!mounted) return false;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(success)));
      return true;
    } catch (e) {
      if (!mounted) return false;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _start() async {
    final success = await _run(
      () => _api.start(widget.orderId!),
      'Đã bắt đầu thực hiện dịch vụ',
    );
    if (success && mounted) setState(() => _started = true);
  }

  Future<void> _transfer() async {
    final success = await _run(
      () => _api.transferToGarage(widget.orderId!),
      'Đã bắt đầu vận chuyển xe về garage',
    );
    if (success && mounted) setState(() => _transferred = true);
  }

  Future<void> _pickEvidence() async {
    final fromCamera = await showModalBottomSheet<bool>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Chụp ảnh bằng Camera'),
              onTap: () => Navigator.of(sheet).pop(true),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Chọn ảnh từ Thư viện'),
              onTap: () => Navigator.of(sheet).pop(false),
            ),
          ],
        ),
      ),
    );
    if (fromCamera == null) return;
    final file = fromCamera
        ? await MediaService.instance.pickImageFromCamera()
        : await MediaService.instance.pickImageFromGallery();
    if (file != null && mounted) {
      setState(() {
        _evidenceFile = file;
        _evidenceUrl = null;
        _evidenceUploadError = null;
      });
      await _prepareEvidenceUpload();
    }
  }

  Future<String?> _uploadEvidence() async {
    if (_evidenceUrl != null) return _evidenceUrl;
    final file = _evidenceFile;
    if (file == null) return null;
    if (mounted) {
      setState(() {
        _uploadingEvidence = true;
        _evidenceUploadError = null;
      });
    }
    try {
      final url = await _rescueService.uploadOrderEvidence(
        widget.orderId!,
        file.bytes,
        file.filename,
      );
      if (mounted) setState(() => _evidenceUrl = url);
      return url;
    } catch (error) {
      if (mounted) {
        setState(() {
          _evidenceUploadError = error.toString().replaceFirst(
            'Exception: ',
            '',
          );
        });
      }
      rethrow;
    } finally {
      if (mounted) setState(() => _uploadingEvidence = false);
    }
  }

  Future<void> _prepareEvidenceUpload() async {
    try {
      await _uploadEvidence();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tải ảnh chưa thành công. Bạn có thể bấm thử lại.'),
        ),
      );
    }
  }

  Future<void> _completeChecklistStep(int index) async {
    if (_done.contains(index) || index != _done.length || _busy) return;
    if (widget.orderId == null) {
      setState(() => _done.add(index));
      return;
    }
    if (!_started) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cần bắt đầu dịch vụ trước')),
      );
      return;
    }
    final success = await _run(
      () => _api.updateProgress(widget.orderId!, 'CHECKLIST_STEP:$index'),
      'Đã hoàn thành bước ${index + 1}',
    );
    if (success && mounted) setState(() => _done.add(index));
  }

  Future<void> _markPickedUp() async {
    final success = await _run(
      () => _api.pickedUp(widget.orderId!),
      'Đã xác nhận nhận xe',
    );
    if (success && mounted) setState(() => _pickedUp = true);
  }

  Future<void> _markDelivered() async {
    final success = await _run(() async {
      final imageUrl = await _uploadEvidence();
      if (imageUrl == null) throw Exception('Cần chụp ảnh bàn giao xe');
      await _api.delivered(widget.orderId!, imageUrl);
    }, 'Đã xác nhận bàn giao xe');
    if (success && mounted) setState(() => _delivered = true);
  }

  Future<void> _complete() async {
    if (_evidenceFile == null && _evidenceUrl == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Cần chụp ảnh nghiệm thu')));
      return;
    }
    if (_towing && !_delivered) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cần xác nhận bàn giao xe trước')),
      );
      return;
    }
    final success = await _run(() async {
      final imageUrl = await _uploadEvidence();
      if (imageUrl == null) throw Exception('Không thể tải ảnh nghiệm thu');
      await _api.requestCompletion(widget.orderId!, imageUrl);
    }, 'Đã gửi ảnh nghiệm thu và yêu cầu hoàn tất đơn');
    if (success && mounted) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) =>
      widget.orderId == null ? _buildDemo(context) : _buildConnected(context);

  Widget _buildConnected(BuildContext context) {
    final towingCompleted = [
      _started,
      _pickedUp,
      _transferred,
      _delivered,
    ].where((done) => done).length;
    final completed = _towing ? towingCompleted : _done.length;
    final total = _towing ? 4 : _steps.length;
    final canComplete =
        _started && (_towing ? _delivered : _done.length == _steps.length);

    return MechanicPage(
      title: _towing ? 'Kéo xe về garage' : 'Sửa chữa tại chỗ',
      showDemoNotice: false,
      bottom: FilledButton.icon(
        onPressed: _busy || _uploadingEvidence || !canComplete
            ? null
            : _complete,
        icon: const Icon(Icons.task_alt),
        label: Text(
          _towing ? 'Hoàn tất bàn giao xe' : 'Gửi yêu cầu nghiệm thu',
        ),
      ),
      children: [
        MechanicPanel(
          dark: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MechanicLabel(
                'ĐƠN #${widget.orderId} · ${_towing ? "KÉO XE" : "SỬA TẠI CHỖ"}',
                color: const Color(0xFF76D6B5),
              ),
              const SizedBox(height: 14),
              Text(
                _towing ? 'Vận chuyển xe an toàn' : 'Khôi phục xe tại chỗ',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '$completed/$total bước đã hoàn thành',
                style: const TextStyle(color: Color(0xFFB9CEDB), fontSize: 12),
              ),
              const SizedBox(height: 16),
              LinearProgressIndicator(
                value: completed / total,
                color: const Color(0xFF76D6B5),
                backgroundColor: Colors.white12,
                borderRadius: BorderRadius.circular(6),
                minHeight: 6,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _busy || _started ? null : _start,
          icon: const Icon(Icons.play_arrow),
          label: Text(
            _started
                ? 'Đang thực hiện dịch vụ'
                : _towing
                ? 'Bắt đầu quy trình kéo xe'
                : 'Bắt đầu sửa chữa tại chỗ',
          ),
        ),
        if (_towing) ..._buildTowingWorkflow() else ..._buildRepairWorkflow(),
        MechanicSection(
          _towing ? 'Ảnh bàn giao tại garage' : 'Kiểm tra trước nghiệm thu',
        ),
        _evidencePanel(towing: _towing),
        if (_towing) ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed:
                  _busy ||
                      _uploadingEvidence ||
                      _evidenceUrl == null ||
                      !_transferred ||
                      _delivered
                  ? null
                  : _markDelivered,
              icon: const Icon(Icons.handshake_outlined),
              label: Text(
                _delivered
                    ? 'Đã bàn giao xe tại garage'
                    : 'Xác nhận bàn giao xe tại garage',
              ),
            ),
          ),
        ],
        const SizedBox(height: 8),
        Text(
          _towing
              ? 'Dịch vụ kết thúc khi xe được bàn giao tại garage. Giá kéo xe không bao gồm sửa chữa.'
              : 'Sau khi gửi nghiệm thu, khách hàng sẽ nhận yêu cầu xác nhận và thanh toán.',
          style: const TextStyle(
            color: AppColors.secondary,
            fontSize: 12,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  List<Widget> _buildRepairWorkflow() => [
    const MechanicSection('Quy trình sửa chữa tại chỗ'),
    _checklist(),
  ];

  List<Widget> _buildTowingWorkflow() => [
    const MechanicSection('Quy trình kéo xe'),
    MechanicPanel(
      child: Column(
        children: [
          MechanicInfo(
            icon: Icons.garage_outlined,
            title: _order?.branchName ?? 'Chi nhánh garage đích',
            value:
                _order?.branchAddress ??
                'Hệ thống tự xác định theo chi nhánh đang quản lý đơn và thợ.',
          ),
          const Divider(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _busy || !_started || _pickedUp ? null : _markPickedUp,
              icon: const Icon(Icons.key_outlined),
              label: Text(
                _pickedUp ? 'Đã tiếp nhận xe' : '1. Xác nhận tiếp nhận xe',
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _busy || !_pickedUp || _transferred ? null : _transfer,
              icon: const Icon(Icons.local_shipping_outlined),
              label: Text(
                _transferred
                    ? 'Đang vận chuyển về garage'
                    : '2. Bắt đầu vận chuyển về garage',
              ),
            ),
          ),
        ],
      ),
    ),
  ];

  Widget _evidencePanel({required bool towing}) => MechanicPanel(
    child: Column(
      children: [
        MechanicInfo(
          icon: towing ? Icons.garage_outlined : Icons.verified_outlined,
          title: towing ? 'Bàn giao xe' : 'An toàn vận hành',
          value: towing
              ? 'Chụp xe tại chi nhánh garage đích trước khi xác nhận bàn giao.'
              : 'Kiểm tra máy nổ đều, không có tiếng lạ và rò rỉ.',
        ),
        const Divider(),
        if (_evidenceFile != null) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.memory(
              _evidenceFile!.bytes,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 8),
        ],
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _busy || _uploadingEvidence ? null : _pickEvidence,
            icon: const Icon(Icons.add_a_photo_outlined),
            label: Text(
              _uploadingEvidence
                  ? 'Đang tải ảnh lên...'
                  : _evidenceFile == null && _evidenceUrl == null
                  ? towing
                        ? 'Thêm ảnh bàn giao xe'
                        : 'Thêm ảnh nghiệm thu sửa chữa'
                  : 'Chụp hoặc chọn lại ảnh',
            ),
          ),
        ),
        if (_uploadingEvidence) ...[
          const SizedBox(height: 8),
          const LinearProgressIndicator(),
          const SizedBox(height: 6),
          const Text(
            'Ảnh đang được tối ưu và tải lên trước để bước hoàn tất nhanh hơn.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.secondary, fontSize: 11),
          ),
        ],
        if (_evidenceUrl != null)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'Ảnh đã được tải lên hệ thống',
              style: TextStyle(color: Colors.green, fontSize: 12),
            ),
          ),
        if (_evidenceUploadError != null && !_uploadingEvidence) ...[
          const SizedBox(height: 8),
          Text(
            _evidenceUploadError!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red, fontSize: 11),
          ),
          TextButton.icon(
            onPressed: _prepareEvidenceUpload,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử tải ảnh lại'),
          ),
        ],
      ],
    ),
  );

  Widget _buildDemo(BuildContext context) => MechanicPage(
    title: 'Sửa chữa & bàn giao',
    bottom: FilledButton.icon(
      onPressed: _done.length != _steps.length
          ? null
          : () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const VietQRPaymentScreen()),
            ),
      icon: const Icon(Icons.check_circle_outline),
      label: const Text('Hoàn tất · Xem thanh toán mẫu'),
    ),
    children: [
      MechanicPanel(
        dark: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const MechanicLabel('ĐƠN MẪU #SOS-8924', color: Color(0xFF76D6B5)),
            const SizedBox(height: 14),
            const Text(
              'Khôi phục hành trình',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${_done.length}/${_steps.length} bước đã hoàn thành',
              style: const TextStyle(color: Color(0xFFB9CEDB), fontSize: 12),
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: _done.length / _steps.length,
              color: const Color(0xFF76D6B5),
              backgroundColor: Colors.white12,
              borderRadius: BorderRadius.circular(6),
              minHeight: 6,
            ),
          ],
        ),
      ),
      const MechanicSection('Quy trình sửa chữa'),
      _checklist(),
      const MechanicSection('Kiểm tra trước bàn giao'),
      const MechanicPanel(
        child: Column(
          children: [
            MechanicInfo(
              icon: Icons.verified_outlined,
              title: 'An toàn vận hành',
              value: 'Kiểm tra máy nổ đều, không có tiếng lạ và rò rỉ.',
            ),
            Divider(),
            MechanicInfo(
              icon: Icons.info_outline,
              title: 'Mô phỏng quy trình',
              value: 'Checklist chỉ lưu tạm trên màn hình, chưa gửi biên bản sửa chữa lên hệ thống.',
            ),
          ],
        ),
      ),
    ],
  );

  Widget _checklist() => MechanicPanel(
    padding: 0,
    child: Column(
      children: List.generate(_steps.length, (index) {
        final completed = _done.contains(index);
        final canComplete =
            !_busy &&
            index == _done.length &&
            (widget.orderId == null || _started);
        return CheckboxListTile(
          value: completed,
          onChanged: completed
              ? (_) {}
              : canComplete
              ? (_) => _completeChecklistStep(index)
              : null,
          controlAffinity: ListTileControlAffinity.leading,
          title: Text(
            _steps[index],
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
          subtitle: Text(
            completed
                ? 'Đã hoàn thành'
                : index == _done.length
                ? 'Bước ${index + 1} · Thực hiện tiếp theo'
                : 'Bước ${index + 1}',
            style: const TextStyle(fontSize: 11, color: AppColors.secondary),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 6,
          ),
        );
      }),
    ),
  );
}

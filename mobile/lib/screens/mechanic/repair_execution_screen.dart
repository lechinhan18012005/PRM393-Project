import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
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
  final _destinationBranch = TextEditingController();
  final _progressNote = TextEditingController();
  final _done = <int>{0, 1, 2, 3};
  bool _started = false;
  bool _towing = false;
  bool _pickedUp = false;
  bool _transferred = false;
  bool _delivered = false;
  bool _busy = false;
  PickedMediaFile? _evidenceFile;
  String? _evidenceUrl;

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
    if (widget.orderId != null) _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final records = await _api.history(widget.orderId!);
      if (!mounted) return;
      final actions = records
          .map((record) => record['action']?.toString())
          .toSet();
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
    final branchId = int.tryParse(_destinationBranch.text);
    if (branchId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Nhập ID chi nhánh hợp lệ')));
      return;
    }
    final success = await _run(
      () => _api.transferToGarage(widget.orderId!, branchId),
      'Đã bắt đầu vận chuyển xe về garage',
    );
    if (success && mounted) setState(() => _transferred = true);
  }

  Future<void> _pickEvidence() async {
    final file = await MediaService.instance.pickImageFromCamera();
    if (file != null && mounted) {
      setState(() {
        _evidenceFile = file;
        _evidenceUrl = null;
      });
    }
  }

  Future<String?> _uploadEvidence() async {
    if (_evidenceUrl != null) return _evidenceUrl;
    final file = _evidenceFile;
    if (file == null) return null;
    final url = await _rescueService.uploadOrderEvidence(
      widget.orderId!,
      file.bytes,
      file.filename,
    );
    if (mounted) setState(() => _evidenceUrl = url);
    return url;
  }

  Future<void> _updateProgress() async {
    final note = _progressNote.text.trim();
    if (note.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Nhập nội dung tiến độ')));
      return;
    }
    final success = await _run(() async {
      final imageUrl = await _uploadEvidence();
      await _api.updateProgress(widget.orderId!, note, imageUrl: imageUrl);
    }, 'Đã cập nhật tiến độ');
    if (success) _progressNote.clear();
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
    await _run(() async {
      final imageUrl = await _uploadEvidence();
      if (imageUrl == null) throw Exception('Không thể tải ảnh nghiệm thu');
      await _api.requestCompletion(widget.orderId!, imageUrl);
    }, 'Đã gửi ảnh nghiệm thu và yêu cầu hoàn tất đơn');
  }

  @override
  void dispose() {
    _destinationBranch.dispose();
    _progressNote.dispose();
    super.dispose();
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
      bottom: FilledButton.icon(
        onPressed: _busy || !canComplete ? null : _complete,
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
        const MechanicSection('Cập nhật tiến độ'),
        _progressPanel(),
        MechanicSection(
          _towing ? 'Ảnh bàn giao tại garage' : 'Kiểm tra trước nghiệm thu',
        ),
        _evidencePanel(towing: _towing),
        if (_towing) ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _busy || !_transferred || _delivered
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
              ? 'Đơn kéo xe kết thúc khi xe được bàn giao tại garage. Việc sửa chữa tại garage phải được tiếp nhận và báo giá riêng.'
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
    const SizedBox(height: 8),
    const MechanicPanel(
      child: MechanicInfo(
        icon: Icons.info_outline,
        title: 'Xe không thể sửa tại chỗ?',
        value: 'Quay lại màn hình Lập báo giá, chọn phương án kéo xe và chờ khách hàng duyệt trước khi nhận xe.',
      ),
    ),
  ];

  List<Widget> _buildTowingWorkflow() => [
    const MechanicSection('Quy trình kéo xe'),
    MechanicPanel(
      child: Column(
        children: [
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
          TextField(
            controller: _destinationBranch,
            enabled: _pickedUp && !_transferred,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'ID chi nhánh garage đích',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
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

  Widget _progressPanel() => MechanicPanel(
    child: Column(
      children: [
        TextField(
          controller: _progressNote,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: _towing
                ? 'Tình trạng vận chuyển'
                : 'Nội dung sửa chữa vừa thực hiện',
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _busy || !_started ? null : _updateProgress,
            icon: const Icon(Icons.update),
            label: const Text('Lưu tiến độ'),
          ),
        ),
      ],
    ),
  );

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
            onPressed: _busy ? null : _pickEvidence,
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(
              _evidenceFile == null && _evidenceUrl == null
                  ? towing
                        ? 'Chụp ảnh bàn giao xe'
                        : 'Chụp ảnh nghiệm thu sửa chữa'
                  : 'Chụp lại ảnh',
            ),
          ),
        ),
        if (_evidenceUrl != null)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'Ảnh đã được tải lên hệ thống',
              style: TextStyle(color: Colors.green, fontSize: 12),
            ),
          ),
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
      children: List.generate(
        _steps.length,
        (index) => CheckboxListTile(
          value: _done.contains(index),
          onChanged: (selected) => setState(() {
            selected == true ? _done.add(index) : _done.remove(index);
          }),
          controlAffinity: ListTileControlAffinity.leading,
          title: Text(
            _steps[index],
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
          subtitle: Text(
            'Bước ${index + 1}',
            style: const TextStyle(fontSize: 11, color: AppColors.secondary),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 6,
          ),
        ),
      ),
    ),
  );
}

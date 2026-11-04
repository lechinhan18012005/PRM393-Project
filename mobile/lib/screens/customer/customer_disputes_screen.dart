import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/dispute_service.dart';
import '../../core/widgets/rescue_ui.dart';

class CustomerDisputesScreen extends StatefulWidget {
  final DisputeService? disputeService;
  const CustomerDisputesScreen({super.key, this.disputeService});

  @override
  State<CustomerDisputesScreen> createState() => _CustomerDisputesScreenState();
}

class _CustomerDisputesScreenState extends State<CustomerDisputesScreen> {
  late final DisputeService _disputeService;
  List<ServiceDisputeModel> _disputes = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _disputeService = widget.disputeService ?? DisputeService();
    _loadDisputes();
  }

  Future<void> _loadDisputes() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _disputeService.getMyDisputes();
      if (mounted) {
        setState(() {
          _disputes = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  String _formatVnd(double amount) {
    final str = amount.round().toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(str[i]);
    }
    return '${buffer.toString()} đ';
  }

  String _mapDisputeType(String type) {
    switch (type) {
      case 'OVERCHARGE':
        return 'Thu vượt báo giá / phụ phí';
      case 'POOR_QUALITY':
        return 'Chất lượng cứu hộ không đạt';
      case 'DAMAGE':
        return 'Hư hỏng phương tiện khi kéo';
      case 'FAKE_RESCUE':
        return 'Báo khống / hủy sau thu tiền';
      default:
        return 'Tranh chấp dịch vụ';
    }
  }

  Widget _buildStatusBadge(String status) {
    Color bg;
    Color fg;
    String text;
    IconData icon;

    switch (status) {
      case 'REFUNDED':
        bg = Colors.green.shade50;
        fg = Colors.green.shade800;
        text = 'ĐÃ HOÀN TIỀN';
        icon = Icons.check_circle_outline;
        break;
      case 'ADMIN_APPROVAL':
        bg = Colors.blue.shade50;
        fg = Colors.blue.shade800;
        text = 'CHỜ ADMIN DUYỆT HOÀN';
        icon = Icons.hourglass_top_outlined;
        break;
      case 'REJECTED':
        bg = Colors.red.shade50;
        fg = Colors.red.shade800;
        text = 'BÁC BỎ KHIẾU NẠI';
        icon = Icons.cancel_outlined;
        break;
      case 'STAFF_REVIEW':
      default:
        bg = Colors.amber.shade50;
        fg = Colors.amber.shade900;
        text = 'STAFF ĐANG XÁC MINH';
        icon = Icons.manage_search_outlined;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: fg.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              color: fg,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  void _showImagePreview(BuildContext context, String imageUrl) {
    showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(24),
                  child: const Text('Không thể tải hình ảnh chứng từ.'),
                ),
              ),
            ),
            IconButton(
              icon: const CircleAvatar(
                backgroundColor: Colors.black54,
                child: Icon(Icons.close, color: Colors.white, size: 20),
              ),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredDisputes = _disputes.where((d) {
      if (_selectedFilter == 'ALL') return true;
      return d.status == _selectedFilter;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Khiếu nại & Hoàn tiền',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadDisputes,
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Intro Banner
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: RescueIntro(
                  eyebrow: 'TRUNG TÂM HỖ TRỢ & BẢO HÀNH',
                  title: 'Tiến trình bồi hoàn dịch vụ',
                  description:
                      'Theo dõi biên bản thẩm tra hiện trường của CSKH và quyết định hoàn tiền từ Quản trị viên.',
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_disputes.length} hồ sơ',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
              ),

              // Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    _filterChip('Tất cả', 'ALL'),
                    const SizedBox(width: 8),
                    _filterChip('Staff đang xét', 'STAFF_REVIEW'),
                    const SizedBox(width: 8),
                    _filterChip('Chờ Admin duyệt', 'ADMIN_APPROVAL'),
                    const SizedBox(width: 8),
                    _filterChip('Đã hoàn tiền', 'REFUNDED'),
                    const SizedBox(width: 8),
                    _filterChip('Bác bỏ', 'REJECTED'),
                  ],
                ),
              ),

              const Divider(height: 1),

              // Content List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _errorMessage != null
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.error_outline,
                                    size: 48,
                                    color: Colors.red,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Lỗi tải danh sách khiếu nại:\n$_errorMessage',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: AppColors.secondary),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    onPressed: _loadDisputes,
                                    icon: const Icon(Icons.refresh),
                                    label: const Text('Thử lại'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : filteredDisputes.isEmpty
                            ? _buildEmptyState()
                            : RefreshIndicator(
                                onRefresh: _loadDisputes,
                                child: ListView.builder(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: filteredDisputes.length,
                                  itemBuilder: (ctx, idx) =>
                                      _buildDisputeCard(filteredDisputes[idx]),
                                ),
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filterChip(String label, String value) {
    final selected = _selectedFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _selectedFilter = value),
      selectedColor: AppColors.primaryContainer,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
        color: selected ? AppColors.primary : AppColors.secondary,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.assignment_turned_in_outlined,
                size: 56,
                color: Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Không có hồ sơ khiếu nại nào',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _selectedFilter == 'ALL'
                  ? 'Nếu có phát sinh sai lệch cước hoặc hư hỏng sau cứu hộ, bạn có thể mở biên nhận cứu hộ để gửi khiếu nại.'
                  : 'Không có khiếu nại nào ở bộ lọc này.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.secondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDisputeCard(ServiceDisputeModel d) {
    final evidenceUrls = (d.evidenceImageUrls != null && d.evidenceImageUrls!.isNotEmpty)
        ? d.evidenceImageUrls!
            .split(',')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList()
        : <String>[];

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Card Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      d.disputeCode,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '(${d.rescueCode})',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
                _buildStatusBadge(d.status),
              ],
            ),

            const SizedBox(height: 12),

            // Dispute info summary
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Phân loại:',
                        style: TextStyle(fontSize: 12, color: AppColors.secondary),
                      ),
                      Text(
                        _mapDisputeType(d.disputeType),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Tiền gốc đã thanh toán:',
                        style: TextStyle(fontSize: 12, color: AppColors.secondary),
                      ),
                      Text(
                        _formatVnd(d.originalAmount),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Số tiền bạn yêu cầu hoàn:',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                      ),
                      Text(
                        _formatVnd(d.requestedRefundAmount),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Colors.red,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Customer Reason
            const Text(
              'Lý do khiếu nại của bạn:',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.secondary),
            ),
            const SizedBox(height: 4),
            Text(
              d.customerReason,
              style: const TextStyle(fontSize: 13, height: 1.4),
            ),

            // Evidence photos
            if (evidenceUrls.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Bằng chứng đính kèm (${evidenceUrls.length} ảnh):',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.secondary,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 80,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: evidenceUrls.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, imgIdx) {
                    final url = evidenceUrls[imgIdx];
                    return GestureDetector(
                      onTap: () => _showImagePreview(context, url),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          url,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 80,
                            height: 80,
                            color: Colors.grey.shade200,
                            child: const Icon(Icons.broken_image, size: 24),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],

            // Step Progress Cards
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 12),

            // Staff finding section (UC-23)
            if (d.staffFindingNote != null && d.staffFindingNote!.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.assignment_turned_in, size: 16, color: Colors.blue.shade800),
                        const SizedBox(width: 6),
                        Text(
                          'Kết luận thẩm tra của CSKH (Staff)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '"${d.staffFindingNote}"',
                      style: TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: Colors.blue.shade900),
                    ),
                    if (d.proposedRefundAmount != null && d.proposedRefundAmount! > 0) ...[
                      const SizedBox(height: 6),
                      Text(
                        '→ Đề xuất Admin hoàn lại: ${_formatVnd(d.proposedRefundAmount!)}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Colors.blue.shade900,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

            // Admin decision section (UC-27)
            if (d.status == 'REFUNDED' || d.status == 'REJECTED' || (d.adminResolutionNote != null && d.adminResolutionNote!.isNotEmpty))
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: d.status == 'REFUNDED'
                      ? Colors.green.shade50
                      : (d.status == 'REJECTED' ? Colors.red.shade50 : Colors.grey.shade100),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: d.status == 'REFUNDED'
                        ? Colors.green.shade300
                        : (d.status == 'REJECTED' ? Colors.red.shade300 : Colors.grey.shade300),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Icon(
                          d.status == 'REFUNDED' ? Icons.verified : Icons.gavel,
                          size: 16,
                          color: d.status == 'REFUNDED' ? Colors.green.shade800 : Colors.red.shade800,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          d.status == 'REFUNDED'
                              ? 'Quyết định hoàn tiền của Admin (Thành công)'
                              : 'Quyết định của Ban Quản Trị (Admin)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: d.status == 'REFUNDED' ? Colors.green.shade900 : Colors.red.shade900,
                          ),
                        ),
                      ],
                    ),
                    if (d.approvedRefundAmount != null && d.approvedRefundAmount! > 0) ...[
                      const SizedBox(height: 6),
                      Text(
                        'Số tiền duyệt bồi hoàn: ${_formatVnd(d.approvedRefundAmount!)}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Colors.green.shade900,
                        ),
                      ),
                    ],
                    if (d.refundReferenceCode != null && d.refundReferenceCode!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Mã đối soát hoàn tiền: ${d.refundReferenceCode}',
                        style: TextStyle(
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: Colors.green.shade800,
                        ),
                      ),
                    ],
                    if (d.adminResolutionNote != null && d.adminResolutionNote!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        '"${d.adminResolutionNote}"',
                        style: TextStyle(
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                          color: d.status == 'REFUNDED' ? Colors.green.shade900 : Colors.red.shade900,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

            if (d.status == 'STAFF_REVIEW' && (d.staffFindingNote == null || d.staffFindingNote!.isEmpty))
              Row(
                children: [
                  const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Đang chờ bộ phận CSKH đối chiếu chứng từ hiện trường...',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.amber.shade900,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}


import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/branch_model.dart';
import 'package:mobile/providers/garage_provider.dart';
import 'package:mobile/screens/garage/branch_management_screen.dart';
import 'package:provider/provider.dart';

void main() {
  group('UC-04: Quản lý chi nhánh cứu hộ Test', () {
    testWidgets('Kiểm tra hiển thị danh sách chi nhánh, hotline, địa chỉ và thợ trực chiến',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final garageProvider = GarageProvider();

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<GarageProvider>.value(
            value: garageProvider,
            child: const BranchManagementScreen(),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));

      // 1. Kiểm tra tiêu đề màn hình
      expect(find.text('Quản lý chi nhánh'), findsOneWidget);
      expect(find.text('Danh sách các chi nhánh của gara'), findsOneWidget);

      // 2. Kiểm tra thông tin hiển thị của chi nhánh
      expect(find.text('Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)'), findsOneWidget);
      expect(find.textContaining('85 Huỳnh Tấn Phát'), findsOneWidget);
      expect(find.textContaining('Hotline:'), findsWidgets);
      expect(find.textContaining('Thợ trực chiến:'), findsWidgets);

      // 3. Kiểm tra nút chuyển trạng thái hiển thị "Đang hoạt động"
      expect(find.text('Đang hoạt động'), findsWidgets);
    });

    testWidgets('Kiểm tra chuyển đổi trạng thái đóng/mở chi nhánh tức thì',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final garageProvider = GarageProvider();

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<GarageProvider>.value(
            value: garageProvider,
            child: const BranchManagementScreen(),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));

      // Bấm vào nút chip trạng thái đầu tiên
      final chipFinder = find.text('Đang hoạt động').first;
      await tester.tap(chipFinder);
      await tester.pump(); // Instant state update

      // Trạng thái chuyển tức thì sang "Tạm đóng"
      expect(find.text('Tạm đóng'), findsWidgets);

      // Bấm tiếp lần nữa để mở lại hoạt động tức thì
      final closedChipFinder = find.text('Tạm đóng').first;
      await tester.tap(closedChipFinder);
      await tester.pump();

      expect(find.text('Đang hoạt động'), findsWidgets);
    });

    testWidgets('Thao tác "+ Thêm Chi Nhánh Mới" và bấm Lưu thành công',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final garageProvider = GarageProvider();

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<GarageProvider>.value(
            value: garageProvider,
            child: const BranchManagementScreen(),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));

      // Bấm nút "+ Thêm Chi Nhánh Mới"
      final addBtn = find.text('+ Thêm Chi Nhánh Mới');
      expect(addBtn, findsOneWidget);
      await tester.tap(addBtn);
      await tester.pump(const Duration(milliseconds: 200));

      // Kiểm tra dialog mở ra
      expect(find.text('Thêm Chi Nhánh Mới'), findsOneWidget);

      // Nhập tên chi nhánh mới: Trạm Phản Ứng Nhanh Trần Xuân Soạn
      final nameField = find.widgetWithText(TextFormField, 'Tên chi nhánh *');
      await tester.enterText(nameField, 'Trạm Phản Ứng Nhanh Trần Xuân Soạn');

      // Nhập hotline
      final phoneField = find.widgetWithText(TextFormField, 'Hotline chi nhánh *');
      await tester.enterText(phoneField, '0903.999.888');

      // Nhập địa chỉ
      final addressField = find.widgetWithText(TextFormField, 'Địa chỉ cụ thể *');
      await tester.enterText(addressField, '120 Trần Xuân Soạn, Tân Hưng, Quận 7');

      // Bấm Lưu
      final saveBtn = find.text('Lưu');
      expect(saveBtn, findsOneWidget);
      await tester.tap(saveBtn);

      // Allow async save & dialog pop
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));

      // Chi nhánh mới xuất hiện trong danh sách
      expect(find.text('Trạm Phản Ứng Nhanh Trần Xuân Soạn'), findsOneWidget);
      expect(find.byWidgetPredicate((widget) =>
          widget is Text &&
          widget.data != null &&
          widget.data!.contains('120 Trần Xuân Soạn')), findsOneWidget);
    });
  });
}

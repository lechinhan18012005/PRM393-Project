import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/mechanic_staff_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/providers/mechanic_provider.dart';
import 'package:mobile/screens/mechanic/mechanic_shift_screen.dart';
import 'package:provider/provider.dart';

class _FakeMechanicProvider extends MechanicProvider {
  MechanicStaffModel? _profile;
  bool toggleCalled = false;
  String? lastPauseReason;

  _FakeMechanicProvider() {
    _profile = MechanicStaffModel(
      id: 1,
      userId: 10,
      username: 'tho_test',
      fullName: 'Thợ Test',
      phone: '0901234567',
      garageId: 1,
      garageName: 'Gara Test',
      branchId: 1,
      branchName: 'Chi nhánh 1',
      branchOperatingStatus: 'OPEN',
      shiftName: 'Ca trực ngày',
      workingStatus: 'AVAILABLE',
      ratingAvg: 5.0,
      isManualOverride: false,
    );
  }

  @override
  MechanicStaffModel? get myProfile => _profile;

  @override
  bool get isLoading => false;

  @override
  Future<bool> toggleStatus({
    required String status,
    double? latitude,
    double? longitude,
    String? pauseReason,
  }) async {
    toggleCalled = true;
    lastPauseReason = pauseReason;
    _profile = MechanicStaffModel(
      id: 1,
      userId: 10,
      username: 'tho_test',
      fullName: 'Thợ Test',
      phone: '0901234567',
      garageId: 1,
      garageName: 'Gara Test',
      branchId: 1,
      branchName: 'Chi nhánh 1',
      branchOperatingStatus: 'OPEN',
      shiftName: 'Ca trực ngày',
      workingStatus: status,
      pauseReason: pauseReason,
      ratingAvg: 5.0,
      isManualOverride: status == 'OFFLINE',
    );
    notifyListeners();
    return true;
  }
}

void main() {
  testWidgets('Clicking Tam nghi nhan viec shows dialog and confirms reason', (tester) async {
    final fakeProvider = _FakeMechanicProvider();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<MechanicProvider>.value(value: fakeProvider),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const MechanicShiftScreen(embedded: false),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify button exists and says "Tạm nghỉ nhận việc"
    final buttonFinder = find.widgetWithText(FilledButton, 'Tạm nghỉ nhận việc');
    expect(buttonFinder, findsOneWidget);

    // Tap button
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());
    await tester.pump();
    await tester.tap(buttonFinder);
    await tester.pumpAndSettle();

    // Verify dialog appears
    expect(find.text('Vui lòng chọn lý do tạm nghỉ trong ca trực:'), findsOneWidget);
    expect(find.text('Nghỉ ăn trưa'), findsOneWidget);
    expect(find.text('Đổ xăng / Bảo dưỡng xe máy'), findsOneWidget);
    expect(find.text('Xác nhận nghỉ'), findsOneWidget);

    // Tap "Đổ xăng / Bảo dưỡng xe máy"
    await tester.tap(find.text('Đổ xăng / Bảo dưỡng xe máy'));
    await tester.pumpAndSettle();

    // Tap "Xác nhận nghỉ"
    await tester.tap(find.text('Xác nhận nghỉ'));
    await tester.pumpAndSettle();

    // Verify dialog closed and toggle called
    expect(find.text('Vui lòng chọn lý do tạm nghỉ trong ca trực:'), findsNothing);
    expect(fakeProvider.toggleCalled, isTrue);
    expect(fakeProvider.lastPauseReason, 'Đổ xăng / Bảo dưỡng xe máy');
  });
}

import 'package:flutter/material.dart';

import '../core/models/mechanic_staff_model.dart';
import '../core/services/mechanic_service.dart';

class MechanicProvider with ChangeNotifier {
  final MechanicService _mechanicService = MechanicService();

  List<MechanicStaffModel> _mechanics = [];
  MechanicStaffModel? _myProfile;
  bool _isLoading = false;
  String? _errorMessage;

  List<MechanicStaffModel> get mechanics => _mechanics;
  MechanicStaffModel? get myProfile => _myProfile;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  int get totalCount => _mechanics.length;
  int get onlineCount => _mechanics.where((m) => m.isOnline).length;
  int get busyCount => _mechanics.where((m) => m.isBusy).length;

  Future<void> fetchMechanics() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _mechanics = await _mechanicService.getMyMechanics();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createMechanic({
    required String username,
    required String fullName,
    String? email,
    required String phone,
    required String password,
    int? branchId,
    String? shiftName,
    String? speciality,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final staff = await _mechanicService.createMechanic(
        username: username,
        fullName: fullName,
        email: email,
        phone: phone,
        password: password,
        branchId: branchId,
        shiftName: shiftName,
        speciality: speciality,
      );
      _mechanics.insert(0, staff);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> allocateBranch({
    required int staffId,
    int? branchId,
    String? shiftName,
  }) async {
    try {
      final updated = await _mechanicService.allocateBranch(
        staffId: staffId,
        branchId: branchId,
        shiftName: shiftName,
      );
      final index = _mechanics.indexWhere((m) => m.id == staffId);
      if (index != -1) {
        _mechanics[index] = updated;
        notifyListeners();
      }
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchMyProfile() async {
    try {
      _myProfile = await _mechanicService.getMyProfile();
      _errorMessage = null;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
    }
  }

  Future<bool> toggleStatus({
    required String status, // AVAILABLE, OFFLINE, BUSY
    double? latitude,
    double? longitude,
    String? pauseReason,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _myProfile = await _mechanicService.toggleStatus(
        workingStatus: status,
        latitude: latitude,
        longitude: longitude,
        pauseReason: pauseReason,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/admin_repository.dart';
import '../data/models/admin_dashboard_data.dart';

class AdminDashboardNotifier extends StateNotifier<AdminDashboardData?> {
  final AdminRepository _repository;
  StreamSubscription? _sub;

  AdminDashboardNotifier(this._repository) : super(null) {
    _sub = _repository.dashboardStream().listen(
      (data) => state = data,
      onError: (_) => state = null,
    );
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final adminDashboardProvider =
    StateNotifierProvider<AdminDashboardNotifier, AdminDashboardData?>((ref) {
  final repository = ref.watch(adminRepositoryProvider);
  return AdminDashboardNotifier(repository);
});

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/providers/data_state.dart';
import '../data/admin_repository.dart';
import '../data/models/university_module.dart';

class AdminModulesNotifier extends StateNotifier<AdminDataState<UniversityModule>> {
  final AdminRepository _repository;
  StreamSubscription? _sub;

  AdminModulesNotifier(this._repository) : super(const AdminDataState()) {
    _sub = _repository.modulesStream().listen(
      (data) => state = AdminDataState(data: data, isLoading: false),
      onError: (e) => state = AdminDataState(isLoading: false, error: e.toString()),
    );
  }

  Future<void> create(UniversityModule module) async {
    try {
      await _repository.createModule(module);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> update(UniversityModule module) async {
    try {
      await _repository.updateModule(module);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> delete(String id) async {
    try {
      await _repository.deleteModule(id);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void clearError() => state = state.copyWith(clearError: true);

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final adminModulesProvider =
    StateNotifierProvider<AdminModulesNotifier, AdminDataState<UniversityModule>>((ref) {
  final repository = ref.watch(adminRepositoryProvider);
  return AdminModulesNotifier(repository);
});

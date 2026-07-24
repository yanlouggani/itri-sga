import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/providers/data_state.dart';
import '../../auth/data/models/user.dart';
import '../data/admin_repository.dart';

class AdminUsersNotifier extends StateNotifier<AdminDataState<AppUser>> {
  final AdminRepository _repository;

  AdminUsersNotifier(this._repository) : super(const AdminDataState()) {
    loadUsers();
  }

  Future<void> loadUsers() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final users = await _repository.getAllUsers();
      state = state.copyWith(data: users, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createUser({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
  }) async {
    try {
      await _repository.createUser(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        role: role,
      );
      await loadUsers();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> updateUser(String uid, Map<String, dynamic> data) async {
    try {
      await _repository.updateUser(uid, data);
      await loadUsers();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> deleteUser(String uid) async {
    try {
      await _repository.deleteUser(uid);
      await loadUsers();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> resetPassword(String userId, String newPassword) async {
    try {
      await _repository.resetPassword(userId, newPassword);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final adminUsersProvider =
    StateNotifierProvider<AdminUsersNotifier, AdminDataState<AppUser>>((ref) {
  final repository = ref.watch(adminRepositoryProvider);
  return AdminUsersNotifier(repository);
});

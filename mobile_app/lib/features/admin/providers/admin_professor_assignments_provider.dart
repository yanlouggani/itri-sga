import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/providers/data_state.dart';
import '../data/admin_repository.dart';
import '../data/models/professor_assignment.dart';

final adminProfessorAssignmentsProvider =
    StateNotifierProvider<AdminProfessorAssignmentsNotifier, AdminDataState<ProfessorAssignment>>((ref) {
  final repository = ref.watch(adminRepositoryProvider);
  return AdminProfessorAssignmentsNotifier(repository);
});

class AdminProfessorAssignmentsNotifier extends StateNotifier<AdminDataState<ProfessorAssignment>> {
  final AdminRepository _repository;

  AdminProfessorAssignmentsNotifier(this._repository) : super(const AdminDataState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final data = await _repository.getProfessorAssignments();
      state = AdminDataState(data: data, isLoading: false);
    } catch (e) {
      state = AdminDataState(isLoading: false, error: e.toString());
    }
  }

  Future<void> create(ProfessorAssignment assignment) async {
    try {
      await _repository.createProfessorAssignment(assignment);
      await load();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> delete(String professorId, String moduleId, String sessionType) async {
    try {
      await _repository.deleteProfessorAssignment(professorId, moduleId, sessionType);
      await load();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void clearError() => state = state.copyWith(clearError: true);
}

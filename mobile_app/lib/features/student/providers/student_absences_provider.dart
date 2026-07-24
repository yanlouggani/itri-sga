import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/models/student_absence.dart';
import '../data/student_repository.dart';

class StudentAbsencesState {
  final List<StudentAbsence> absences;
  final bool isLoading;
  final bool isRefreshing;
  final String? error;

  const StudentAbsencesState({
    this.absences = const [],
    this.isLoading = true,
    this.isRefreshing = false,
    this.error,
  });

  StudentAbsencesState copyWith({
    List<StudentAbsence>? absences,
    bool? isLoading,
    bool? isRefreshing,
    String? error,
    bool clearError = false,
  }) {
    return StudentAbsencesState(
      absences: absences ?? this.absences,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class StudentAbsencesNotifier extends StateNotifier<StudentAbsencesState> {
  final StudentRepository _repository;
  final String _studentId;

  StudentAbsencesNotifier(this._repository, this._studentId)
      : super(const StudentAbsencesState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final absences = await _repository.getAbsences(_studentId);
      state = state.copyWith(absences: absences, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load absences',
      );
    }
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final studentAbsencesProvider =
    StateNotifierProvider<StudentAbsencesNotifier, StudentAbsencesState>(
  (ref) {
    final repository = ref.watch(studentRepositoryProvider);
    final user = ref.watch(currentUserProvider);
    final studentId = user?.id ?? '';
    return StudentAbsencesNotifier(repository, studentId);
  },
);

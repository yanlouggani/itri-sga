import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/models/student_dashboard_data.dart';
import '../data/student_repository.dart';

class StudentDashboardState {
  final StudentDashboardData? data;
  final bool isLoading;
  final bool isRefreshing;
  final String? error;

  const StudentDashboardState({
    this.data,
    this.isLoading = true,
    this.isRefreshing = false,
    this.error,
  });

  StudentDashboardState copyWith({
    StudentDashboardData? data,
    bool? isLoading,
    bool? isRefreshing,
    String? error,
    bool clearError = false,
  }) {
    return StudentDashboardState(
      data: data ?? this.data,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class StudentDashboardNotifier extends StateNotifier<StudentDashboardState> {
  final StudentRepository _repository;
  final String _studentId;
  final String _groupId;

  StudentDashboardNotifier(this._repository, this._studentId, this._groupId)
      : super(const StudentDashboardState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: state.data == null, clearError: true);
    try {
      final data = await _repository.getDashboard(_studentId, _groupId);
      state = state.copyWith(data: data, isLoading: false, isRefreshing: false);
    } catch (e) {
      debugPrint('[StudentDashboard] load error: $e');
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to load dashboard',
      );
    }
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final studentDashboardProvider =
    StateNotifierProvider<StudentDashboardNotifier, StudentDashboardState>(
  (ref) {
    final repository = ref.watch(studentRepositoryProvider);
    final user = ref.watch(currentUserProvider);
    final studentId = user?.id ?? '';
    final groupId = '';
    return StudentDashboardNotifier(repository, studentId, groupId);
  },
);

final studentDashboardDataProvider = Provider<StudentDashboardData?>((ref) {
  return ref.watch(studentDashboardProvider.select((s) => s.data));
});

final studentTodaySessionsProvider = Provider<List<StudentSession>>((ref) {
  final data = ref.watch(studentDashboardDataProvider);
  return data?.todaySessions ?? [];
});

final studentAbsenceSummaryProvider = Provider<List<AbsenceSummary>>((ref) {
  final data = ref.watch(studentDashboardDataProvider);
  return data?.absenceSummary ?? [];
});

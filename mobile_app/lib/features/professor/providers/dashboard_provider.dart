import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/models/dashboard_data.dart';
import '../data/models/session_data.dart';
import '../data/professor_repository.dart';

class DashboardState {
  final ProfessorDashboardData? data;
  final bool isLoading;
  final String? error;
  final bool isRefreshing;

  const DashboardState({
    this.data,
    this.isLoading = true,
    this.error,
    this.isRefreshing = false,
  });

  DashboardState copyWith({
    ProfessorDashboardData? data,
    bool? isLoading,
    String? error,
    bool? isRefreshing,
    bool clearError = false,
  }) {
    return DashboardState(
      data: data ?? this.data,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final ProfessorRepository _repository;
  final String _professorId;
  Timer? _pollTimer;

  DashboardNotifier(this._repository, this._professorId)
      : super(const DashboardState()) {
    _listen();
  }

  void _listen() {
    state = state.copyWith(isLoading: true);
    _loadDashboard();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _loadDashboard(isRefresh: true);
    });
  }

  Future<void> _loadDashboard({bool isRefresh = false}) async {
    try {
      if (isRefresh) {
        state = state.copyWith(isRefreshing: true, clearError: true);
      }
      final data = await _repository.getDashboard(_professorId);
      state = state.copyWith(
        data: data,
        isLoading: false,
        isRefreshing: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to load dashboard',
      );
    }
  }

  Future<bool> startSession(String sessionId) async {
    try {
      await _repository.startSession(sessionId);
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Failed to start session');
      return false;
    }
  }

  Future<bool> postponeSession(String sessionId) async {
    try {
      await _repository.postponeSession(sessionId);
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Failed to postpone session');
      return false;
    }
  }

  Future<bool> cancelSession(String sessionId) async {
    try {
      await _repository.cancelSession(sessionId);
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Failed to cancel session');
      return false;
    }
  }

  Future<void> load() async {
    await _loadDashboard(isRefresh: true);
  }

  void clearError() => state = state.copyWith(clearError: true);

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}

final dashboardProvider =
    StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  final repository = ref.watch(professorRepositoryProvider);
  final user = ref.watch(currentUserProvider);
  final professorId = user?.id ?? '';
  return DashboardNotifier(repository, professorId);
});

final dashboardDataProvider = Provider<ProfessorDashboardData?>((ref) {
  return ref.watch(dashboardProvider.select((s) => s.data));
});

final dashboardActiveSessionsProvider = Provider<List<SessionData>>((ref) {
  final data = ref.watch(dashboardDataProvider);
  return data?.activeSessions ?? [];
});

final dashboardUpcomingSessionsProvider = Provider<List<SessionData>>((ref) {
  final data = ref.watch(dashboardDataProvider);
  return data?.upcomingSessions ?? [];
});

final dashboardCompletedSessionsProvider = Provider<List<SessionData>>((ref) {
  final data = ref.watch(dashboardDataProvider);
  return data?.completedSessions ?? [];
});

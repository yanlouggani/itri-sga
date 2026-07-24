import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/providers/data_state.dart';
import '../data/admin_repository.dart';
import '../data/models/weekly_schedule_entry.dart';

final adminWeeklyScheduleProvider =
    StateNotifierProvider<AdminWeeklyScheduleNotifier, AdminDataState<WeeklyScheduleEntry>>((ref) {
  final repository = ref.watch(adminRepositoryProvider);
  return AdminWeeklyScheduleNotifier(repository);
});

class AdminWeeklyScheduleNotifier extends StateNotifier<AdminDataState<WeeklyScheduleEntry>> {
  final AdminRepository _repository;
  StreamSubscription? _sub;

  AdminWeeklyScheduleNotifier(this._repository) : super(const AdminDataState()) {
    _sub = _repository.weeklyScheduleStream().listen(
      (data) => state = AdminDataState(data: data, isLoading: false),
      onError: (e) => state = AdminDataState(isLoading: false, error: e.toString()),
    );
  }

  Future<void> create(WeeklyScheduleEntry entry) async {
    try {
      await _repository.createWeeklyScheduleEntry(entry);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> update(String oldId, WeeklyScheduleEntry newEntry, {DateTime? validFrom}) async {
    try {
      await _repository.updateWeeklyScheduleEntry(oldId: oldId, newEntry: newEntry, validFrom: validFrom);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> delete(String id) async {
    try {
      await _repository.deleteWeeklyScheduleEntry(id);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<int> generateSessions(DateTime start, DateTime end) async {
    try {
      final count = await _repository.generateSessionsFromSchedule(startDate: start, endDate: end);
      return count;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return 0;
    }
  }

  void clearError() => state = state.copyWith(clearError: true);

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

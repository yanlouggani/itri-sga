import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/providers/data_state.dart';
import '../data/admin_repository.dart';
import '../data/models/university_group.dart';

class AdminGroupsNotifier extends StateNotifier<AdminDataState<UniversityGroup>> {
  final AdminRepository _repository;
  StreamSubscription? _sub;

  AdminGroupsNotifier(this._repository) : super(const AdminDataState()) {
    debugPrint('[AdminGroupsNotifier] Constructor: subscribing to groupsStream');
    _sub = _repository.groupsStream().listen(
      (data) {
        debugPrint('[AdminGroupsNotifier] Stream data received: ${data.length} groups');
        state = AdminDataState(data: data, isLoading: false);
      },
      onError: (e) {
        debugPrint('[AdminGroupsNotifier] Stream error: $e');
        state = AdminDataState(isLoading: false, error: e.toString());
      },
      onDone: () {
        debugPrint('[AdminGroupsNotifier] Stream closed');
      },
    );
  }

  Future<void> create(UniversityGroup group) async {
    try {
      await _repository.createGroup(group);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> update(UniversityGroup group) async {
    try {
      await _repository.updateGroup(group);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> delete(String id) async {
    try {
      await _repository.deleteGroup(id);
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

final adminGroupsProvider =
    StateNotifierProvider<AdminGroupsNotifier, AdminDataState<UniversityGroup>>((ref) {
  final repository = ref.watch(adminRepositoryProvider);
  return AdminGroupsNotifier(repository);
});

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/providers/data_state.dart';
import '../data/admin_repository.dart';
import '../data/models/university_room.dart';

class AdminRoomsNotifier extends StateNotifier<AdminDataState<UniversityRoom>> {
  final AdminRepository _repository;
  StreamSubscription? _sub;

  AdminRoomsNotifier(this._repository) : super(const AdminDataState()) {
    _sub = _repository.roomsStream().listen(
      (data) => state = AdminDataState(data: data, isLoading: false),
      onError: (e) => state = AdminDataState(isLoading: false, error: e.toString()),
    );
  }

  Future<void> create(UniversityRoom room) async {
    try {
      await _repository.createRoom(room);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> update(UniversityRoom room) async {
    try {
      await _repository.updateRoom(room);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> delete(String id) async {
    try {
      await _repository.deleteRoom(id);
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

final adminRoomsProvider =
    StateNotifierProvider<AdminRoomsNotifier, AdminDataState<UniversityRoom>>((ref) {
  final repository = ref.watch(adminRepositoryProvider);
  return AdminRoomsNotifier(repository);
});

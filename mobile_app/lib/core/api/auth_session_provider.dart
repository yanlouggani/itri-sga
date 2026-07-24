import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/data/models/user.dart';
import '../../features/auth/data/auth_repository.dart';

final storedUserProvider = FutureProvider<AppUser?>((ref) async {
  final storage = ref.watch(authStorageProvider);
  return storage.restoreUser();
});

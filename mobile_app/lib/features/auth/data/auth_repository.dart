import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/supabase/supabase_client_provider.dart';
import 'models/user.dart';

class AuthRepository {
  final SupabaseClient _supabase;
  final AuthStorage _storage;

  AuthRepository(this._supabase, this._storage);

  Future<AppUser> login(String email, String password) async {
    debugPrint('[AuthRepo] login() — email: $email');
    final response = await _supabase.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
    final supabaseUser = response.user;
    if (supabaseUser == null) {
      throw Exception('Erreur de connexion');
    }

    final user = await _fetchUser(supabaseUser.id, supabaseUser.email);
    await _storage.saveUser(user);
    return user;
  }

  Future<void> logout() async {
    debugPrint('[AuthRepo] logout()');
    await _storage.clear();
    await _supabase.auth.signOut();
  }

  Future<AppUser?> currentUser() async {
    final session = _supabase.auth.currentSession;
    if (session == null) {
      final cached = await _storage.restoreUser();
      return cached;
    }

    try {
      return await _fetchUser(session.user.id, session.user.email);
    } catch (e) {
      debugPrint('[AuthRepo] currentUser() fallback: $e');
      return _storage.restoreUser();
    }
  }

  Future<AppUser> _fetchUser(String uid, String? email) async {
    final response = await _supabase
        .from('users')
        .select('*, groups(name)')
        .eq('id', uid)
        .maybeSingle();

    if (response == null) {
      return AppUser(
        id: uid,
        email: email ?? '',
        firstName: '',
        lastName: '',
        role: 'student',
      );
    }

    return AppUser(
      id: response['id'] as String,
      firstName: response['firstName'] as String? ?? '',
      lastName: response['lastName'] as String? ?? '',
      email: response['email'] as String? ?? email ?? '',
      role: response['role'] as String? ?? 'student',
      identifier: response['identifier'] as String?,
      isActive: response['isActive'] as bool? ?? true,
    );
  }
}

class AuthStorage {
  AppUser? _cached;

  Future<void> saveUser(AppUser user) async {
    _cached = user;
  }

  Future<AppUser?> restoreUser() async {
    return _cached;
  }

  Future<void> clear() async {
    _cached = null;
  }
}

final authStorageProvider = Provider<AuthStorage>((ref) {
  return AuthStorage();
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final storage = ref.watch(authStorageProvider);
  return AuthRepository(supabase, storage);
});

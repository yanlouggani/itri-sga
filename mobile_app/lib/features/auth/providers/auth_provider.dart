import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/auth_repository.dart';
import '../data/models/user.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final AppUser? user;
  final String? errorMessage;
  final bool isInitializing;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
    this.isInitializing = true,
  });

  AuthState copyWith({
    AuthStatus? status,
    AppUser? user,
    String? errorMessage,
    bool? isInitializing,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isInitializing: isInitializing ?? this.isInitializing,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get hasError => errorMessage != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _authRepository;
  bool _ready = false;

  AuthNotifier(this._authRepository) : super(const AuthState()) {
    _initialize();
  }

  Future<void> _initialize() async {
    debugPrint('[AuthNotifier] _initialize() start');
    try {
      debugPrint('[AuthNotifier] _initialize() — checking cached current user...');
      final user = await _authRepository.currentUser().timeout(
        const Duration(seconds: 5),
        onTimeout: () {
          debugPrint('[AuthNotifier] _initialize() — currentUser() fetch TIMED OUT after 5s');
          throw TimeoutException('La récupération de l\'utilisateur a expiré.');
        },
      );
      if (_ready) {
        debugPrint('[AuthNotifier] _initialize() — skipping, already ready');
        return;
      }
      if (user != null) {
        debugPrint('[AuthNotifier] _initialize() — found cached user: ${user.role}');
        state = AuthState(
          status: AuthStatus.authenticated,
          user: user,
          isInitializing: false,
        );
      } else {
        debugPrint('[AuthNotifier] _initialize() — no cached user found');
        state = const AuthState(
          status: AuthStatus.unauthenticated,
          isInitializing: false,
        );
      }
    } catch (e) {
      debugPrint('[AuthNotifier] _initialize() error/timeout caught: $e');
      state = const AuthState(
        status: AuthStatus.unauthenticated,
        isInitializing: false,
      );
    }
    _ready = true;
    debugPrint('[AuthNotifier] _initialize() done — isInitializing set to false');
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    debugPrint('[AuthNotifier] login() start — email: $email');
    _ready = true;
    state = state.copyWith(status: AuthStatus.loading, clearError: true);

    try {
      final user = await _authRepository.login(email, password);
      debugPrint('[AuthNotifier] login() success — role: ${user.role}');
      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
        isInitializing: false,
      );
      debugPrint('[AuthNotifier] authenticated state emission: status=${state.status}, uid=${state.user?.id}, role=${state.user?.role}');
    } on TimeoutException catch (e) {
      debugPrint('[AuthNotifier] login() TimeoutException: $e');
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'La connexion a expiré. Vérifiez votre réseau.',
      );
    } catch (e) {
      debugPrint('[AuthNotifier] login() unexpected error: $e');
      final rawMessage = e.toString();
      final cleanMessage = rawMessage.startsWith('Exception: ')
          ? rawMessage.replaceFirst('Exception: ', '')
          : rawMessage;
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: cleanMessage,
      );
    }
    debugPrint('[AuthNotifier] login() end — status: ${state.status}');
  }

  Future<void> logout() async {
    debugPrint('[AuthNotifier] logout()');
    await _authRepository.logout();
    state = const AuthState(
      status: AuthStatus.unauthenticated,
      isInitializing: false,
    );
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  debugPrint('[authProvider] creating AuthNotifier');
  final authRepository = ref.watch(authRepositoryProvider);
  return AuthNotifier(authRepository);
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider.select((s) => s.isAuthenticated));
});

final currentUserProvider = Provider<AppUser?>((ref) {
  return ref.watch(authProvider.select((s) => s.user));
});

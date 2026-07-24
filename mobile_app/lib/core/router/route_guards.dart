import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';

enum AppRole {
  admin,
  professor,
  student;

  static AppRole fromString(String role) {
    switch (role) {
      case 'admin':
        return AppRole.admin;
      case 'professor':
        return AppRole.professor;
      case 'student':
        return AppRole.student;
      default:
        throw ArgumentError('Unknown role: $role');
    }
  }
}

class AuthRedirect extends ChangeNotifier {
  final Ref _ref;
  ProviderSubscription? _subscription;

  AuthRedirect(this._ref) {
    _subscription = _ref.listen<AuthState>(authProvider, (previous, next) {
      debugPrint('[AuthRedirect] auth state changed — '
          '${previous?.status} -> ${next.status}, '
          'user: ${next.user?.role ?? 'null'}');
      if (previous?.status != next.status || previous?.user != next.user) {
        notifyListeners();
      }
    });
  }

  @override
  void dispose() {
    _subscription?.close();
    super.dispose();
  }

  String? call(BuildContext context, GoRouterState state) {
    final authState = _ref.read(authProvider);
    final isLoggedIn = authState.isAuthenticated;
    final isLoginRoute = state.matchedLocation == '/login';
    final isSplashRoute = state.matchedLocation == '/splash';
    final currentLocation = state.matchedLocation;

    debugPrint('[AuthRedirect] redirect check — '
        'location: $currentLocation, '
        'status: ${authState.status}, '
        'isLoggedIn: $isLoggedIn, '
        'isInitializing: ${authState.isInitializing}');

    // If on splash route, do not override navigation: the SplashPage handles its own timing and routing.
    if (isSplashRoute) {
      return null;
    }

    // Still initializing — no redirect yet
    if (authState.isInitializing) {
      debugPrint('[AuthRedirect] still initializing, defer redirect');
      return null;
    }

    // Not logged in → redirect to login
    if (!isLoggedIn && !isLoginRoute) {
      debugPrint('[AuthRedirect] not logged in, redirect to /login');
      debugPrint('[AuthRedirect] router redirect: /login');
      return '/login';
    }

    // Logged in and on login route → redirect to dashboard
    if (isLoggedIn && isLoginRoute) {
      final role = authState.user?.role ?? '';
      final route = _getDashboardRoute(role);
      if (route == '/login') {
        debugPrint('[AuthRedirect] logged in on login page, but resolved dashboard route is /login. Stay on page to prevent infinite redirect loop.');
        return null;
      }
      debugPrint('[AuthRedirect] logged in on login page, redirect to dashboard: $route');
      debugPrint('[AuthRedirect] router redirect: $route');
      return route;
    }

    // Check role-based access for protected routes
    if (isLoggedIn) {
      final path = state.matchedLocation;
      final role = authState.user!.role;

      if (path.startsWith('/admin') && role != 'admin') {
        final route = _getDashboardRoute(role);
        debugPrint('[AuthRedirect] wrong role for admin, redirect to $route');
        debugPrint('[AuthRedirect] router redirect: $route');
        return route;
      }
      if (path.startsWith('/professor') && role != 'professor') {
        final route = _getDashboardRoute(role);
        debugPrint('[AuthRedirect] wrong role for professor, redirect to $route');
        debugPrint('[AuthRedirect] router redirect: $route');
        return route;
      }
      if (path.startsWith('/student') && role != 'student') {
        final route = _getDashboardRoute(role);
        debugPrint('[AuthRedirect] wrong role for student, redirect to $route');
        debugPrint('[AuthRedirect] router redirect: $route');
        return route;
      }
    }

    return null;
  }

  String _getDashboardRoute(String role) {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'professor':
        return '/professor/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/login';
    }
  }
}

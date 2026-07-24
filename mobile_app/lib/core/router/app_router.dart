import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/settings_page.dart';
import '../../features/professor/presentation/pages/active_session_page.dart';
import '../../features/professor/presentation/pages/professor_analytics_page.dart';
import '../../features/professor/presentation/pages/professor_dashboard_page.dart';
import '../../features/professor/presentation/pages/professor_history_page.dart';
import '../../features/professor/presentation/pages/professor_timetable_page.dart';
import '../../features/student/presentation/pages/student_absences_page.dart';
import '../../features/student/presentation/pages/student_dashboard_page.dart';
import '../../features/student/presentation/pages/student_qr_page.dart';
import '../../features/student/presentation/pages/student_scanner_page.dart';
import '../../features/student/presentation/pages/student_timetable_page.dart';
import '../../features/admin/presentation/pages/admin_dashboard_page.dart';
import '../../features/admin/presentation/pages/admin_users_page.dart';
import '../../features/admin/presentation/pages/admin_modules_page.dart';
import '../../features/admin/presentation/pages/admin_rooms_page.dart';
import '../../features/admin/presentation/pages/admin_groups_page.dart';
import '../../features/admin/presentation/pages/admin_reports_page.dart';
import '../../features/admin/presentation/pages/admin_weekly_schedule_page.dart';
import '../../features/admin/presentation/pages/admin_professors_page.dart';
import '../../shared/widgets/app_scaffold.dart';
import 'route_guards.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  debugPrint('[Startup] Creating GoRouter configuration');
  final authRedirect = AuthRedirect(ref);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    redirect: authRedirect.call,
    refreshListenable: authRedirect,
    errorBuilder: (context, state) => const _NotFoundPage(),
    routes: [
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),

      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => AppScaffold(child: child),
        routes: [
          // Admin routes
          GoRoute(path: '/admin', redirect: (_, __) => '/admin/dashboard'),
          GoRoute(
            path: '/admin/dashboard',
            name: 'adminDashboard',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const AdminDashboardPage(),
            ),
          ),
          GoRoute(
            path: '/admin/users',
            name: 'adminUsers',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const AdminUsersPage(),
            ),
          ),
          GoRoute(
            path: '/admin/modules',
            name: 'adminModules',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const AdminModulesPage(),
            ),
          ),
          GoRoute(
            path: '/admin/rooms',
            name: 'adminRooms',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const AdminRoomsPage(),
            ),
          ),
          GoRoute(
            path: '/admin/groups',
            name: 'adminGroups',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const AdminGroupsPage(),
            ),
          ),
          GoRoute(
            path: '/admin/timetable',
            name: 'adminTimetable',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const AdminWeeklySchedulePage(),
            ),
          ),
          GoRoute(
            path: '/admin/professors',
            name: 'adminProfessors',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const AdminProfessorsPage(),
            ),
          ),
          GoRoute(
            path: '/admin/reports',
            name: 'adminReports',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const AdminReportsPage(),
            ),
          ),
          GoRoute(
            path: '/admin/settings',
            name: 'adminSettings',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const SettingsPage(),
            ),
          ),

          // Professor routes
          GoRoute(path: '/professor', redirect: (_, __) => '/professor/dashboard'),
          GoRoute(
            path: '/professor/dashboard',
            name: 'professorDashboard',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const ProfessorDashboardPage(),
            ),
          ),
          GoRoute(
            path: '/professor/timetable',
            name: 'professorTimetable',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const ProfessorTimetablePage(),
            ),
          ),
          GoRoute(
            path: '/professor/modules',
            name: 'professorModules',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const _PlaceholderPage(title: 'My Modules'),
            ),
          ),
          GoRoute(
            path: '/professor/history',
            name: 'professorHistory',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const ProfessorHistoryPage(),
            ),
          ),
          GoRoute(
            path: '/professor/analytics',
            name: 'professorAnalytics',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const ProfessorAnalyticsPage(),
            ),
          ),
          GoRoute(
            path: '/professor/session/:id',
            name: 'professorSession',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: ActiveSessionPage(
                sessionId: state.pathParameters['id']!,
              ),
            ),
          ),
          GoRoute(
            path: '/professor/settings',
            name: 'professorSettings',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const SettingsPage(),
            ),
          ),

          // Student routes
          GoRoute(path: '/student', redirect: (_, __) => '/student/dashboard'),
          GoRoute(
            path: '/student/dashboard',
            name: 'studentDashboard',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const StudentDashboardPage(),
            ),
          ),
          GoRoute(
            path: '/student/timetable',
            name: 'studentTimetable',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const StudentTimetablePage(),
            ),
          ),
          GoRoute(
            path: '/student/absences',
            name: 'studentAbsences',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const StudentAbsencesPage(),
            ),
          ),
          GoRoute(
            path: '/student/qrcode',
            name: 'studentQRCode',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const StudentQRPage(),
            ),
          ),
          GoRoute(
            path: '/student/scan',
            name: 'studentScan',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const StudentScannerPage(),
            ),
          ),
          GoRoute(
            path: '/student/settings',
            name: 'studentSettings',
            pageBuilder: (context, state) => _buildPage(
              key: state.pageKey,
              child: const SettingsPage(),
            ),
          ),
        ],
      ),
    ],
  );
});

Page<dynamic> _buildPage({
  required LocalKey key,
  required Widget child,
}) {
  return CustomTransitionPage(
    key: key,
    child: child,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(opacity: animation, child: child);
    },
    transitionDuration: const Duration(milliseconds: 200),
  );
}

class _PlaceholderPage extends StatelessWidget {
  final String title;
  const _PlaceholderPage({required this.title});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.construction_rounded, size: 64,
              color: Theme.of(context).colorScheme.primary.withAlpha(100)),
          const SizedBox(height: 16),
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text('Feature coming soon',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context)
                      .colorScheme.onSurface
                      .withAlpha(128))),
        ],
      ),
    );
  }
}

class _NotFoundPage extends StatelessWidget {
  const _NotFoundPage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline_rounded, size: 80,
                color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 16),
            Text('404', style: Theme.of(context).textTheme.displayLarge),
            const SizedBox(height: 8),
            Text('Page not found',
                style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/login'),
              child: const Text('Back to Home'),
            ),
          ],
        ),
      ),
    );
  }
}

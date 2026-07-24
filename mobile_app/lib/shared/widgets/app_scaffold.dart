import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/colors.dart';
import '../../core/theme/text_styles.dart';
import '../../core/utils/extensions.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../providers/theme_provider.dart';

class AppScaffold extends ConsumerWidget {
  final Widget child;
  const AppScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Row(
        children: [
          if (!context.isMobile) _Sidebar(),
          _MainArea(child: child),
        ],
      ),
    );
  }
}

class _MainArea extends StatelessWidget {
  final Widget child;
  const _MainArea({required this.child});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Scaffold(
        appBar: _AppHeader(),
        drawer: context.isMobile ? _MobileDrawer() : null,
        body: child,
      ),
    );
  }
}

class _AppHeader extends ConsumerWidget implements PreferredSizeWidget {
  _AppHeader();

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return AppBar(
      leading: context.isMobile
          ? Builder(
              builder: (ctx) => IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => Scaffold.of(ctx).openDrawer(),
              ),
            )
          : null,
      title: context.isMobile
          ? Text(
              AppConstants.appName,
              style: AppTextStyles.headingSmall.copyWith(
                color: context.colorScheme.onSurface,
              ),
            )
          : null,
      actions: [
        IconButton(
          icon: Icon(
            Icons.notifications_outlined,
            color: context.colorScheme.onSurface,
          ),
          onPressed: () {},
        ),
        const SizedBox(width: 4),
        IconButton(
          icon: Icon(
            context.theme.brightness == Brightness.dark
                ? Icons.light_mode_outlined
                : Icons.dark_mode_outlined,
            color: context.colorScheme.onSurface,
          ),
          onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(),
        ),
        const SizedBox(width: 4),
        if (user != null)
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!context.isMobile) ...[
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(user.fullName,
                          style: AppTextStyles.labelLarge.copyWith(
                              color: context.colorScheme.onSurface)),
                      Text(_getRoleLabel(user.role),
                          style: AppTextStyles.caption.copyWith(
                              color: context.colorScheme.onSurface
                                  .withAlpha(153))),
                    ],
                  ),
                  const SizedBox(width: 10),
                ],
                CircleAvatar(
                  radius: 18,
                  backgroundColor: _getRoleColor(user.role),
                  child: Text(user.initials,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
        IconButton(
          icon: Icon(Icons.logout_rounded,
              color: context.colorScheme.onSurface),
          onPressed: () {
            ref.read(authProvider.notifier).logout();
            context.go('/login');
          },
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  String _getRoleLabel(String role) {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'professor':
        return 'Professeur';
      case 'student':
        return 'Étudiant';
      default:
        return role;
    }
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'admin':
        return AppColors.roleAdmin;
      case 'professor':
        return AppColors.roleProfessor;
      case 'student':
        return AppColors.roleStudent;
      default:
        return AppColors.primary;
    }
  }
}

class _MobileDrawer extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final location = GoRouterState.of(context).matchedLocation;

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            DrawerHeader(
              decoration: BoxDecoration(color: AppColors.primary),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.white.withAlpha(50),
                    child: Text(
                      user?.initials ?? '',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(user?.fullName ?? '',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600)),
                  Text(_getRoleLabel(user?.role ?? ''),
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 13)),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: _getNavItems(user?.role ?? '')
                    .map((item) => _DrawerItem(
                          icon: item.icon,
                          label: item.label,
                          isActive: location == item.path ||
                              location.startsWith('${item.path}/'),
                          onTap: () {
                            Navigator.pop(context);
                            context.go(item.path);
                          },
                        ))
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getRoleLabel(String role) {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'professor':
        return 'Professeur';
      case 'student':
        return 'Étudiant';
      default:
        return role;
    }
  }

  List<_NavItem> _getNavItems(String role) {
    switch (role) {
      case 'admin':
        return _adminNavItems;
      case 'professor':
        return _professorNavItems;
      case 'student':
        return _studentNavItems;
      default:
        return [];
    }
  }
}

class _Sidebar extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final location = GoRouterState.of(context).matchedLocation;

    return Container(
      width: AppConstants.sidebarWidth,
      decoration: BoxDecoration(
        color: context.colorScheme.surface,
        border: Border(
          right: BorderSide(
              color: context.colorScheme.outlineVariant.withAlpha(50)),
        ),
      ),
      child: Column(
        children: [
          Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                    color: context.colorScheme.outlineVariant.withAlpha(50)),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.school_rounded,
                      color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  AppConstants.appName,
                  style: AppTextStyles.headingSmall.copyWith(
                      color: context.colorScheme.onSurface),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: _getNavItems(user?.role ?? '')
                  .map((item) => _SidebarItem(
                        icon: item.icon,
                        label: item.label,
                        isActive: location == item.path ||
                            location.startsWith('${item.path}/'),
                        onTap: () => context.go(item.path),
                      ))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }

  List<_NavItem> _getNavItems(String role) {
    switch (role) {
      case 'admin':
        return _adminNavItems;
      case 'professor':
        return _professorNavItems;
      case 'student':
        return _studentNavItems;
      default:
        return [];
    }
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  final String path;
  const _NavItem({
    required this.icon,
    required this.label,
    required this.path,
  });
}

const _adminNavItems = [
  _NavItem(
      icon: Icons.dashboard_rounded,
      label: 'Dashboard',
      path: '/admin/dashboard'),
  _NavItem(
      icon: Icons.people_rounded,
      label: 'Utilisateurs',
      path: '/admin/users'),
  _NavItem(
      icon: Icons.group_work_rounded,
      label: 'Groupes',
      path: '/admin/groups'),
  _NavItem(
      icon: Icons.meeting_room_rounded,
      label: 'Salles',
      path: '/admin/rooms'),
  _NavItem(
      icon: Icons.calendar_month_rounded,
      label: 'Emploi du temps',
      path: '/admin/timetable'),
  _NavItem(
      icon: Icons.person_search_rounded,
      label: 'Professeurs',
      path: '/admin/professors'),
  _NavItem(
      icon: Icons.assignment_rounded,
      label: 'Rapports',
      path: '/admin/reports'),
  _NavItem(
      icon: Icons.menu_book_rounded,
      label: 'Modules',
      path: '/admin/modules'),
  _NavItem(
      icon: Icons.settings_rounded,
      label: 'Paramètres',
      path: '/admin/settings'),
];

const _professorNavItems = [
  _NavItem(
      icon: Icons.today_rounded,
      label: "Aujourd'hui",
      path: '/professor/dashboard'),
  _NavItem(
      icon: Icons.calendar_month_rounded,
      label: 'Emploi du temps',
      path: '/professor/timetable'),
  _NavItem(
      icon: Icons.menu_book_rounded,
      label: 'Mes Modules',
      path: '/professor/modules'),
  _NavItem(
      icon: Icons.history_rounded,
      label: 'Historique',
      path: '/professor/history'),
  _NavItem(
      icon: Icons.analytics_rounded,
      label: 'Analytiques',
      path: '/professor/analytics'),
  _NavItem(
      icon: Icons.settings_rounded,
      label: 'Paramètres',
      path: '/professor/settings'),
];

const _studentNavItems = [
  _NavItem(
      icon: Icons.dashboard_rounded,
      label: "Vue d'ensemble",
      path: '/student/dashboard'),
  _NavItem(
      icon: Icons.calendar_month_rounded,
      label: 'Emploi du temps',
      path: '/student/timetable'),
  _NavItem(
      icon: Icons.event_busy_rounded,
      label: 'Mes Absences',
      path: '/student/absences'),
  _NavItem(
      icon: Icons.settings_rounded,
      label: 'Paramètres',
      path: '/student/settings'),
];

class _SidebarItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _SidebarItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Material(
        color: isActive
            ? context.colorScheme.primary.withAlpha(15)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 22,
                  color: isActive
                      ? context.colorScheme.primary
                      : context.colorScheme.onSurface.withAlpha(153),
                ),
                const SizedBox(width: 14),
                Text(
                  label,
                  style: AppTextStyles.labelLarge.copyWith(
                    color: isActive
                        ? context.colorScheme.primary
                        : context.colorScheme.onSurface.withAlpha(179),
                    fontWeight:
                        isActive ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(
        icon,
        color: isActive
            ? context.colorScheme.primary
            : context.colorScheme.onSurface.withAlpha(153),
      ),
      title: Text(
        label,
        style: AppTextStyles.labelLarge.copyWith(
          color: isActive
              ? context.colorScheme.primary
              : context.colorScheme.onSurface.withAlpha(179),
          fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
      selected: isActive,
      selectedTileColor: context.colorScheme.primary.withAlpha(10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      onTap: onTap,
    );
  }
}

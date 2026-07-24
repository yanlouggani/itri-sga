import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../data/models/admin_dashboard_data.dart';
import '../../../professor/data/models/session_data.dart';
import '../../providers/admin_dashboard_provider.dart';

class AdminDashboardPage extends ConsumerWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardData = ref.watch(adminDashboardProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(adminDashboardProvider),
      child: ListView(
        padding: EdgeInsets.symmetric(
          horizontal: context.isMobile ? 12 : 32,
          vertical: context.isMobile ? 12 : 24,
        ),
        children: [
          Text('Tableau de bord', style: AppTextStyles.headingMedium),
          const SizedBox(height: 4),
          Text(
            _getDateLabel(),
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 20),
          if (dashboardData == null)
            const Center(child: CircularProgressIndicator())
          else ...[
            _KpiSection(data: dashboardData),
            const SizedBox(height: 24),
            _TodayStats(data: dashboardData),
            const SizedBox(height: 24),
            if (dashboardData.recentSessions.isNotEmpty)
              _RecentSessionsSection(sessions: dashboardData.recentSessions),
          ],
        ],
      ),
    );
  }

  String _getDateLabel() {
    final now = DateTime.now();
    const days = [
      'Dimanche', 'Lundi', 'Mardi', 'Mercredi',
      'Jeudi', 'Vendredi', 'Samedi',
    ];
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];
    return '${days[now.weekday % 7]} ${now.day} ${months[now.month - 1]} ${now.year}';
  }
}

class _KpiSection extends StatelessWidget {
  final AdminDashboardData data;
  const _KpiSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final kpis = [
      _KpiItem(
        icon: Icons.people_rounded,
        label: 'Utilisateurs',
        value: data.totalUsers.toString(),
        color: AppColors.primary,
      ),
      _KpiItem(
        icon: Icons.school_rounded,
        label: 'Étudiants',
        value: data.totalStudents.toString(),
        color: AppColors.roleStudent,
      ),
      _KpiItem(
        icon: Icons.person_rounded,
        label: 'Professeurs',
        value: data.totalProfessors.toString(),
        color: AppColors.roleProfessor,
      ),
      _KpiItem(
        icon: Icons.menu_book_rounded,
        label: 'Modules',
        value: data.totalModules.toString(),
        color: AppColors.info,
      ),
      _KpiItem(
        icon: Icons.meeting_room_rounded,
        label: 'Salles',
        value: data.totalRooms.toString(),
        color: AppColors.warning,
      ),
      _KpiItem(
        icon: Icons.group_rounded,
        label: 'Groupes',
        value: data.totalGroups.toString(),
        color: AppColors.accent,
      ),
    ];

    if (context.isMobile) {
      return Column(
        children: kpis.map((kpi) => _KpiCard(item: kpi)).toList(),
      );
    }

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: kpis.map((kpi) {
        final cardWidth = (context.screenWidth - (context.isDesktop ? 64 : 64) - 12 * 2) / 3;
        return SizedBox(
          width: cardWidth.clamp(180, 300),
          child: _KpiCard(item: kpi),
        );
      }).toList(),
    );
  }
}

class _KpiItem {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _KpiItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });
}

class _KpiCard extends StatelessWidget {
  final _KpiItem item;
  const _KpiCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.only(bottom: context.isMobile ? 8 : 0),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: item.color.withAlpha(25),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(item.icon, color: item.color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.value,
                    style: AppTextStyles.kpiValue.copyWith(
                      color: item.color,
                      fontSize: 28,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.label,
                    style: AppTextStyles.kpiLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TodayStats extends StatelessWidget {
  final AdminDashboardData data;
  const _TodayStats({required this.data});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 4,
              height: 18,
              decoration: BoxDecoration(
                color: AppColors.sessionActive,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 10),
            Text("Aujourd'hui", style: AppTextStyles.labelLarge),
          ],
        ),
        const SizedBox(height: 12),
        if (context.isMobile)
          Column(
            children: [
              _StatCard(
                icon: Icons.event_rounded,
                label: 'Séances aujourd\'hui',
                value: '${data.totalSessionsToday}',
                color: AppColors.primary,
              ),
              const SizedBox(height: 8),
              _StatCard(
                icon: Icons.play_circle_rounded,
                label: 'En cours',
                value: '${data.activeSessionsToday}',
                color: AppColors.sessionActive,
              ),
              const SizedBox(height: 8),
              _StatCard(
                icon: Icons.trending_up_rounded,
                label: 'Taux de présence',
                value: '${data.averageAttendanceRate.toStringAsFixed(1)}%',
                color: AppColors.warning,
              ),
            ],
          )
        else
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.event_rounded,
                  label: 'Séances aujourd\'hui',
                  value: '${data.totalSessionsToday}',
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.play_circle_rounded,
                  label: 'En cours',
                  value: '${data.activeSessionsToday}',
                  color: AppColors.sessionActive,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.trending_up_rounded,
                  label: 'Taux de présence',
                  value: '${data.averageAttendanceRate.toStringAsFixed(1)}%',
                  color: AppColors.warning,
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withAlpha(25),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: AppTextStyles.headingSmall.copyWith(
                      color: color,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    style: AppTextStyles.caption,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentSessionsSection extends StatelessWidget {
  final List<SessionData> sessions;
  const _RecentSessionsSection({required this.sessions});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 4,
              height: 18,
              decoration: BoxDecoration(
                color: AppColors.info,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 10),
            Text('Séances récentes', style: AppTextStyles.labelLarge),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.info.withAlpha(20),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '${sessions.length}',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.info,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (sessions.isEmpty)
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.event_busy_rounded,
                      size: 48,
                      color: AppColors.textSecondary.withAlpha(80),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Aucune séance récente',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          ...sessions.map((s) => _SessionCard(session: s)),
      ],
    );
  }
}

class _SessionCard extends StatelessWidget {
  final SessionData session;
  const _SessionCard({required this.session});

  Color _statusColor() {
    if (session.isActive) return AppColors.sessionActive;
    if (session.isCompleted) return AppColors.sessionCompleted;
    return AppColors.sessionScheduled;
  }

  String _statusLabel() {
    if (session.isActive) return 'En cours';
    if (session.isCompleted) return 'Terminée';
    return 'Planifiée';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _statusColor().withAlpha(20),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                session.isActive
                    ? Icons.play_circle_rounded
                    : session.isCompleted
                        ? Icons.check_circle_rounded
                        : Icons.schedule_rounded,
                color: _statusColor(),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.moduleName,
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${session.groupName} · ${session.roomName}',
                    style: AppTextStyles.caption,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 1),
                  Text(
                    '${session.formattedDate} · ${session.formattedTime}',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary.withAlpha(180),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _statusColor().withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _statusLabel(),
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: _statusColor(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

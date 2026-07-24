import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/widgets/app_error_widget.dart';
import '../../providers/dashboard_provider.dart';
import '../widgets/session_card.dart';

class ProfessorDashboardPage extends ConsumerWidget {
  const ProfessorDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(dashboardProvider.notifier).load(),
      child: dashboard.isLoading
          ? const Center(child: CircularProgressIndicator())
          : dashboard.error != null && dashboard.data == null
              ? AppErrorWidget(
                  message: dashboard.error!,
                  onRetry: () => ref.read(dashboardProvider.notifier).load(),
                )
              : _DashboardContent(data: dashboard),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  final DashboardState data;

  const _DashboardContent({required this.data});

  @override
  Widget build(BuildContext context) {
    final dashboard = data.data;
    if (dashboard == null) {
      return const Center(child: Text('Aucune donnée disponible'));
    }

    return ListView(
      padding: EdgeInsets.symmetric(
        horizontal: context.isMobile ? 16 : 32,
        vertical: context.isMobile ? 16 : 24,
      ),
      children: [
        // Header
        Text('Aujourd\'hui', style: AppTextStyles.headingMedium),
        const SizedBox(height: 4),
        Text(
          _getDateLabel(),
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 20),

        // Active sessions section
        if (dashboard.activeSessions.isNotEmpty) ...[
          _SectionHeader(
            title: 'Séances en cours',
            count: dashboard.activeSessions.length,
            color: AppColors.sessionActive,
          ),
          const SizedBox(height: 8),
          ...dashboard.activeSessions.map(
            (s) => SessionCard(session: s),
          ),
          const SizedBox(height: 16),
        ],

        // Upcoming sessions section
        if (dashboard.upcomingSessions.isNotEmpty) ...[
          _SectionHeader(
            title: 'À venir',
            count: dashboard.upcomingSessions.length,
            color: AppColors.sessionScheduled,
          ),
          const SizedBox(height: 8),
          ...dashboard.upcomingSessions.map(
            (s) => SessionCard(session: s),
          ),
          const SizedBox(height: 16),
        ],

        // Completed sessions section
        if (dashboard.completedSessions.isNotEmpty) ...[
          _SectionHeader(
            title: 'Terminées',
            count: dashboard.completedSessions.length,
            color: AppColors.sessionCompleted,
          ),
          const SizedBox(height: 8),
          ...dashboard.completedSessions.map(
            (s) => SessionCard(session: s, showActions: false),
          ),
        ],

        // Empty state
        if (dashboard.todaySessions.isEmpty)
          _EmptyDay(),

        // Refreshing indicator
        if (data.isRefreshing)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Center(
              child: SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ),

        const SizedBox(height: 32),
      ],
    );
  }

  String _getDateLabel() {
    final now = DateTime.now();
    const days = [
      'Dimanche', 'Lundi', 'Mardi', 'Mercredi',
      'Jeudi', 'Vendredi', 'Samedi'
    ];
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return '${days[now.weekday % 7]} ${now.day} ${months[now.month - 1]} ${now.year}';
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  final Color color;

  const _SectionHeader({
    required this.title,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 18,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: AppTextStyles.labelLarge.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: color.withAlpha(20),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            '$count',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyDay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 24),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
        child: Column(
          children: [
            Icon(
              Icons.event_busy_rounded,
              size: 56,
              color: AppColors.textSecondary.withAlpha(80),
            ),
            const SizedBox(height: 16),
            Text(
              'Aucune séance aujourd\'hui',
              style: AppTextStyles.bodyLarge.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Consultez votre emploi du temps pour les prochains jours',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

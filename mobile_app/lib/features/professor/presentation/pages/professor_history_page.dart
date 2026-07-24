import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../data/models/session_data.dart';
import '../../providers/dashboard_provider.dart';

class ProfessorHistoryPage extends ConsumerWidget {
  const ProfessorHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final completed =
        ref.watch(dashboardCompletedSessionsProvider);

    return ListView(
      padding: EdgeInsets.symmetric(
        horizontal: context.isMobile ? 16 : 32,
        vertical: context.isMobile ? 16 : 24,
      ),
      children: [
        Text('Historique des Séances', style: AppTextStyles.headingMedium),
        const SizedBox(height: 4),
        Text(
          'Consultez vos séances passées',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 20),

        if (completed.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(48),
              child: Column(
                children: [
                  Icon(Icons.history_rounded,
                      size: 56, color: AppColors.textSecondary.withAlpha(80)),
                  const SizedBox(height: 16),
                  Text('Aucune séance terminée',
                      style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.textSecondary)),
                ],
              ),
            ),
          )
        else
          ...completed.map((s) => _HistoryCard(session: s)),
      ],
    );
  }
}

class _HistoryCard extends StatelessWidget {
  final SessionData session;
  const _HistoryCard({required this.session});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/professor/session/${session.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.sessionCompleted.withAlpha(20),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.check_circle_outline_rounded,
                    color: AppColors.sessionCompleted, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(session.moduleName,
                        style: AppTextStyles.bodyMedium.copyWith(
                            fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(
                      '${session.formattedDate} · ${session.formattedTime} · ${session.groupName}',
                      style: AppTextStyles.caption,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _MiniStat(
                            icon: Icons.check_circle_rounded,
                            label: '${session.presentCount}',
                            color: AppColors.statusPresent),
                        const SizedBox(width: 12),
                        _MiniStat(
                            icon: Icons.cancel_rounded,
                            label: '${session.absentCount}',
                            color: AppColors.statusAbsent),
                        const SizedBox(width: 12),
                        _MiniStat(
                            icon: Icons.access_time_rounded,
                            label: '${session.lateCount}',
                            color: AppColors.statusLate),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _MiniStat(
      {required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 2),
        Text(label,
            style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color)),
      ],
    );
  }
}

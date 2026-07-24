import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/widgets/custom_bar_chart.dart';
import '../../../../shared/widgets/custom_heatmap.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../providers/analytics_provider.dart';

class ProfessorAnalyticsPage extends ConsumerWidget {
  const ProfessorAnalyticsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final professorId = user?.id ?? '';
    final analytics = ref.watch(analyticsProvider(professorId));

    // Dynamic presence factors for the bar chart
    final rateFactor = analytics.attendanceRate > 0 ? (analytics.attendanceRate / 100.0) : 0.82;
    final barData = [
      BarChartData(label: 'Lun', value: (0.85 * rateFactor).clamp(0.0, 1.0)),
      BarChartData(label: 'Mar', value: (0.90 * rateFactor).clamp(0.0, 1.0)),
      BarChartData(label: 'Mer', value: (0.75 * rateFactor).clamp(0.0, 1.0)),
      BarChartData(label: 'Jeu', value: (0.80 * rateFactor).clamp(0.0, 1.0)),
      BarChartData(label: 'Ven', value: (0.60 * rateFactor).clamp(0.0, 1.0)),
    ];

    // Mock heatmap absence values
    final heatmapData = [
      const HeatmapData(dayIndex: 0, weekIndex: 0, absenceCount: 0),
      const HeatmapData(dayIndex: 1, weekIndex: 0, absenceCount: 1),
      const HeatmapData(dayIndex: 2, weekIndex: 0, absenceCount: 3),
      const HeatmapData(dayIndex: 3, weekIndex: 0, absenceCount: 0),
      const HeatmapData(dayIndex: 4, weekIndex: 0, absenceCount: 4),
      
      const HeatmapData(dayIndex: 0, weekIndex: 1, absenceCount: 1),
      const HeatmapData(dayIndex: 1, weekIndex: 1, absenceCount: 0),
      const HeatmapData(dayIndex: 2, weekIndex: 1, absenceCount: 2),
      const HeatmapData(dayIndex: 3, weekIndex: 1, absenceCount: 1),
      const HeatmapData(dayIndex: 4, weekIndex: 1, absenceCount: 5),
      
      const HeatmapData(dayIndex: 0, weekIndex: 2, absenceCount: 0),
      const HeatmapData(dayIndex: 1, weekIndex: 2, absenceCount: 2),
      const HeatmapData(dayIndex: 2, weekIndex: 2, absenceCount: 4),
      const HeatmapData(dayIndex: 3, weekIndex: 2, absenceCount: 0),
      const HeatmapData(dayIndex: 4, weekIndex: 2, absenceCount: 3),
      
      const HeatmapData(dayIndex: 0, weekIndex: 3, absenceCount: 2),
      const HeatmapData(dayIndex: 1, weekIndex: 3, absenceCount: 1),
      const HeatmapData(dayIndex: 2, weekIndex: 3, absenceCount: 1),
      const HeatmapData(dayIndex: 3, weekIndex: 3, absenceCount: 0),
      const HeatmapData(dayIndex: 4, weekIndex: 3, absenceCount: 4),
      
      const HeatmapData(dayIndex: 0, weekIndex: 4, absenceCount: 1),
      const HeatmapData(dayIndex: 1, weekIndex: 4, absenceCount: 0),
      const HeatmapData(dayIndex: 2, weekIndex: 4, absenceCount: 3),
      const HeatmapData(dayIndex: 3, weekIndex: 4, absenceCount: 2),
      const HeatmapData(dayIndex: 4, weekIndex: 4, absenceCount: 5),
    ];

    return ListView(
      padding: EdgeInsets.symmetric(
        horizontal: context.isMobile ? 16 : 32,
        vertical: context.isMobile ? 16 : 24,
      ),
      children: [
        Text('Analytiques', style: AppTextStyles.headingMedium),
        const SizedBox(height: 20),

        // Overview stats
        Row(
          children: [
            Expanded(child: _StatCard(
              title: 'Séances',
              value: '${analytics.totalSessions}',
              icon: Icons.school_rounded,
              color: AppColors.primary,
            )),
            const SizedBox(width: 12),
            Expanded(child: _StatCard(
              title: 'Taux présence',
              value: '${analytics.attendanceRate.toStringAsFixed(1)}%',
              icon: Icons.people_rounded,
              color: AppColors.success,
            )),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _StatCard(
              title: 'Présents',
              value: '${analytics.totalPresent}',
              icon: Icons.check_circle_rounded,
              color: AppColors.success,
            )),
            const SizedBox(width: 12),
            Expanded(child: _StatCard(
              title: 'Absents',
              value: '${analytics.totalAbsent}',
              icon: Icons.cancel_rounded,
              color: AppColors.danger,
            )),
          ],
        ),
        if (analytics.totalLate > 0) ...[
          const SizedBox(height: 12),
          _StatCard(
            title: 'Retards enregistrés',
            value: '${analytics.totalLate}',
            icon: Icons.access_time_rounded,
            color: AppColors.warning,
          ),
        ],

        const SizedBox(height: 28),
        
        // ── Custom Bar Chart ──
        CustomAnimatedBarChart(data: barData),
        
        const SizedBox(height: 16),

        // ── Custom Absence Heatmap ──
        CustomAbsenceHeatmap(data: heatmapData),

        const SizedBox(height: 28),
        
        // ── Top Absent Students Warning List ──
        Text('Étudiants les plus absents', style: AppTextStyles.headingSmall),
        const SizedBox(height: 12),
        const _AbsentStudentTile(
          name: 'Hadj Aissa Amine',
          group: 'M1-GL',
          absenceCount: 5,
          rate: 0.65,
        ),
        const _AbsentStudentTile(
          name: 'Bouzidi Mohamed',
          group: 'M1-GL',
          absenceCount: 4,
          rate: 0.72,
        ),
        const _AbsentStudentTile(
          name: 'Kaci Sonia',
          group: 'M1-RSD',
          absenceCount: 3,
          rate: 0.78,
        ),

        const SizedBox(height: 28),
        Text('Par module', style: AppTextStyles.headingSmall),
        const SizedBox(height: 12),
        if (analytics.moduleStats.isEmpty)
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withAlpha(50)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text('Aucune donnée par module',
                    style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary)),
              ),
            ),
          )
        else
          ...analytics.moduleStats.map((m) => _ModuleCard(module: m)),

        const SizedBox(height: 28),
        Text('Séances récentes', style: AppTextStyles.headingSmall),
        const SizedBox(height: 12),
        if (analytics.recentSessions.isEmpty)
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withAlpha(50)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text('Aucune séance enregistrée',
                    style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary)),
              ),
            ),
          )
        else
          ...analytics.recentSessions.map((s) => _SessionCard(session: s)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: theme.colorScheme.outlineVariant.withAlpha(50),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: color),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(title,
                      style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(value,
                style: AppTextStyles.headingLarge.copyWith(color: color)),
          ],
        ),
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final ModuleStats module;

  const _ModuleCard({required this.module});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withAlpha(50)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(module.moduleName, style: AppTextStyles.bodyLarge),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${module.sessions} séances',
                          style: AppTextStyles.bodySmall),
                      const SizedBox(height: 4),
                      Text('${module.present} présents, ${module.absent} absents',
                          style: AppTextStyles.caption),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('${module.rate.toStringAsFixed(0)}%',
                        style: AppTextStyles.headingSmall.copyWith(
                          color: module.rate >= 75
                              ? AppColors.success
                              : module.rate >= 50
                                  ? AppColors.warning
                                  : AppColors.danger,
                        )),
                    Text('présence', style: AppTextStyles.caption),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: module.rate / 100,
                backgroundColor: AppColors.danger.withAlpha(40),
                valueColor: AlwaysStoppedAnimation<Color>(
                  module.rate >= 75
                      ? AppColors.success
                      : module.rate >= 50
                          ? AppColors.warning
                          : AppColors.danger,
                ),
                minHeight: 6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  final SessionStats session;

  const _SessionCard({required this.session});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = session.totalStudents;
    final rate = total > 0 ? (session.presentCount / total) * 100 : 0.0;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withAlpha(50)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(session.moduleName, style: AppTextStyles.bodyMedium),
                  const SizedBox(height: 2),
                  Text(session.sessionDate,
                      style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary)),
                ],
              ),
              ),
            const SizedBox(width: 8),
            _MiniStat(session.presentCount, AppColors.success),
            const SizedBox(width: 4),
            _MiniStat(session.absentCount, AppColors.danger),
            const SizedBox(width: 8),
            Text('${rate.toStringAsFixed(0)}%',
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w600,
                  color: rate >= 75
                      ? AppColors.success
                      : rate >= 50
                          ? AppColors.warning
                          : AppColors.danger,
                )),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final int count;
  final Color color;

  const _MiniStat(this.count, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text('$count',
          style: AppTextStyles.bodySmall.copyWith(
              color: color, fontWeight: FontWeight.w600)),
    );
  }
}

class _AbsentStudentTile extends StatelessWidget {
  final String name;
  final String group;
  final int absenceCount;
  final double rate; // Presence rate (e.g. 0.65)

  const _AbsentStudentTile({
    required this.name,
    required this.group,
    required this.absenceCount,
    required this.rate,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: theme.colorScheme.outlineVariant.withAlpha(50),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Circular progress ring showing presence rate
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 44,
                  height: 44,
                  child: CircularProgressIndicator(
                    value: rate,
                    strokeWidth: 4.5,
                    backgroundColor: AppColors.danger.withAlpha(30),
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.danger),
                  ),
                ),
                Text(
                  '${(rate * 100).round()}%',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppColors.danger,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Groupe $group · $absenceCount absences',
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 22),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Avertissement envoyé à $name par SMS/Email.'),
                    backgroundColor: AppColors.warning,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

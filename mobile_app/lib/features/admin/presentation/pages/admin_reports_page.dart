import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../professor/data/models/session_data.dart';
import '../../data/admin_repository.dart';
import '../../providers/admin_dashboard_provider.dart';

class AdminReportsPage extends ConsumerStatefulWidget {
  const AdminReportsPage({super.key});

  @override
  ConsumerState<AdminReportsPage> createState() => _AdminReportsPageState();
}

class _AdminReportsPageState extends ConsumerState<AdminReportsPage> {
  Map<String, int> _byGroup = {};
  Map<String, int> _byModule = {};
  Map<String, int> _busiestRooms = {};
  Map<String, int> _trend = {};
  bool _loadingAnalytics = true;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    setState(() => _loadingAnalytics = true);
    try {
      final repo = ref.read(adminRepositoryProvider);
      final byGroup = await repo.attendanceByGroup();
      final byModule = await repo.attendanceByModule();
      final busiest = await repo.busiestRooms();
      final trend = await repo.attendanceTrendByWeek();
      if (mounted) {
        setState(() {
          _byGroup = byGroup;
          _byModule = byModule;
          _busiestRooms = busiest;
          _trend = trend;
          _loadingAnalytics = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingAnalytics = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(adminDashboardProvider);

    if (data == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final totalSessions = data.recentSessions.length;
    final totalPresent =
        data.recentSessions.fold<int>(0, (sum, s) => sum + s.presentCount);
    final totalAbsent =
        data.recentSessions.fold<int>(0, (sum, s) => sum + s.absentCount);
    final totalLate =
        data.recentSessions.fold<int>(0, (sum, s) => sum + s.lateCount);
    final totalMarked = totalPresent + totalAbsent + totalLate;
    final overallRate =
        totalMarked > 0 ? (totalPresent / totalMarked * 100) : 0.0;

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(adminDashboardProvider);
        await _loadAnalytics();
      },
      child: ListView(
        padding: EdgeInsets.symmetric(
          horizontal: context.isMobile ? 16 : 32,
          vertical: context.isMobile ? 16 : 24,
        ),
        children: [
          _Header(),
          const SizedBox(height: 24),
          _SummaryGrid(
            totalSessions: totalSessions,
            averageRate: data.averageAttendanceRate,
            overallRate: overallRate,
            totalPresent: totalPresent,
            totalAbsent: totalAbsent,
            totalLate: totalLate,
            totalMarked: totalMarked,
          ),
          const SizedBox(height: 24),
          _RecentSessionsSection(sessions: data.recentSessions),
          const SizedBox(height: 24),

          // Enhanced Analytics
          Text('Analyses détaillées', style: AppTextStyles.headingMedium),
          const SizedBox(height: 16),

          if (_loadingAnalytics)
            const Center(child: CircularProgressIndicator())
          else ...[
            _BarChartSection(
              title: 'Absences par groupe',
              icon: Icons.group_work_rounded,
              data: _byGroup,
              color: AppColors.roleStudent,
            ),
            const SizedBox(height: 12),
            _BarChartSection(
              title: 'Absences par module',
              icon: Icons.menu_book_rounded,
              data: _byModule,
              color: AppColors.info,
            ),
            const SizedBox(height: 12),
            _BarChartSection(
              title: 'Salles les plus utilisées',
              icon: Icons.meeting_room_rounded,
              data: _busiestRooms,
              color: AppColors.warning,
            ),
            const SizedBox(height: 12),
            _BarChartSection(
              title: 'Tendance hebdomadaire',
              icon: Icons.trending_up_rounded,
              data: _trend,
              color: AppColors.accent,
            ),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Rapports de présence', style: AppTextStyles.headingMedium),
        const SizedBox(height: 4),
        Text(
          'Aperçu agrégé des séances du jour',
          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _SummaryGrid extends StatelessWidget {
  final int totalSessions;
  final double averageRate;
  final double overallRate;
  final int totalPresent;
  final int totalAbsent;
  final int totalLate;
  final int totalMarked;

  const _SummaryGrid({
    required this.totalSessions,
    required this.averageRate,
    required this.overallRate,
    required this.totalPresent,
    required this.totalAbsent,
    required this.totalLate,
    required this.totalMarked,
  });

  Color _rateColor(double rate) {
    if (rate >= 75) return AppColors.success;
    if (rate >= 50) return AppColors.warning;
    return AppColors.danger;
  }

  @override
  Widget build(BuildContext context) {
    final items = [
      _SummaryItem(
        icon: Icons.event_rounded,
        label: 'Séances',
        value: '$totalSessions',
        color: AppColors.primary,
      ),
      _SummaryItem(
        icon: Icons.people_rounded,
        label: 'Présents',
        value: '$totalPresent',
        color: AppColors.success,
      ),
      _SummaryItem(
        icon: Icons.person_off_rounded,
        label: 'Absents',
        value: '$totalAbsent',
        color: AppColors.danger,
      ),
      _SummaryItem(
        icon: Icons.access_time_rounded,
        label: 'Retards',
        value: '$totalLate',
        color: AppColors.warning,
      ),
      _SummaryItem(
        icon: Icons.people_outline_rounded,
        label: 'Marqués',
        value: '$totalMarked',
        color: AppColors.info,
      ),
      _SummaryItem(
        icon: Icons.trending_up_rounded,
        label: 'Taux présence',
        value: '${overallRate.toStringAsFixed(1)}%',
        color: _rateColor(overallRate),
      ),
    ];

    if (context.isMobile) {
      return Column(
        children: items.map((item) => _SummaryCard(item: item)).toList(),
      );
    }

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: items.map((item) {
        final cardWidth =
            (context.screenWidth - (context.isDesktop ? 64 : 64) - 12 * 2) / 3;
        return SizedBox(
          width: cardWidth.clamp(180, 300),
          child: _SummaryCard(item: item),
        );
      }).toList(),
    );
  }
}

class _SummaryItem {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _SummaryItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });
}

class _SummaryCard extends StatelessWidget {
  final _SummaryItem item;
  const _SummaryCard({required this.item});

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
                    style: AppTextStyles.headingSmall.copyWith(
                      color: item.color,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.label,
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

class _BarChartSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Map<String, int> data;
  final Color color;

  const _BarChartSection({
    required this.title,
    required this.icon,
    required this.data,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            children: [
              Icon(icon, size: 32, color: color.withAlpha(100)),
              const SizedBox(width: 12),
              Text(title, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
              const Spacer(),
              Text('Aucune donnée', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
            ],
          ),
        ),
      );
    }

    final sorted = data.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final maxVal = sorted.first.value;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: color),
                const SizedBox(width: 8),
                Text(title, style: AppTextStyles.labelLarge),
              ],
            ),
            const SizedBox(height: 12),
            ...sorted.take(10).map((entry) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  SizedBox(
                    width: 120,
                    child: Text(
                      entry.key,
                      style: AppTextStyles.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: maxVal > 0 ? entry.value / maxVal : 0,
                        backgroundColor: color.withAlpha(20),
                        color: color,
                        minHeight: 18,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 30,
                    child: Text(
                      '${entry.value}',
                      style: AppTextStyles.caption.copyWith(
                        fontWeight: FontWeight.w600,
                        color: color,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
            )),
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
            Text('Séances du jour', style: AppTextStyles.labelLarge),
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
                      'Aucune séance aujourd\'hui',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Créez une séance depuis l\'emploi du temps',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary.withAlpha(150),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          ...sessions.map((s) => _ReportSessionCard(session: s)),
      ],
    );
  }
}

class _ReportSessionCard extends StatelessWidget {
  final SessionData session;
  const _ReportSessionCard({required this.session});

  Color _attendanceColor(double rate) {
    if (rate >= 75) return AppColors.success;
    if (rate >= 50) return AppColors.warning;
    return AppColors.danger;
  }

  @override
  Widget build(BuildContext context) {
    final marked = session.totalMarked;
    final rate = marked > 0 ? (session.presentCount / marked * 100) : 0.0;
    final color = _attendanceColor(rate);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
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
                        '${session.groupName} · ${session.formattedDate}',
                        style: AppTextStyles.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withAlpha(20),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${rate.toStringAsFixed(1)}%',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: rate / 100,
                backgroundColor: color.withAlpha(25),
                color: color,
                minHeight: 8,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _CountChip(
                  icon: Icons.check_circle_rounded,
                  label: 'Présents',
                  count: session.presentCount,
                  color: AppColors.success,
                ),
                const SizedBox(width: 8),
                _CountChip(
                  icon: Icons.cancel_rounded,
                  label: 'Absents',
                  count: session.absentCount,
                  color: AppColors.danger,
                ),
                const SizedBox(width: 8),
                _CountChip(
                  icon: Icons.access_time_rounded,
                  label: 'Retards',
                  count: session.lateCount,
                  color: AppColors.warning,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CountChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  final Color color;

  const _CountChip({
    required this.icon,
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: color.withAlpha(15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              '$count',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: color.withAlpha(180),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

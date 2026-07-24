import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/providers/timetable_state_provider.dart';
import '../../../../shared/widgets/loading_shimmer.dart';
import '../../../../shared/widgets/timetable/timetable_day_view.dart';
import '../../../../shared/widgets/timetable/timetable_swipe_wrapper.dart';
import '../../../../shared/widgets/timetable/timetable_week_header.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../professor/data/models/session_data.dart';
import '../../../professor/data/models/timetable_item.dart';
import '../../data/student_repository.dart';

final studentTimetableProvider = FutureProvider<List<TimetableItem>>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];

  final weekStart = ref.watch(weekStartProvider);
  final weekEnd = ref.watch(weekEndProvider);

  // 1. Récupérer le groupe de l'étudiant via les enrollments
  String groupId = '';
  String groupName = '';
  final enrollmentData = await repo.getStudentEnrollment(user.id);
  if (enrollmentData != null) {
    groupId = enrollmentData['groupId'] as String? ?? '';
    groupName = enrollmentData['groupName'] as String? ?? '';
  }

  // 2. Charger les séances de l'étudiant (via son groupe)
  final sessions = groupName.isNotEmpty
      ? await repo.getSessionsBetween(
          groupName: groupName,
          start: weekStart,
          end: weekEnd,
        )
      : <SessionData>[];

  // 3. Charger le planning hebdomadaire pour son groupe
  final schedule = groupId.isNotEmpty
      ? await repo.getWeeklyScheduleByGroup(
          groupId: groupId,
          weekStart: weekStart,
          weekEnd: weekEnd,
        )
      : [];

  // 4. Fusionner
  final sessionKeys = sessions.map((s) => '${s.sessionDate.toIso8601String().substring(0, 10)}-${s.startTime}').toSet();
  final items = <TimetableItem>[
    ...sessions.map(TimetableItem.fromSession),
    for (final s in schedule)
      ...() sync* {
        final startStr = s['startTime'] as String? ?? '';
        for (int i = 0; i <= 6; i++) {
          final date = weekStart.add(Duration(days: i));
          final dateStr = date.toIso8601String().substring(0, 10);
          final dow = date.weekday % 7;
          if (s['dayOfWeek'] == dow && !sessionKeys.contains('$dateStr-$startStr')) {
            yield TimetableItem.fromSchedule(s, date);
          }
        }
      }(),
  ];

  return items;
});

class StudentTimetablePage extends ConsumerWidget {
  const StudentTimetablePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemsAsync = ref.watch(studentTimetableProvider);

    return RefreshIndicator(
      onRefresh: () async { ref.invalidate(studentTimetableProvider); },
      child: ListView(
        padding: EdgeInsets.symmetric(
          horizontal: context.isMobile ? 12 : 32,
          vertical: context.isMobile ? 12 : 24,
        ),
        children: [
          Text('Mon Emploi du Temps', style: AppTextStyles.headingMedium),
          const SizedBox(height: 16),
          TimetableWeekHeader(),
          const SizedBox(height: 16),
          itemsAsync.when(
            loading: () => Column(
              children: List.generate(4, (i) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: SizedBox(
                  height: 80,
                  child: LoadingShimmer.rectangular(height: 80),
                ),
              )),
            ),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(Icons.error_outline_rounded, size: 56, color: AppColors.danger.withAlpha(150)),
                    const SizedBox(height: 16),
                    Text('Erreur de chargement', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
            ),
            data: (items) {
              final weekStart = ref.watch(weekStartProvider);
              final weekEnd = ref.watch(weekEndProvider);
              final weekItems = items.where((item) =>
                !item.sessionDate.isBefore(weekStart.subtract(const Duration(hours: 1))) &&
                !item.sessionDate.isAfter(weekEnd.add(const Duration(hours: 23))),
              ).toList();

              return Column(
                children: [
                  TimetableSwipeWrapper(
                    child: TimetableDayView(
                      allItems: weekItems,
                      onItemTap: null,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('${weekItems.length} séance(s) cette semaine',
                      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

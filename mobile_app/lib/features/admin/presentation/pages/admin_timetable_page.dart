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
import '../../../professor/data/models/session_data.dart';
import '../../../professor/data/models/timetable_item.dart';
import '../../data/admin_repository.dart';
import '../widgets/admin_session_dialog.dart';

final adminSessionsProvider = StreamProvider<List<SessionData>>((ref) {
  return ref.watch(adminRepositoryProvider).sessionsStream();
});

class AdminTimetablePage extends ConsumerWidget {
  const AdminTimetablePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(adminSessionsProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(adminSessionsProvider),
      child: ListView(
        padding: EdgeInsets.symmetric(
          horizontal: context.isMobile ? 12 : 32,
          vertical: context.isMobile ? 12 : 24,
        ),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Emploi du Temps', style: AppTextStyles.headingMedium),
              FilledButton.icon(
                onPressed: () => showCreateSessionDialog(context, ref),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(context.isMobile ? '' : 'Nouvelle séance',
                    style: AppTextStyles.buttonMedium),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TimetableWeekHeader(),
          const SizedBox(height: 16),
          sessionsAsync.when(
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
            data: (sessions) {
              final weekStart = ref.watch(weekStartProvider);
              final weekEnd = ref.watch(weekEndProvider);
              final weekSessions = sessions.where((s) =>
                !s.sessionDate.isBefore(weekStart.subtract(const Duration(hours: 1))) &&
                !s.sessionDate.isAfter(weekEnd.add(const Duration(hours: 23))),
              ).toList();

              final allItems = weekSessions.map(TimetableItem.fromSession).toList();
              return Column(
                children: [
                  TimetableSwipeWrapper(
                    child: TimetableDayView(
                      allItems: allItems,
                      onItemTap: null,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('${weekSessions.length} séance(s) cette semaine',
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

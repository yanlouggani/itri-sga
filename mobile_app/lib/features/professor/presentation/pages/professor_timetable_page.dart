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
import '../../data/models/timetable_item.dart';
import '../../data/professor_repository.dart';

final professorTimetableProvider = FutureProvider<List<TimetableItem>>((ref) async {
  final repo = ref.watch(professorRepositoryProvider);
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];

  final weekStart = ref.watch(weekStartProvider);
  final weekEnd = ref.watch(weekEndProvider);

  // 1. Charger les vraies séances
  final sessions = await repo.getSessionsBetween(
    professorId: user.id,
    start: weekStart,
    end: weekEnd,
  );

  // 2. Charger le planning hebdomadaire
  final schedule = await repo.getWeeklySchedule(
    user.id,
    weekStart: weekStart,
    weekEnd: weekEnd,
  );

  // 3. Assembler : garder les sessions, ajouter les créneaux sans session
  final sessionKeys = sessions.map((s) => '${s.sessionDate.toIso8601String().substring(0, 10)}-${s.startTime}').toSet();
  final items = <TimetableItem>[
    ...sessions.map(TimetableItem.fromSession),
    for (final s in schedule)
      ...() sync* {
        final startStr = s['startTime'] as String? ?? '';
        for (int i = 0; i <= 6; i++) {
          final date = weekStart.add(Duration(days: i));
          final dateStr = date.toIso8601String().substring(0, 10);
          final dow = date.weekday % 7; // 0=Dim, 1=Lun...6=Sam
          if (s['dayOfWeek'] == dow && !sessionKeys.contains('$dateStr-$startStr')) {
            yield TimetableItem.fromSchedule(s, date);
          }
        }
      }(),
  ];

  return items;
});

class ProfessorTimetablePage extends ConsumerWidget {
  const ProfessorTimetablePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemsAsync = ref.watch(professorTimetableProvider);

    return RefreshIndicator(
      onRefresh: () async { ref.invalidate(professorTimetableProvider); },
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
              // Filtrer par semaine (déjà fait dans le provider, mais sécurité)
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
                      onItemTap: (item) => _onItemTap(context, ref, item),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('${weekItems.length} élément(s) cette semaine',
                      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  void _onItemTap(BuildContext context, WidgetRef ref, TimetableItem item) {
    if (item.isSession && item.sessionId != null) {
      Navigator.pushNamed(context, '/professor/session/${item.sessionId}');
      return;
    }

    if (item.source == 'schedule' && item.scheduleId.isNotEmpty) {
      final isPast = item.isPast;
      _showScheduleActionSheet(context, ref, item, isPast);
    }
  }

  void _showScheduleActionSheet(BuildContext context, WidgetRef ref, TimetableItem item, bool isPast) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isPast ? 'Saisir les présences' : 'Annuler la séance'),
        content: Text(
          isPast
              ? 'Créer une séance complétée pour "${item.moduleName}" le ${item.formattedDate} à ${item.startTime} ?'
              : 'Marquer "${item.moduleName}" du ${item.formattedDate} à ${item.startTime} comme annulée ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Retour'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: isPast ? AppColors.success : AppColors.danger,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(isPast ? 'Saisir' : 'Annuler'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final repo = ref.read(professorRepositoryProvider);
    try {
      await repo.createSessionForDate(
        item.scheduleId,
        item.sessionDate,
        cancelled: !isPast,
      );
      ref.invalidate(professorTimetableProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isPast ? 'Présences enregistrées' : 'Séance annulée'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.danger),
        );
      }
    }
  }
}

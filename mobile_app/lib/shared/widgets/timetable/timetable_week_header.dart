import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/text_styles.dart';
import '../../../core/utils/extensions.dart';
import '../../providers/timetable_state_provider.dart';

class TimetableWeekHeader extends ConsumerWidget {
  final VoidCallback? onTodayPressed;

  const TimetableWeekHeader({super.key, this.onTodayPressed});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weekStart = ref.watch(weekStartProvider);
    final selectedIndex = ref.watch(selectedDayIndexProvider);
    final now = DateTime.now();
    const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left_rounded),
              onPressed: () {
                ref.read(weekOffsetProvider.notifier).update((s) => s - 1);
              },
              style: IconButton.styleFrom(
                backgroundColor: context.colorScheme.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(width: 4),
            Text(
              'Semaine ${_weekNumber(weekStart)}',
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 4),
            IconButton(
              icon: const Icon(Icons.chevron_right_rounded),
              onPressed: () {
                ref.read(weekOffsetProvider.notifier).update((s) => s + 1);
              },
              style: IconButton.styleFrom(
                backgroundColor: context.colorScheme.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const Spacer(),
            if (onTodayPressed != null)
              TextButton.icon(
                onPressed: () {
                  ref.read(selectedDayIndexProvider.notifier).state = now.weekday - 1;
                  ref.read(weekOffsetProvider.notifier).state = 0;
                  onTodayPressed?.call();
                },
                icon: const Icon(Icons.today_rounded, size: 16),
                label: const Text("Aujourd'hui", style: TextStyle(fontSize: 12)),
              ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 72,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: 7,
            separatorBuilder: (_, __) => const SizedBox(width: 4),
            itemBuilder: (context, i) {
              final day = weekStart.add(Duration(days: i));
              final isSelected = i == selectedIndex;
              final isToday = day.day == now.day &&
                  day.month == now.month &&
                  day.year == now.year;

              return GestureDetector(
                onTap: () {
                  ref.read(selectedDayIndexProvider.notifier).state = i;
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeInOut,
                  width: isSelected ? 56.0 : 48.0,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                        : isToday
                            ? AppColors.primary.withAlpha(20)
                            : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : isToday
                              ? AppColors.primary.withAlpha(80)
                              : context.colorScheme.outlineVariant.withAlpha(50),
                      width: isSelected ? 1.5 : 1.0,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        dayLabels[i],
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected
                              ? Colors.white
                              : isToday
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${day.day}',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: isSelected ? 16 : 14,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? Colors.white
                              : isToday
                                  ? AppColors.primary
                                  : AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  int _weekNumber(DateTime date) {
    final startOfYear = DateTime(date.year, 1, 1);
    final diff = date.difference(startOfYear).inDays;
    return ((diff + startOfYear.weekday - 1) / 7).ceil();
  }
}

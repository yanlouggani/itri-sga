import 'package:flutter/material.dart';
import '../../core/theme/colors.dart';

class HeatmapData {
  final int dayIndex; // 0: Lun, 1: Mar, 2: Mer, 3: Jeu, 4: Ven
  final int weekIndex; // 0 to 4 (5 weeks)
  final int absenceCount;

  const HeatmapData({
    required this.dayIndex,
    required this.weekIndex,
    required this.absenceCount,
  });
}

class CustomAbsenceHeatmap extends StatefulWidget {
  final List<HeatmapData> data;
  final String title;

  const CustomAbsenceHeatmap({
    super.key,
    required this.data,
    this.title = 'Densité des absences par jour & semaine',
  });

  @override
  State<CustomAbsenceHeatmap> createState() => _CustomAbsenceHeatmapState();
}

class _CustomAbsenceHeatmapState extends State<CustomAbsenceHeatmap> {
  int _selectedDay = -1;
  int _selectedWeek = -1;
  int _selectedCount = 0;

  final List<String> _days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Create a 2D map for easy lookup
    final matrix = List.generate(5, (_) => List.generate(5, (_) => 0));
    for (final item in widget.data) {
      if (item.dayIndex >= 0 && item.dayIndex < 5 && item.weekIndex >= 0 && item.weekIndex < 5) {
        matrix[item.dayIndex][item.weekIndex] = item.absenceCount;
      }
    }

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: theme.colorScheme.outlineVariant.withAlpha(isDark ? 30 : 60),
        ),
      ),
      color: theme.colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.title.isNotEmpty) ...[
              Text(
                widget.title,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 20),
            ],
            
            // Selected cell description / tooltip
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              height: 36,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: _selectedDay != -1 
                    ? theme.colorScheme.surfaceContainerHighest.withAlpha(80)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: _selectedDay != -1
                  ? Row(
                      children: [
                        Icon(
                          Icons.info_outline_rounded,
                          size: 16,
                          color: _selectedCount > 0 ? AppColors.danger : AppColors.success,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${_days[_selectedDay]}, Semaine ${_selectedWeek + 1} : ${_selectedCount} ${_selectedCount > 1 ? "absences" : "absence"}',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                      ],
                    )
                  : Text(
                      'Touchez un carré pour voir les détails',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        color: theme.colorScheme.onSurface.withAlpha(120),
                        fontStyle: FontStyle.italic,
                      ),
                    ),
            ),

            // Heatmap Grid
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Y-Axis Labels (Days of Week)
                Column(
                  children: List.generate(5, (d) {
                    return SizedBox(
                      height: 34,
                      width: 36,
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          _days[d],
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurface.withAlpha(140),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
                
                // Heatmap cells
                Expanded(
                  child: Column(
                    children: List.generate(5, (d) {
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: List.generate(5, (w) {
                          final count = matrix[d][w];
                          final isSelected = _selectedDay == d && _selectedWeek == w;
                          
                          // Determine color opacity based on absence count
                          double opacity = 0.05;
                          if (count > 0) {
                            opacity = (0.2 + (count * 0.15)).clamp(0.2, 0.95);
                          }
                          
                          final cellColor = count > 0 
                              ? AppColors.danger.withAlpha((opacity * 255).round())
                              : (isDark ? Colors.white.withAlpha(10) : AppColors.borderLight.withAlpha(80));

                          return Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  if (_selectedDay == d && _selectedWeek == w) {
                                    _selectedDay = -1;
                                    _selectedWeek = -1;
                                    _selectedCount = 0;
                                  } else {
                                    _selectedDay = d;
                                    _selectedWeek = w;
                                    _selectedCount = count;
                                  }
                                });
                              },
                              child: TweenAnimationBuilder<double>(
                                duration: Duration(milliseconds: 400 + (d * 50) + (w * 50)),
                                tween: Tween<double>(begin: 0.0, end: 1.0),
                                builder: (context, animValue, child) {
                                  return Opacity(
                                    opacity: animValue,
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 200),
                                      margin: const EdgeInsets.all(3),
                                      height: 28,
                                      decoration: BoxDecoration(
                                        color: cellColor,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(
                                          color: isSelected
                                              ? theme.colorScheme.onSurface
                                              : (isSelected ? theme.colorScheme.outline : Colors.transparent),
                                          width: isSelected ? 2.0 : 1.0,
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          );
                        }),
                      );
                    }),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Legend
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  'Moins d\'absences',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    color: theme.colorScheme.onSurface.withAlpha(120),
                  ),
                ),
                const SizedBox(width: 6),
                _LegendBox(color: isDark ? Colors.white.withAlpha(10) : AppColors.borderLight.withAlpha(80)),
                const SizedBox(width: 4),
                _LegendBox(color: AppColors.danger.withAlpha(64)),
                const SizedBox(width: 4),
                _LegendBox(color: AppColors.danger.withAlpha(140)),
                const SizedBox(width: 4),
                _LegendBox(color: AppColors.danger.withAlpha(217)),
                const SizedBox(width: 6),
                Text(
                  'Plus d\'absences',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    color: theme.colorScheme.onSurface.withAlpha(120),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LegendBox extends StatelessWidget {
  final Color color;

  const _LegendBox({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(3),
      ),
    );
  }
}

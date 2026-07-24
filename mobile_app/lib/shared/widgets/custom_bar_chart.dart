import 'package:flutter/material.dart';
import '../../core/theme/colors.dart';

class BarChartData {
  final String label;
  final double value; // Expected to be a percentage between 0.0 and 1.0

  const BarChartData({required this.label, required this.value});
}

class CustomAnimatedBarChart extends StatefulWidget {
  final List<BarChartData> data;
  final String title;

  const CustomAnimatedBarChart({
    super.key,
    required this.data,
    this.title = 'Taux de présence hebdomadaire',
  });

  @override
  State<CustomAnimatedBarChart> createState() => _CustomAnimatedBarChartState();
}

class _CustomAnimatedBarChartState extends State<CustomAnimatedBarChart> {
  int _selectedIndex = -1;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
              const SizedBox(height: 24),
            ],
            SizedBox(
              height: 200,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final chartHeight = constraints.maxHeight - 30; // Leave space for X-axis labels
                  final barWidth = (constraints.maxWidth / widget.data.length) * 0.55;

                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: List.generate(widget.data.length, (index) {
                      final item = widget.data[index];
                      final isSelected = _selectedIndex == index;

                      return GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTapDown: (_) {
                          setState(() {
                            _selectedIndex = isSelected ? -1 : index;
                          });
                        },
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            // Bar container area
                            Expanded(
                              child: Stack(
                                alignment: Alignment.bottomCenter,
                                clipBehavior: Clip.none,
                                children: [
                                  // Background Track
                                  Container(
                                    width: barWidth,
                                    height: chartHeight,
                                    decoration: BoxDecoration(
                                      color: isDark 
                                          ? theme.colorScheme.surfaceContainerHighest.withAlpha(40)
                                          : theme.colorScheme.outlineVariant.withAlpha(30),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  // Animated Active Fill
                                  TweenAnimationBuilder<double>(
                                    duration: Duration(milliseconds: 800 + (index * 100)), // staggered effect!
                                    curve: Curves.easeOutBack,
                                    tween: Tween<double>(begin: 0.0, end: item.value),
                                    builder: (context, val, child) {
                                      final barFillHeight = chartHeight * val;
                                      return Container(
                                        width: barWidth,
                                        height: barFillHeight.clamp(4.0, chartHeight),
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            begin: Alignment.bottomCenter,
                                            end: Alignment.topCenter,
                                            colors: isSelected
                                                ? [AppColors.success, AppColors.success.withAlpha(180)]
                                                : [AppColors.primary, AppColors.primary.withAlpha(160)],
                                          ),
                                          borderRadius: const BorderRadius.vertical(
                                            top: Radius.circular(8),
                                          ),
                                          boxShadow: isSelected
                                              ? [
                                                  BoxShadow(
                                                    color: AppColors.success.withAlpha(60),
                                                    blurRadius: 10,
                                                    offset: const Offset(0, 2),
                                                  )
                                                ]
                                              : [],
                                        ),
                                      );
                                    },
                                  ),
                                  // Floating Tooltip Bubble
                                  if (isSelected)
                                    Positioned(
                                      top: -38,
                                      child: Material(
                                        elevation: 4,
                                        shadowColor: Colors.black38,
                                        borderRadius: BorderRadius.circular(6),
                                        color: theme.colorScheme.onSurface,
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 4,
                                          ),
                                          child: Text(
                                            '${(item.value * 100).round()}%',
                                            style: TextStyle(
                                              fontFamily: 'Inter',
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: theme.colorScheme.surface,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            // X-Axis Label
                            Text(
                              item.label,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: isSelected 
                                    ? theme.colorScheme.primary 
                                    : theme.colorScheme.onSurface.withAlpha(150),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

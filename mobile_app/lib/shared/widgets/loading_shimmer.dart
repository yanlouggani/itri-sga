import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class LoadingShimmer extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;
  final ShapeBorder shapeBorder;

  const LoadingShimmer.rectangular({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 12,
  }) : shapeBorder = const RoundedRectangleBorder();

  const LoadingShimmer.circular({
    super.key,
    required this.width,
    required this.height,
  })  : borderRadius = 0,
        shapeBorder = const CircleBorder();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    // Smooth Material 3 tailored color gradients for shimmer
    final baseColor = isDark 
        ? const Color(0xFF222C4A) 
        : const Color(0xFFE2E8F0);
    final highlightColor = isDark 
        ? const Color(0xFF2E3B63) 
        : const Color(0xFFF7FAFC);

    return Shimmer.fromColors(
      baseColor: baseColor,
      highlightColor: highlightColor,
      period: const Duration(milliseconds: 1200),
      child: Container(
        width: width,
        height: height,
        decoration: ShapeDecoration(
          color: baseColor,
          shape: shapeBorder is CircleBorder
              ? const CircleBorder()
              : RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(borderRadius),
                ),
        ),
      ),
    );
  }

  // ── Pre-defined Skeleton Builders ──

  /// Renders a beautiful card skeleton with an avatar and two text lines
  static Widget cardSkeleton(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const LoadingShimmer.circular(width: 44, height: 44),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LoadingShimmer.rectangular(height: 16, width: 140),
                  const SizedBox(height: 8),
                  LoadingShimmer.rectangular(
                    height: 12, 
                    width: double.infinity, 
                    borderRadius: 6,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Renders a list of card skeletons
  static Widget listSkeleton(BuildContext context, {int count = 4}) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      itemCount: count,
      itemBuilder: (context, index) => cardSkeleton(context),
    );
  }

  /// Renders a grid / grid wrap of KPI skeletons
  static Widget kpisSkeleton(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;
    
    final item = Card(
      margin: EdgeInsets.only(bottom: isMobile ? 8 : 0),
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        child: Row(
          children: [
            LoadingShimmer.circular(width: 48, height: 48),
            SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LoadingShimmer.rectangular(height: 24, width: 60),
                  SizedBox(height: 6),
                  LoadingShimmer.rectangular(height: 12, width: 90),
                ],
              ),
            ),
          ],
        ),
      ),
    );

    if (isMobile) {
      return Column(
        children: List.generate(3, (index) => item),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 2.2,
      ),
      itemCount: 3,
      itemBuilder: (context, index) => item,
    );
  }

  /// Renders an analytics chart panel skeleton
  static Widget chartSkeleton(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const LoadingShimmer.rectangular(height: 20, width: 150),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(
                7,
                (index) => Column(
                  children: [
                    LoadingShimmer.rectangular(
                      width: 24, 
                      height: 40.0 + (index % 3) * 36.0,
                    ),
                    const SizedBox(height: 8),
                    const LoadingShimmer.rectangular(width: 28, height: 10),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/widgets/app_error_widget.dart';
import '../../data/models/student_dashboard_data.dart';
import '../../providers/student_dashboard_provider.dart';
import '../widgets/absence_progress_card.dart';
import '../widgets/session_status_chip.dart';

class StudentDashboardPage extends ConsumerStatefulWidget {
  const StudentDashboardPage({super.key});

  @override
  ConsumerState<StudentDashboardPage> createState() => _StudentDashboardPageState();
}

class _StudentDashboardPageState extends ConsumerState<StudentDashboardPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.trim().toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(studentDashboardProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(studentDashboardProvider.notifier).load(),
      child: state.isLoading && state.data == null
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.data == null
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => ref.read(studentDashboardProvider.notifier).load(),
                )
              : _buildContent(context, state),
    );
  }

  Widget _buildContent(BuildContext context, StudentDashboardState state) {
    final data = state.data;
    if (data == null) {
      return const Center(child: Text('Aucune donnée'));
    }

    // Filter today sessions by search query
    final filteredSessions = data.todaySessions.where((s) {
      return s.moduleName.toLowerCase().contains(_searchQuery);
    }).toList();

    // Filter absence summary by search query
    final filteredAbsences = data.absenceSummary.where((a) {
      return a.moduleName.toLowerCase().contains(_searchQuery);
    }).toList();

    return ListView(
      padding: EdgeInsets.symmetric(
        horizontal: context.isMobile ? 16 : 32,
        vertical: context.isMobile ? 16 : 24,
      ),
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Espace Étudiant', style: AppTextStyles.headingMedium),
                const SizedBox(height: 4),
                Text(
                  _todayLabel(),
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            if (state.isRefreshing)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
          ],
        ),
        const SizedBox(height: 20),

        // Beautiful Search Bar (M3 style)
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Rechercher un module...',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear_rounded),
                    onPressed: () => _searchController.clear(),
                  )
                : null,
            filled: true,
            fillColor: Theme.of(context).colorScheme.surfaceVariant.withAlpha(80),
            contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: Theme.of(context).colorScheme.primary.withAlpha(120),
                width: 1.5,
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Today's sessions section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("Cours d'aujourd'hui", style: AppTextStyles.labelLarge),
            if (_searchQuery.isNotEmpty)
              Text(
                '${filteredSessions.length} trouvé(s)',
                style: AppTextStyles.caption.copyWith(color: AppColors.primary),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (filteredSessions.isEmpty)
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(
                color: Theme.of(context).colorScheme.outlineVariant.withAlpha(50),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  Icon(
                    _searchQuery.isNotEmpty ? Icons.search_off_rounded : Icons.event_busy_rounded,
                    color: AppColors.textSecondary.withAlpha(100),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _searchQuery.isNotEmpty 
                        ? 'Aucun résultat pour "$_searchQuery"' 
                        : 'Aucun cours aujourd\'hui',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          )
        else
          ...filteredSessions.map((s) => _TodaySessionCard(session: s)),
        const SizedBox(height: 24),

        // Absence summary section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Suivi des absences', style: AppTextStyles.labelLarge),
            if (_searchQuery.isNotEmpty)
              Text(
                '${filteredAbsences.length} trouvé(s)',
                style: AppTextStyles.caption.copyWith(color: AppColors.primary),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Seuil d\'alerte : 75% du maximum autorisé (Exclusion à 3 absences)',
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 12),
        if (filteredAbsences.isEmpty)
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(
                color: Theme.of(context).colorScheme.outlineVariant.withAlpha(50),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  Icon(
                    _searchQuery.isNotEmpty ? Icons.search_off_rounded : Icons.check_circle_rounded,
                    color: _searchQuery.isNotEmpty ? AppColors.textSecondary.withAlpha(100) : AppColors.success.withAlpha(150),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _searchQuery.isNotEmpty
                        ? 'Aucun résultat pour "$_searchQuery"'
                        : 'Aucune absence enregistrée',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          )
        else
          ...filteredAbsences.map(
            (a) => AbsenceProgressCard(summary: a),
          ),
        const SizedBox(height: 32),
      ],
    );
  }

  String _todayLabel() {
    final now = DateTime.now();
    const days = [
      'Dimanche', 'Lundi', 'Mardi', 'Mercredi',
      'Jeudi', 'Vendredi', 'Samedi'
    ];
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return '${days[now.weekday % 7]} ${now.day} ${months[now.month - 1]}';
  }
}

class _TodaySessionCard extends StatelessWidget {
  final StudentSession session;
  const _TodaySessionCard({required this.session});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: theme.colorScheme.outlineVariant.withAlpha(50),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.accent.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.menu_book_rounded, color: AppColors.accent, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(session.moduleName,
                      style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text('${session.formattedTime} · ${session.roomName}', style: AppTextStyles.caption),
                ],
              ),
            ),
            SessionStatusChip(status: session.status),
          ],
        ),
      ),
    );
  }
}

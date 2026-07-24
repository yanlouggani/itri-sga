import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/widgets/app_error_widget.dart';
import '../../../../shared/widgets/empty_state_widget.dart';
import '../../data/models/student_absence.dart';
import '../../providers/student_absences_provider.dart';

class StudentAbsencesPage extends ConsumerWidget {
  const StudentAbsencesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(studentAbsencesProvider);

    return Scaffold(
      body: state.isLoading && state.absences.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.absences.isEmpty
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () =>
                      ref.read(studentAbsencesProvider.notifier).load(),
                )
              : RefreshIndicator(
                  onRefresh: () =>
                      ref.read(studentAbsencesProvider.notifier).load(),
                  child: state.absences.isEmpty
                      ? ListView(
                          children: [
                            _buildHeader(context),
                            const EmptyStateWidget(
                              icon: Icons.event_busy_rounded,
                              title: 'Aucune absence',
                              message: 'Vous n\'avez aucune absence enregistrée',
                            ),
                          ],
                        )
                      : ListView(
                          padding: EdgeInsets.symmetric(
                            horizontal: context.isMobile ? 16 : 32,
                            vertical: context.isMobile ? 16 : 24,
                          ),
                          children: [
                            _buildHeader(context),
                            const SizedBox(height: 16),
                            ...state.absences.map(
                              (a) => _AbsenceTile(absence: a),
                            ),
                            if (state.isLoading)
                              const Padding(
                                padding: EdgeInsets.all(16),
                                child: Center(
                                  child: SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  ),
                                ),
                              ),
                            const SizedBox(height: 32),
                          ],
                        ),
                ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        context.isMobile ? 16 : 32,
        context.isMobile ? 16 : 24,
        context.isMobile ? 16 : 32,
        0,
      ),
      child: Text('Mes Absences', style: AppTextStyles.headingMedium),
    );
  }
}

class _AbsenceTile extends StatelessWidget {
  final StudentAbsence absence;
  const _AbsenceTile({required this.absence});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _statusColor.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(_statusIcon, color: _statusColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(absence.moduleName,
                      style: AppTextStyles.bodyMedium.copyWith(
                          fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(
                    '${absence.formattedDate} · ${absence.startTime} - ${absence.endTime}',
                    style: AppTextStyles.caption,
                  ),
                  if (absence.scanMethod != null && absence.scanMethod!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        'Scanné via ${_scanMethodLabel(absence.scanMethod!)}',
                        style: AppTextStyles.caption.copyWith(
                            color: AppColors.info, fontSize: 10),
                      ),
                    ),
                ],
              ),
            ),
            _StatusBadge(status: absence.status),
          ],
        ),
      ),
    );
  }

  Color get _statusColor {
    switch (absence.status) {
      case 'present':
        return AppColors.statusPresent;
      case 'absent':
        return AppColors.statusAbsent;
      case 'late':
        return AppColors.statusLate;
      case 'justified':
        return AppColors.statusJustified;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData get _statusIcon {
    switch (absence.status) {
      case 'present':
        return Icons.check_circle_rounded;
      case 'absent':
        return Icons.cancel_rounded;
      case 'late':
        return Icons.access_time_rounded;
      case 'justified':
        return Icons.shield_rounded;
      default:
        return Icons.help_outline_rounded;
    }
  }

  String _scanMethodLabel(String method) {
    switch (method) {
      case 'qr_session':
        return 'QR Session';
      case 'qr_student':
        return 'QR Étudiant';
      case 'manual':
        return 'Appel manuel';
      case 'import':
        return 'Import';
      default:
        return method;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: _color.withAlpha(60)),
      ),
      child: Text(
        _label,
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: _color,
        ),
      ),
    );
  }

  Color get _color {
    switch (status) {
      case 'present':
        return AppColors.statusPresent;
      case 'absent':
        return AppColors.statusAbsent;
      case 'late':
        return AppColors.statusLate;
      case 'justified':
        return AppColors.statusJustified;
      default:
        return AppColors.textSecondary;
    }
  }

  String get _label {
    switch (status) {
      case 'present':
        return 'Présent';
      case 'absent':
        return 'Absent';
      case 'late':
        return 'Retard';
      case 'justified':
        return 'Justifié';
      default:
        return '?';
    }
  }
}

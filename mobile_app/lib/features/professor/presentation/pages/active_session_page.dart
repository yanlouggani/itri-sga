import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/api/api_health_provider.dart';
import '../../../../core/location/location_provider.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/theme/text_styles.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/widgets/app_error_widget.dart';
import '../../data/models/attendance_counts.dart';
import '../../data/models/attendance_record.dart';
import '../../data/models/session_data.dart';
import '../../providers/active_session_provider.dart';
import '../widgets/live_counter_bar.dart';
import '../widgets/manual_attendance_panel.dart';
import '../widgets/qr_attendance_panel.dart';
import '../widgets/student_scan_panel.dart';

class ActiveSessionPage extends ConsumerWidget {
  final String sessionId;

  const ActiveSessionPage({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(activeSessionProvider(sessionId));

    return Scaffold(
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && !state.isInitialized
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => context.go('/professor/dashboard'),
                )
              : _SessionContent(sessionId: sessionId),
    );
  }
}

class _SessionContent extends ConsumerWidget {
  final String sessionId;

  const _SessionContent({required this.sessionId});

  void _showJoinNotification(BuildContext context, AttendanceRecord student) {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    scaffoldMessenger.clearSnackBars();
    
    scaffoldMessenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Colors.white24,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_outline_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Présence enregistrée',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${student.studentName} a rejoint la séance.',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: Colors.white.withAlpha(200),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.success,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(activeSessionProvider(sessionId));
    final isConnected = ref.watch(apiHealthProvider).value ?? true;

    ref.listen<ActiveSessionState>(
      activeSessionProvider(sessionId),
      (previous, next) {
        if (previous == null || previous.students.isEmpty) return;
        
        for (final nextStudent in next.students) {
          final isPresentOrLate = nextStudent.status == AttendanceStatus.present ||
              nextStudent.status == AttendanceStatus.late;
          if (!isPresentOrLate) continue;

          final prevStudent = previous.students.firstWhere(
            (s) => s.studentId == nextStudent.studentId,
            orElse: () => AttendanceRecord(
              id: '',
              sessionId: sessionId,
              studentId: '',
              studentName: '',
              status: AttendanceStatus.unmarked,
            ),
          );

          final wasPresentOrLate = prevStudent.status == AttendanceStatus.present ||
              prevStudent.status == AttendanceStatus.late;

          if (!wasPresentOrLate) {
            _showJoinNotification(context, nextStudent);
          }
        }
      },
    );

    return RefreshIndicator(
      onRefresh: () async {
        // Reload handled by the provider's reconnection logic
      },
      child: CustomScrollView(
        slivers: [
          // Session info header
          SliverToBoxAdapter(
            child: _SessionHeader(
              sessionId: sessionId,
              session: state.session,
            ),
          ),
          SliverToBoxAdapter(
            child: _SyncStatusBar(sessionId: sessionId),
          ),

          // Reconnection banner
          if (!isConnected)
            SliverToBoxAdapter(
              child: _ReconnectionBanner(),
            ),

          // Active session controls
          if (state.session?.isActive == true) ...[
            // Live counter bar
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: context.isMobile ? 16 : 32,
                ),
                child: LiveCounterBar(sessionId: sessionId),
              ),
            ),
            const SizedBox(height: 16).toSliver(),

            // Mode tabs
            SliverToBoxAdapter(
              child: _ModeTabs(sessionId: sessionId),
            ),
            const SizedBox(height: 16).toSliver(),

            // Attendance mode content
            SliverPadding(
              padding: EdgeInsets.symmetric(
                horizontal: context.isMobile ? 16 : 32,
                vertical: 0,
              ),
              sliver: _AttendanceModeContent(sessionId: sessionId),
            ),
          ],

          // Pre-start state
          if (state.session?.canStart == true) ...[
            SliverFillRemaining(
              child: _PreStartView(sessionId: sessionId),
            ),
          ],

          // Completed state
          if (state.session?.isCompleted == true) ...[
            SliverFillRemaining(
              child: _CompletedView(sessionId: sessionId),
            ),
          ],

          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }
}

class _SyncStatusBar extends ConsumerWidget {
  final String sessionId;

  const _SyncStatusBar({required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locationState = ref.watch(locationProvider);
    final gpsOn = locationState.currentPosition != null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: context.colorScheme.surface,
      child: Row(
        children: [
          const SizedBox(width: 16),
          _StatusDot(
            color: gpsOn ? AppColors.success : AppColors.textSecondary,
            label: 'GPS',
          ),
          const Spacer(),
          if (locationState.currentPosition != null)
            Text(
              '${locationState.currentPosition!.latitude.toStringAsFixed(4)}, '
              '${locationState.currentPosition!.longitude.toStringAsFixed(4)}',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
        ],
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  final Color color;
  final String label;

  const _StatusDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: AppTextStyles.caption),
      ],
    );
  }
}

class _SessionHeader extends ConsumerWidget {
  final String sessionId;
  final SessionData? session;

  const _SessionHeader({required this.sessionId, this.session});

  void _showCloseConfirmation(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'Clôturer la séance ?',
          style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Cette action va fermer définitivement l\'enregistrement des présences pour cette séance.',
          style: TextStyle(fontFamily: 'Inter'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler', style: TextStyle(fontFamily: 'Inter', color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context); // close confirm dialog
              
              final notifier = ref.read(activeSessionProvider(sessionId).notifier);
              final currentState = ref.read(activeSessionProvider(sessionId));
              final counts = currentState.counts;
              
              await notifier.closeSession();
              
              if (context.mounted) {
                _showCompletionDialog(context, counts);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Clôturer', style: TextStyle(fontFamily: 'Inter')),
          ),
        ],
      ),
    );
  }

  void _showCompletionDialog(BuildContext context, AttendanceCounts counts) {
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierLabel: 'Clôturé',
      transitionDuration: const Duration(milliseconds: 350),
      pageBuilder: (context, anim1, anim2) {
        return const SizedBox.shrink();
      },
      transitionBuilder: (context, anim1, anim2, child) {
        final curve = CurvedAnimation(parent: anim1, curve: Curves.easeOutBack);
        return ScaleTransition(
          scale: curve,
          child: AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 16),
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.success.withAlpha(20),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: AppColors.success,
                    size: 48,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Séance Clôturée',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Le rapport de présence a été enregistré.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.borderLight.withAlpha(30),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _StatColumn(
                        count: counts.present,
                        label: 'Présents',
                        color: AppColors.statusPresent,
                      ),
                      _StatColumn(
                        count: counts.late,
                        label: 'Retards',
                        color: AppColors.statusLate,
                      ),
                      _StatColumn(
                        count: counts.absent,
                        label: 'Absents',
                        color: AppColors.statusAbsent,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      context.go('/professor/dashboard');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text(
                      'Retour au Tableau de Bord',
                      style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (session == null) return const SizedBox.shrink();

    return Container(
      padding: EdgeInsets.only(
        left: context.isMobile ? 16 : 32,
        right: context.isMobile ? 16 : 32,
        top: 16,
        bottom: 16,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.outlineVariant.withAlpha(50),
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Back + module name
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => context.go('/professor/dashboard'),
                style: IconButton.styleFrom(
                  padding: EdgeInsets.zero,
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session!.moduleName,
                      style: AppTextStyles.headingSmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${session!.sessionType} · ${session!.groupName} · ${session!.roomName}',
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
              ),
              if (session!.isActive) ...[
                const SizedBox(width: 8),
                TextButton.icon(
                  onPressed: () => _showCloseConfirmation(context, ref),
                  icon: const Icon(Icons.stop_circle_rounded, color: AppColors.danger, size: 18),
                  label: const Text(
                    'Clôturer',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.bold,
                      color: AppColors.danger,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.danger.withAlpha(15),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),

          // Time and date
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: Row(
              children: [
                Icon(Icons.access_time_rounded,
                    size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  session!.formattedTime,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 16),
                Icon(Icons.calendar_today_rounded,
                    size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  session!.formattedDate,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final int count;
  final String label;
  final Color color;

  const _StatColumn({
    required this.count,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$count',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _ReconnectionBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: AppColors.warning.withAlpha(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.warning,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'Reconnexion en cours...',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 13,
              color: AppColors.warning,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeTabs extends ConsumerWidget {
  final String sessionId;

  const _ModeTabs({required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeMode = ref.watch(sessionActiveModeProvider(sessionId));

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: context.isMobile ? 16 : 32,
      ),
      child: SizedBox(
        height: 42,
        child: Row(
          children: [
            _ModeTab(
              icon: Icons.touch_app_rounded,
              label: 'Manuel',
              isActive: activeMode == AttendanceMode.manual,
              onTap: () {
                ref
                    .read(activeSessionProvider(sessionId).notifier)
                    .setAttendanceMode(AttendanceMode.manual);
              },
            ),
            const SizedBox(width: 8),
            _ModeTab(
              icon: Icons.qr_code_rounded,
              label: 'QR Session',
              isActive: activeMode == AttendanceMode.qr,
              onTap: () {
                ref
                    .read(activeSessionProvider(sessionId).notifier)
                    .setAttendanceMode(AttendanceMode.qr);
              },
            ),
            const SizedBox(width: 8),
            _ModeTab(
              icon: Icons.qr_code_scanner_rounded,
              label: 'Scan',
              isActive: activeMode == AttendanceMode.scan,
              onTap: () {
                ref
                    .read(activeSessionProvider(sessionId).notifier)
                    .setAttendanceMode(AttendanceMode.scan);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ModeTab extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _ModeTab({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            color: isActive
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isActive
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.outlineVariant.withAlpha(80),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: isActive
                    ? Colors.white
                    : Theme.of(context).colorScheme.onSurface.withAlpha(153),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: isActive
                      ? Colors.white
                      : Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withAlpha(153),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AttendanceModeContent extends ConsumerWidget {
  final String sessionId;

  const _AttendanceModeContent({required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeMode = ref.watch(sessionActiveModeProvider(sessionId));

    switch (activeMode) {
      case AttendanceMode.manual:
        return SliverList(
          delegate: SliverChildListDelegate([
            ManualAttendancePanel(sessionId: sessionId),
          ]),
        );
      case AttendanceMode.qr:
        return SliverList(
          delegate: SliverChildListDelegate([
            QRAttendancePanel(sessionId: sessionId),
          ]),
        );
      case AttendanceMode.scan:
        return SliverList(
          delegate: SliverChildListDelegate([
            StudentScanPanel(sessionId: sessionId),
          ]),
        );
    }
  }
}

class _GeofenceSetupButton extends ConsumerWidget {
  final String sessionId;

  const _GeofenceSetupButton({required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locationState = ref.watch(locationProvider);

    return Column(
      children: [
        if (locationState.currentPosition == null)
          OutlinedButton.icon(
            onPressed: () => ref.read(locationProvider.notifier).requestLocation(),
            icon: const Icon(Icons.my_location_rounded, size: 18),
            label: const Text('Détecter ma position'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
            ),
          )
        else
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle_rounded, size: 18, color: AppColors.success),
              const SizedBox(width: 8),
              Text('Position détectée', style: AppTextStyles.bodySmall),
            ],
          ),
      ],
    );
  }
}

class _PreStartView extends ConsumerWidget {
  final String sessionId;

  const _PreStartView({required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(activeSessionProvider(sessionId));
    final session = state.session;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.sessionActive.withAlpha(15),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(
                Icons.play_circle_outline_rounded,
                size: 44,
                color: AppColors.sessionActive,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              session?.moduleName ?? 'Séance prête',
              style: AppTextStyles.headingMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Appuyez sur Démarrer pour ouvrir la séance d\'appel',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            const SizedBox(height: 16),
            _GeofenceSetupButton(sessionId: sessionId),
            const SizedBox(height: 16),
            SizedBox(
              width: 200,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: state.isStarting
                    ? null
                    : () {
                        ref
                            .read(activeSessionProvider(sessionId).notifier)
                            .startSession();
                      },
                icon: state.isStarting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.play_arrow_rounded),
                label: Text(
                  state.isStarting ? 'Démarrage...' : 'Démarrer la séance',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.sessionActive,
                  foregroundColor: Colors.white,
                  textStyle: AppTextStyles.buttonLarge,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CompletedView extends ConsumerWidget {
  final String sessionId;

  const _CompletedView({required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(activeSessionProvider(sessionId));
    final session = state.session;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.sessionCompleted.withAlpha(15),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(
                Icons.check_circle_outline_rounded,
                size: 44,
                color: AppColors.sessionCompleted,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Séance terminée',
              style: AppTextStyles.headingMedium,
            ),
            const SizedBox(height: 8),
            Text(
              session != null
                  ? '${session.presentCount} présents · ${session.absentCount} absents · ${session.lateCount} retards'
                  : 'L\'appel est clos',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            OutlinedButton.icon(
              onPressed: () => context.go('/professor/dashboard'),
              icon: const Icon(Icons.arrow_back_rounded),
              label: const Text('Retour au tableau de bord'),
            ),
          ],
        ),
      ),
    );
  }
}

extension _SliverExt on Widget {
  Widget toSliver() => SliverToBoxAdapter(child: this);
}

import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import '../../data/models/session_data.dart';

class SessionStatusBadge extends StatelessWidget {
  final SessionStatus status;
  final double fontSize;

  const SessionStatusBadge({
    super.key,
    required this.status,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _backgroundColor.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: _backgroundColor.withAlpha(60)),
      ),
      child: Text(
        _label,
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          color: _backgroundColor,
        ),
      ),
    );
  }

  Color get _backgroundColor {
    switch (status) {
      case SessionStatus.scheduled:
        return AppColors.sessionScheduled;
      case SessionStatus.active:
        return AppColors.sessionActive;
      case SessionStatus.completed:
        return AppColors.sessionCompleted;
      case SessionStatus.cancelled:
        return AppColors.sessionCancelled;
      case SessionStatus.postponed:
        return AppColors.sessionPostponed;
    }
  }

  String get _label {
    switch (status) {
      case SessionStatus.scheduled:
        return 'Programmée';
      case SessionStatus.active:
        return 'En cours';
      case SessionStatus.completed:
        return 'Terminée';
      case SessionStatus.cancelled:
        return 'Annulée';
      case SessionStatus.postponed:
        return 'Reportée';
    }
  }
}

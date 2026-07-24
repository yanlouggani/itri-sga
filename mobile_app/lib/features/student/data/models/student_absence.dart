import 'package:equatable/equatable.dart';

class StudentAbsence extends Equatable {
  final String id;
  final String sessionId;
  final String moduleName;
  final String sessionDate;
  final String startTime;
  final String endTime;
  final String status;
  final String markedBy;
  final String? scanMethod;
  final String? justificationStatus;
  final String? justificationFile;

  const StudentAbsence({
    required this.id,
    required this.sessionId,
    this.moduleName = '',
    this.sessionDate = '',
    this.startTime = '',
    this.endTime = '',
    this.status = 'unmarked',
    this.markedBy = '',
    this.scanMethod,
    this.justificationStatus,
    this.justificationFile,
  });

  factory StudentAbsence.fromJson(Map<String, dynamic> json) {
    return StudentAbsence(
      id: json['id'] as String? ?? '',
      sessionId: json['sessionId'] as String? ?? '',
      moduleName: json['moduleName'] as String? ?? '',
      sessionDate: json['sessionDate'] as String? ?? '',
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      status: json['status'] as String? ?? 'unmarked',
      markedBy: json['markedBy'] as String? ?? '',
      scanMethod: json['scanMethod'] as String?,
      justificationStatus: json['justificationStatus'] as String?,
      justificationFile: json['justificationFile'] as String?,
    );
  }

  bool get isAbsent => status == 'absent';
  bool get isPresent => status == 'present';
  bool get isLate => status == 'late';
  bool get isJustified => status == 'justified';
  bool get canJustify => isAbsent || isLate;

  String get formattedDate {
    if (sessionDate.isEmpty) return '';
    try {
      final dt = DateTime.parse(sessionDate);
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      return '${days[dt.weekday - 1]} ${dt.day}/${dt.month}';
    } catch (_) {
      return sessionDate;
    }
  }

  @override
  List<Object?> get props => [
        id, sessionId, moduleName, sessionDate, startTime, endTime,
        status, markedBy, scanMethod, justificationStatus, justificationFile,
      ];
}

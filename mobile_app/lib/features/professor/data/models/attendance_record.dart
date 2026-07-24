import 'package:equatable/equatable.dart';

enum AttendanceStatus {
  present,
  absent,
  late,
  justified,
  excused,
  unmarked;

  static AttendanceStatus fromString(String value) {
    switch (value) {
      case 'present': return AttendanceStatus.present;
      case 'absent': return AttendanceStatus.absent;
      case 'late': return AttendanceStatus.late;
      case 'justified': return AttendanceStatus.justified;
      case 'excused': return AttendanceStatus.excused;
      default: return AttendanceStatus.unmarked;
    }
  }

  String get apiValue => name;
}

class AttendanceRecord extends Equatable {
  final String id;
  final String sessionId;
  final String studentId;
  final String studentName;
  final String studentIdentifier;
  final AttendanceStatus status;
  final String markedBy;
  final String? scanMethod;
  final int? lateMinutes;
  final bool gpsVerified;
  final DateTime? markedAt;

  const AttendanceRecord({
    required this.id,
    required this.sessionId,
    required this.studentId,
    this.studentName = '',
    this.studentIdentifier = '',
    required this.status,
    this.markedBy = '',
    this.scanMethod,
    this.lateMinutes,
    this.gpsVerified = false,
    this.markedAt,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] as String? ?? '',
      sessionId: json['sessionId'] as String? ?? '',
      studentId: json['studentId'] as String? ?? '',
      studentName: json['studentName'] as String? ?? '',
      studentIdentifier: json['studentIdentifier'] as String? ?? '',
      status: json['status'] != null
          ? AttendanceStatus.fromString(json['status'] as String)
          : AttendanceStatus.unmarked,
      markedBy: json['markedBy'] as String? ?? '',
      scanMethod: json['scanMethod'] as String?,
      lateMinutes: json['lateMinutes'] as int?,
      gpsVerified: json['gpsVerified'] as bool? ?? false,
      markedAt: json['markedAt'] != null
          ? DateTime.parse(json['markedAt'] as String)
          : null,
    );
  }

  AttendanceRecord copyWith({
    String? id,
    String? sessionId,
    String? studentId,
    String? studentName,
    String? studentIdentifier,
    AttendanceStatus? status,
    String? markedBy,
    String? scanMethod,
    int? lateMinutes,
    bool? gpsVerified,
    DateTime? markedAt,
    bool clearScanMethod = false,
  }) {
    return AttendanceRecord(
      id: id ?? this.id,
      sessionId: sessionId ?? this.sessionId,
      studentId: studentId ?? this.studentId,
      studentName: studentName ?? this.studentName,
      studentIdentifier: studentIdentifier ?? this.studentIdentifier,
      status: status ?? this.status,
      markedBy: markedBy ?? this.markedBy,
      scanMethod: clearScanMethod ? null : (scanMethod ?? this.scanMethod),
      lateMinutes: lateMinutes ?? this.lateMinutes,
      gpsVerified: gpsVerified ?? this.gpsVerified,
      markedAt: markedAt ?? this.markedAt,
    );
  }

  @override
  List<Object?> get props => [
        id, sessionId, studentId, studentName, studentIdentifier,
        status, markedBy, scanMethod, lateMinutes, gpsVerified, markedAt,
      ];
}

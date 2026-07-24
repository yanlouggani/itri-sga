import 'package:equatable/equatable.dart';

enum SessionStatus {
  scheduled,
  active,
  completed,
  cancelled,
  postponed;

  static SessionStatus fromString(String value) {
    switch (value) {
      case 'active': return SessionStatus.active;
      case 'completed': return SessionStatus.completed;
      case 'cancelled': return SessionStatus.cancelled;
      case 'postponed': return SessionStatus.postponed;
      default: return SessionStatus.scheduled;
    }
  }

  String get apiValue => name;
}

class SessionData extends Equatable {
  final String id;
  final String professorId;
  final String professorName;
  final String moduleName;
  final String groupName;
  final String roomName;
  final DateTime sessionDate;
  final String startTime;
  final String endTime;
  final SessionStatus status;
  final String sessionType;
  final String? currentQrToken;
  final int? qrTokenExpiresAt;
  final int totalStudents;
  final int presentCount;
  final int absentCount;
  final int lateCount;
  final double classroomLat;
  final double classroomLng;
  final double geofenceRadius;

  const SessionData({
    required this.id,
    required this.professorId,
    this.professorName = '',
    this.moduleName = '',
    this.groupName = '',
    this.roomName = '',
    required this.sessionDate,
    this.startTime = '',
    this.endTime = '',
    this.status = SessionStatus.scheduled,
    this.sessionType = '',
    this.currentQrToken,
    this.qrTokenExpiresAt,
    this.totalStudents = 0,
    this.presentCount = 0,
    this.absentCount = 0,
    this.lateCount = 0,
    this.classroomLat = 0,
    this.classroomLng = 0,
    this.geofenceRadius = 50,
  });

  factory SessionData.fromJson(Map<String, dynamic> json) {
    return SessionData(
      id: json['id'] as String? ?? '',
      professorId: json['professorId'] as String? ?? '',
      professorName: json['professorName'] as String? ?? '',
      moduleName: json['moduleName'] as String? ?? '',
      groupName: json['groupName'] as String? ?? '',
      roomName: json['roomName'] as String? ?? '',
      sessionDate: json['sessionDate'] is String
          ? DateTime.parse(json['sessionDate'] as String)
          : DateTime.now(),
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      status: SessionStatus.fromString(json['status'] as String? ?? 'scheduled'),
      sessionType: json['sessionType'] as String? ?? '',
      currentQrToken: json['currentQrToken'] as String?,
      qrTokenExpiresAt: json['qrTokenExpiresAt'] as int?,
      totalStudents: json['totalStudents'] as int? ?? 0,
      presentCount: json['presentCount'] as int? ?? 0,
      absentCount: json['absentCount'] as int? ?? 0,
      lateCount: json['lateCount'] as int? ?? 0,
      classroomLat: (json['classroomLat'] as num?)?.toDouble() ?? 0,
      classroomLng: (json['classroomLng'] as num?)?.toDouble() ?? 0,
      geofenceRadius: (json['geofenceRadius'] as num?)?.toDouble() ?? 50,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'professorId': professorId,
      'professorName': professorName,
      'moduleName': moduleName,
      'groupName': groupName,
      'roomName': roomName,
      'sessionDate': sessionDate.toIso8601String(),
      'startTime': startTime,
      'endTime': endTime,
      'status': status.apiValue,
      'sessionType': sessionType,
      'currentQrToken': currentQrToken,
      'qrTokenExpiresAt': qrTokenExpiresAt,
      'totalStudents': totalStudents,
      'presentCount': presentCount,
      'absentCount': absentCount,
      'lateCount': lateCount,
      'classroomLat': classroomLat,
      'classroomLng': classroomLng,
      'geofenceRadius': geofenceRadius,
    };
  }

  SessionData copyWith({
    String? id,
    String? professorId,
    String? professorName,
    String? moduleName,
    String? groupName,
    String? roomName,
    DateTime? sessionDate,
    String? startTime,
    String? endTime,
    SessionStatus? status,
    String? sessionType,
    String? currentQrToken,
    int? qrTokenExpiresAt,
    int? totalStudents,
    int? presentCount,
    int? absentCount,
    int? lateCount,
    double? classroomLat,
    double? classroomLng,
    double? geofenceRadius,
    bool clearQrToken = false,
  }) {
    return SessionData(
      id: id ?? this.id,
      professorId: professorId ?? this.professorId,
      professorName: professorName ?? this.professorName,
      moduleName: moduleName ?? this.moduleName,
      groupName: groupName ?? this.groupName,
      roomName: roomName ?? this.roomName,
      sessionDate: sessionDate ?? this.sessionDate,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      status: status ?? this.status,
      sessionType: sessionType ?? this.sessionType,
      currentQrToken: clearQrToken ? null : (currentQrToken ?? this.currentQrToken),
      qrTokenExpiresAt: clearQrToken ? null : (qrTokenExpiresAt ?? this.qrTokenExpiresAt),
      totalStudents: totalStudents ?? this.totalStudents,
      presentCount: presentCount ?? this.presentCount,
      absentCount: absentCount ?? this.absentCount,
      lateCount: lateCount ?? this.lateCount,
      classroomLat: classroomLat ?? this.classroomLat,
      classroomLng: classroomLng ?? this.classroomLng,
      geofenceRadius: geofenceRadius ?? this.geofenceRadius,
    );
  }

  String get formattedTime => '$startTime - $endTime';
  String get formattedDate {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    return '${days[sessionDate.weekday - 1]} ${sessionDate.day}/${sessionDate.month}';
  }

  bool get canStart => status == SessionStatus.scheduled;
  bool get isActive => status == SessionStatus.active;
  bool get isCompleted => status == SessionStatus.completed;
  bool get canClose => status == SessionStatus.active;
  int get totalMarked => presentCount + absentCount + lateCount;

  @override
  List<Object?> get props => [
        id, professorId, professorName, moduleName, groupName, roomName, sessionDate,
        startTime, endTime, status, sessionType, currentQrToken,
        qrTokenExpiresAt, totalStudents, presentCount, absentCount, lateCount,
        classroomLat, classroomLng, geofenceRadius,
      ];
}

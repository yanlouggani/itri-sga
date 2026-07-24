import 'package:equatable/equatable.dart';

class WeeklyScheduleEntry extends Equatable {
  final String id;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final String moduleId;
  final String moduleName;
  final String professorId;
  final String professorName;
  final String groupId;
  final String groupName;
  final String roomId;
  final String roomName;
  final String sessionType;
  final bool isActive;
  final DateTime? validFrom;
  final DateTime? validTo;

  const WeeklyScheduleEntry({
    required this.id,
    this.dayOfWeek = 0,
    this.startTime = '',
    this.endTime = '',
    this.moduleId = '',
    this.moduleName = '',
    this.professorId = '',
    this.professorName = '',
    this.groupId = '',
    this.groupName = '',
    this.roomId = '',
    this.roomName = '',
    this.sessionType = 'CM',
    this.isActive = true,
    this.validFrom,
    this.validTo,
  });

  factory WeeklyScheduleEntry.fromJson(Map<String, dynamic> json) {
    final modules = json['modules'] as Map?;
    final professors = json['professors'] as Map?;
    final groups = json['groups'] as Map?;
    final rooms = json['rooms'] as Map?;
    return WeeklyScheduleEntry(
      id: json['id'] as String? ?? '',
      dayOfWeek: json['dayOfWeek'] as int? ?? 0,
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      moduleId: json['moduleId'] as String? ?? '',
      moduleName: modules?['name'] as String? ?? '',
      professorId: json['professorId'] as String? ?? '',
      professorName: (professors != null && professors['firstName'] != null)
          ? '${professors['firstName']} ${professors['lastName']}'
          : '',
      groupId: json['groupId'] as String? ?? '',
      groupName: groups?['name'] as String? ?? '',
      roomId: json['roomId'] as String? ?? '',
      roomName: rooms?['name'] as String? ?? '',
      sessionType: json['sessionType'] as String? ?? 'CM',
      isActive: json['isActive'] as bool? ?? true,
      validFrom: json['validFrom'] != null ? DateTime.parse(json['validFrom'] as String) : null,
      validTo: json['validTo'] != null ? DateTime.parse(json['validTo'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    if (id.isNotEmpty) 'id': id,
    'dayOfWeek': dayOfWeek,
    'startTime': startTime,
    'endTime': endTime,
    'moduleId': moduleId,
    'professorId': professorId,
    'groupId': groupId,
    'roomId': roomId,
    'sessionType': sessionType,
    'isActive': isActive,
    if (validFrom != null) 'validFrom': validFrom!.toIso8601String().substring(0, 10),
    if (validTo != null) 'validTo': validTo!.toIso8601String().substring(0, 10),
  };

  String get dayLabel {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[dayOfWeek.clamp(0, 6)];
  }

  String get dayFullLabel {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[dayOfWeek.clamp(0, 6)];
  }

  @override
  List<Object?> get props => [id, dayOfWeek, startTime, endTime, moduleId, professorId, groupId, roomId, sessionType, isActive, validFrom, validTo];

  bool get isCurrentlyValid {
    final now = DateTime.now();
    if (validFrom != null && now.isBefore(validFrom!)) return false;
    if (validTo != null && now.isAfter(validTo!)) return false;
    return true;
  }
}

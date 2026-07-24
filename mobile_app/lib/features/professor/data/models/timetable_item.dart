import 'package:equatable/equatable.dart';
import 'session_data.dart';

/// Représente soit une vraie séance, soit un créneau du planning sans séance.
class TimetableItem extends Equatable {
  final String id;
  final String? sessionId;
  final String moduleName;
  final String groupName;
  final String roomName;
  final String professorId;
  final DateTime sessionDate;
  final String startTime;
  final String endTime;
  final SessionStatus? status;
  final String sessionType;
  final String source; // 'session' ou 'schedule'
  final String scheduleId; // utile si source == 'schedule'

  const TimetableItem({
    required this.id,
    this.sessionId,
    required this.moduleName,
    required this.groupName,
    required this.roomName,
    this.professorId = '',
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
    this.status,
    required this.sessionType,
    this.source = 'schedule',
    this.scheduleId = '',
  });

  factory TimetableItem.fromSession(SessionData s) {
    return TimetableItem(
      id: 'session-${s.id}',
      sessionId: s.id,
      moduleName: s.moduleName,
      groupName: s.groupName,
      roomName: s.roomName,
      professorId: s.professorId,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      sessionType: s.sessionType,
      source: 'session',
      scheduleId: '',
    );
  }

  factory TimetableItem.fromSchedule(Map<String, dynamic> sched, DateTime date) {
    final modules = sched['modules'] as Map?;
    final groups = sched['groups'] as Map?;
    final rooms = sched['rooms'] as Map?;
    return TimetableItem(
      id: 'sched-${sched['id']}',
      moduleName: modules?['name'] as String? ?? '',
      groupName: groups?['name'] as String? ?? '',
      roomName: rooms?['name'] as String? ?? '',
      professorId: sched['professorId'] as String? ?? '',
      sessionDate: date,
      startTime: sched['startTime'] as String? ?? '',
      endTime: sched['endTime'] as String? ?? '',
      sessionType: sched['sessionType'] as String? ?? 'CM',
      source: 'schedule',
      scheduleId: sched['id'] as String? ?? '',
    );
  }

  String get formattedTime => '$startTime - $endTime';

  String get formattedDate {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    return '${days[sessionDate.weekday - 1]} ${sessionDate.day}/${sessionDate.month}';
  }

  bool get isSession => source == 'session' && sessionId != null;

  bool get isPast => sessionDate.isBefore(DateTime.now()) ||
      (sessionDate.isAtSameMomentAs(DateTime.now()) && _timeToMinutes(endTime) < _nowMinutes());

  bool get isFuture => !isPast;

  static int _timeToMinutes(String t) {
    final parts = t.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }

  static int _nowMinutes() {
    final n = DateTime.now();
    return n.hour * 60 + n.minute;
  }

  @override
  List<Object?> get props => [
    id, sessionId, moduleName, groupName, roomName, sessionDate,
    startTime, endTime, status, sessionType, source, scheduleId,
  ];
}

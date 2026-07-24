import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import '../../../features/auth/data/models/user.dart';
import '../../../features/professor/data/models/session_data.dart';
import 'models/admin_dashboard_data.dart';
import 'models/professor_assignment.dart';
import 'models/university_group.dart';
import 'models/university_module.dart';
import 'models/university_room.dart';
import 'models/weekly_schedule_entry.dart';

class AdminRepository {
  final SupabaseClient _supabase;

  AdminRepository(this._supabase);

  // ── Dashboard ──

  Stream<AdminDashboardData> dashboardStream() async* {
    while (true) {
      try {
        yield await getDashboard();
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 10));
    }
  }

  Future<AdminDashboardData> getDashboard() async {
    final allUsers = await _supabase.from('users').select('id, role');
    final users = allUsers as List;
    final totalUsers = users.length;
    final totalStudents = users.where((u) => u['role'] == 'student').length;
    final totalProfessors = users.where((u) => u['role'] == 'professor').length;

    final modules = await _supabase.from('modules').select('id');
    final totalModules = (modules as List).length;

    final rooms = await _supabase.from('rooms').select('id');
    final totalRooms = (rooms as List).length;

    final groups = await _supabase.from('groups').select('id');
    final totalGroups = (groups as List).length;

    final today = DateTime.now().toIso8601String().substring(0, 10);
    final todaySessions = (await _supabase
        .from('sessions')
        .select('id, status')
        .eq('sessionDate', today)) as List;
    final totalSessionsToday = todaySessions.length;
    final activeSessionsToday = todaySessions.where((s) => s['status'] == 'active').length;

    final recent = await _supabase
        .from('sessions')
        .select('*, modules(name), groups(name), rooms(name)')
        .order('createdAt', ascending: false)
        .limit(10);

    final recentSessions = (recent as List)
        .map((e) => _mapSession(e as Map<String, dynamic>))
        .toList();

    return AdminDashboardData(
      totalUsers: totalUsers,
      totalStudents: totalStudents,
      totalProfessors: totalProfessors,
      totalModules: totalModules,
      totalRooms: totalRooms,
      totalGroups: totalGroups,
      totalSessionsToday: totalSessionsToday,
      activeSessionsToday: activeSessionsToday,
      recentSessions: recentSessions,
    );
  }

  // ── Users ──

  Future<List<AppUser>> getAllUsers() async {
    final data = await _supabase.from('users').select('*, groups(name)');
    return (data as List).map((e) {
      final map = e as Map<String, dynamic>;
      return AppUser(
        id: map['id'] as String,
        firstName: map['firstName'] as String? ?? '',
        lastName: map['lastName'] as String? ?? '',
        email: map['email'] as String? ?? '',
        role: map['role'] as String? ?? 'student',
        identifier: map['identifier'] as String?,
        isActive: map['isActive'] as bool? ?? true,
      );
    }).toList();
  }

  Future<List<AppUser>> getProfessors() async {
    final users = await getAllUsers();
    return users.where((u) => u.role == 'professor').toList();
  }

  Future<void> createUser({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
  }) async {
    final response = await _supabase.auth.signUp(
      email: email.trim(),
      password: password,
      data: {
        'firstName': firstName,
        'lastName': lastName,
        'role': role,
      },
    );
    final uid = response.user?.id;
    if (uid == null) throw Exception('Failed to create user via signUp');

    try {
      await _supabase.rpc('admin_finalize_user', params: {
        'p_uid': uid,
        'p_group_id': null,
      });
    } catch (e) {
      debugPrint('[AdminRepository] admin_finalize_user warning: $e');
    }
  }

  Future<void> updateUser(String uid, Map<String, dynamic> data) async {
    await _supabase.from('users').update(data).eq('id', uid);
  }

  Future<void> deleteUser(String uid) async {
    await _supabase.rpc('admin_delete_user', params: {'p_uid': uid});
  }

  Future<void> resetPassword(String userId, String newPassword) async {
    await _supabase.rpc('admin_reset_password', params: {
      'p_uid': userId,
      'p_new_password': newPassword,
    });
  }

  // ── Modules ──

  Stream<List<UniversityModule>> modulesStream() async* {
    while (true) {
      try {
        yield await getModules();
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 12));
    }
  }

  Future<List<UniversityModule>> getModules() async {
    final data = await _supabase.from('modules').select('*');
    return (data as List).map((e) => UniversityModule.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createModule(UniversityModule module) async {
    await _supabase.from('modules').insert(module.toJson());
  }

  Future<void> updateModule(UniversityModule module) async {
    await _supabase.from('modules').update(module.toJson()).eq('id', module.id);
  }

  Future<void> deleteModule(String id) async {
    await _supabase.from('modules').delete().eq('id', id);
  }

  // ── Rooms ──

  Stream<List<UniversityRoom>> roomsStream() async* {
    while (true) {
      try {
        yield await getRooms();
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 12));
    }
  }

  Future<List<UniversityRoom>> getRooms() async {
    final data = await _supabase.from('rooms').select('*');
    return (data as List).map((e) => UniversityRoom.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createRoom(UniversityRoom room) async {
    await _supabase.from('rooms').insert(room.toJson());
  }

  Future<void> updateRoom(UniversityRoom room) async {
    await _supabase.from('rooms').update(room.toJson()).eq('id', room.id);
  }

  Future<void> deleteRoom(String id) async {
    await _supabase.from('rooms').delete().eq('id', id);
  }

  // ── Groups ──

  Stream<List<UniversityGroup>> groupsStream() async* {
    while (true) {
      try {
        yield await getGroups();
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 12));
    }
  }

  Future<List<UniversityGroup>> getGroups() async {
    final data = await _supabase.from('groups').select('*');
    return (data as List).map((e) => UniversityGroup.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createGroup(UniversityGroup group) async {
    await _supabase.from('groups').insert(group.toJson());
  }

  Future<void> updateGroup(UniversityGroup group) async {
    await _supabase.from('groups').update(group.toJson()).eq('id', group.id);
  }

  Future<void> deleteGroup(String id) async {
    await _supabase.from('groups').delete().eq('id', id);
  }

  // ── Sessions ──

  Stream<List<SessionData>> sessionsStream() async* {
    while (true) {
      try {
        yield await getSessions();
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 10));
    }
  }

  Future<List<SessionData>> getSessions() async {
    final data = await _supabase
        .from('sessions')
        .select('*, modules(name), groups(name), rooms(name)')
        .order('sessionDate', ascending: true);
    return (data as List).map((e) => _mapSession(e as Map<String, dynamic>)).toList();
  }

  Future<String> createSession({
    required String moduleId,
    required String professorId,
    required String groupId,
    required String roomId,
    required DateTime sessionDate,
    required String startTime,
    required String endTime,
    String status = 'scheduled',
  }) async {
    final response = await _supabase.from('sessions').insert({
      'moduleId': moduleId,
      'professorId': professorId,
      'groupId': groupId,
      'roomId': roomId,
      'sessionDate': sessionDate.toIso8601String().substring(0, 10),
      'startTime': startTime,
      'endTime': endTime,
      'status': status,
    }).select('id').single();

    return response['id'] as String;
  }

  Future<void> deleteSession(String id) async {
    await _supabase.from('sessions').delete().eq('id', id);
  }

  // ── Module-Groups (junction) ──

  Future<List<String>> getModuleGroupIds(String moduleId) async {
    final data = await _supabase
        .from('module_groups')
        .select('groupId')
        .eq('moduleId', moduleId);
    return (data as List).map((e) => e['groupId'] as String).toList();
  }

  Future<void> addGroupToModule(String moduleId, String groupId) async {
    await _supabase.from('module_groups').insert({
      'moduleId': moduleId,
      'groupId': groupId,
    });
  }

  Future<void> removeGroupFromModule(String moduleId, String groupId) async {
    await _supabase
        .from('module_groups')
        .delete()
        .eq('moduleId', moduleId)
        .eq('groupId', groupId);
  }

  // ── Professor Assignments ──

  Future<List<ProfessorAssignment>> getProfessorAssignments() async {
    final data = await _supabase
        .from('professor_modules')
        .select('*, professors:users!professor_modules_professorId_fkey(firstName, lastName), modules(name)');
    return (data as List)
        .map((e) => ProfessorAssignment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ProfessorAssignment>> getProfessorAssignmentsByProfessor(String professorId) async {
    final data = await _supabase
        .from('professor_modules')
        .select('*, professors:users!professor_modules_professorId_fkey(firstName, lastName), modules(name)')
        .eq('professorId', professorId);
    return (data as List)
        .map((e) => ProfessorAssignment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> createProfessorAssignment(ProfessorAssignment assignment) async {
    await _supabase.from('professor_modules').insert(assignment.toJson());
  }

  Future<void> deleteProfessorAssignment(String professorId, String moduleId, String sessionType) async {
    await _supabase
        .from('professor_modules')
        .delete()
        .eq('professorId', professorId)
        .eq('moduleId', moduleId)
        .eq('sessionType', sessionType);
  }

  // ── Weekly Schedule ──

  Stream<List<WeeklyScheduleEntry>> weeklyScheduleStream() async* {
    while (true) {
      try {
        yield await getWeeklySchedule();
      } catch (_) {}
      await Future.delayed(const Duration(seconds: 12));
    }
  }

  Future<List<WeeklyScheduleEntry>> getWeeklySchedule() async {
    final data = await _supabase
        .from('weekly_schedule')
        .select('*, modules(name), professors:users!weekly_schedule_professorId_fkey(firstName, lastName), groups(name), rooms(name)')
        .order('dayOfWeek')
        .order('startTime');
    return (data as List)
        .map((e) => WeeklyScheduleEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<WeeklyScheduleEntry>> getWeeklyScheduleByGroup(String groupId) async {
    final data = await _supabase
        .from('weekly_schedule')
        .select('*, modules(name), professors:users!weekly_schedule_professorId_fkey(firstName, lastName), groups(name), rooms(name)')
        .eq('groupId', groupId)
        .eq('isActive', true)
        .order('dayOfWeek')
        .order('startTime');
    return (data as List)
        .map((e) => WeeklyScheduleEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<WeeklyScheduleEntry>> getWeeklyScheduleByProfessor(String professorId) async {
    final data = await _supabase
        .from('weekly_schedule')
        .select('*, modules(name), professors:users!weekly_schedule_professorId_fkey(firstName, lastName), groups(name), rooms(name)')
        .eq('professorId', professorId)
        .eq('isActive', true)
        .order('dayOfWeek')
        .order('startTime');
    return (data as List)
        .map((e) => WeeklyScheduleEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> createWeeklyScheduleEntry(WeeklyScheduleEntry entry) async {
    final payload = entry.toJson();
    if (payload['validFrom'] == null) {
      payload['validFrom'] = DateTime.now().toIso8601String().substring(0, 10);
    }
    await _supabase.from('weekly_schedule').insert(payload);
  }

  Future<void> updateWeeklyScheduleEntry({
    required String oldId,
    required WeeklyScheduleEntry newEntry,
    DateTime? validFrom,
  }) async {
    final effectiveDate = validFrom ?? DateTime.now();
    final previousDay = effectiveDate.subtract(const Duration(days: 1));

    await _supabase
        .from('weekly_schedule')
        .update({'validTo': previousDay.toIso8601String().substring(0, 10)})
        .eq('id', oldId);

    final payload = newEntry.toJson();
    payload['validFrom'] = effectiveDate.toIso8601String().substring(0, 10);
    payload.remove('id');
    await _supabase.from('weekly_schedule').insert(payload);
  }

  Future<void> deleteWeeklyScheduleEntry(String id) async {
    await _supabase.from('weekly_schedule').delete().eq('id', id);
  }

  Future<int> generateSessionsFromSchedule({
    required DateTime startDate,
    required DateTime endDate,
    List<String>? scheduleIds,
  }) async {
    final result = await _supabase.rpc('generate_sessions_from_schedule', params: {
      'p_start_date': startDate.toIso8601String().substring(0, 10),
      'p_end_date': endDate.toIso8601String().substring(0, 10),
      'p_schedule_ids': scheduleIds,
    });
    return (result as int?) ?? 0;
  }

  // ── Analytics ──

  Future<Map<String, int>> attendanceByGroup() async {
    final data = await _supabase.rpc('attendance_by_group');
    return _countMap(data);
  }

  Future<Map<String, int>> attendanceByModule() async {
    final data = await _supabase.rpc('attendance_by_module');
    return _countMap(data);
  }

  Future<Map<String, int>> busiestRooms() async {
    final data = await _supabase.rpc('busiest_rooms');
    return _countMap(data);
  }

  Future<Map<String, int>> attendanceTrendByWeek() async {
    final data = await _supabase.rpc('attendance_trend');
    return _countMap(data);
  }

  SessionData _mapSession(Map<String, dynamic> e) {
    final modules = e.remove('modules') as Map?;
    final groups = e.remove('groups') as Map?;
    final rooms = e.remove('rooms') as Map?;
    e['moduleName'] = modules?['name'] ?? '';
    e['groupName'] = groups?['name'] ?? '';
    e['roomName'] = rooms?['name'] ?? '';
    return SessionData.fromJson(e);
  }

  Map<String, int> _countMap(dynamic data) {
    if (data is List) {
      return {for (final e in data) (e['name'] ?? e['label'] ?? '') as String: (e['count'] as int?) ?? 0};
    }
    return {};
  }
}

final adminRepositoryProvider = Provider<AdminRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return AdminRepository(supabase);
});

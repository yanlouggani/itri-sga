import 'dart:async';
import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/attendance_counts.dart';
import '../data/models/attendance_record.dart';
import '../data/models/qr_token_data.dart';
import '../data/models/session_data.dart';
import '../data/professor_repository.dart';
import '../data/models/waiting_student.dart';

enum AttendanceMode { manual, qr, scan }

class ActiveSessionState {
  final SessionData? session;
  final List<AttendanceRecord> students;
  final QRTokenData? currentQrToken;
  final AttendanceCounts counts;
  final AttendanceMode activeMode;
  final bool isLoading;
  final bool isInitialized;
  final bool isStarting;
  final bool isClosing;
  final String? error;

  const ActiveSessionState({
    this.session,
    this.students = const [],
    this.currentQrToken,
    this.counts = const AttendanceCounts(),
    this.activeMode = AttendanceMode.manual,
    this.isLoading = true,
    this.isInitialized = false,
    this.isStarting = false,
    this.isClosing = false,
    this.error,
  });

  ActiveSessionState copyWith({
    SessionData? session,
    List<AttendanceRecord>? students,
    QRTokenData? currentQrToken,
    AttendanceCounts? counts,
    AttendanceMode? activeMode,
    bool? isLoading,
    bool? isInitialized,
    bool? isStarting,
    bool? isClosing,
    String? error,
    bool clearError = false,
    bool clearSession = false,
    bool clearQrToken = false,
  }) {
    return ActiveSessionState(
      session: clearSession ? null : (session ?? this.session),
      students: students ?? this.students,
      currentQrToken: clearQrToken ? null : (currentQrToken ?? this.currentQrToken),
      counts: counts ?? this.counts,
      activeMode: activeMode ?? this.activeMode,
      isLoading: isLoading ?? this.isLoading,
      isInitialized: isInitialized ?? this.isInitialized,
      isStarting: isStarting ?? this.isStarting,
      isClosing: isClosing ?? this.isClosing,
      error: clearError ? null : (error ?? this.error),
    );
  }

  List<AttendanceRecord> get presentStudents =>
      students.where((s) => s.status == AttendanceStatus.present).toList();
  List<AttendanceRecord> get absentStudents =>
      students.where((s) => s.status == AttendanceStatus.absent).toList();
  List<AttendanceRecord> get lateStudents =>
      students.where((s) => s.status == AttendanceStatus.late).toList();
  List<AttendanceRecord> get unmarkedStudents =>
      students.where((s) => s.status == AttendanceStatus.unmarked).toList();
  int get totalMarked => counts.totalMarked;
  bool get allMarked => counts.totalMarked >= counts.total;
  bool get isReconnecting => false;
  List<WaitingStudent> get waitingRoom => [];
  Set<String> get pendingUpdates => const {};
}

class ActiveSessionNotifier extends StateNotifier<ActiveSessionState> {
  final String _sessionId;
  final ProfessorRepository _repository;
  Timer? _qrTimer;
  StreamSubscription? _sessionSub;
  StreamSubscription? _attendanceSub;
  bool _disposed = false;

  ActiveSessionNotifier({
    required String sessionId,
    required ProfessorRepository repository,
  })  : _sessionId = sessionId,
        _repository = repository,
        super(const ActiveSessionState()) {
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      // Subscribe to realtime session stream
      _sessionSub = _repository.sessionStream(_sessionId).listen((session) {
        if (_disposed) return;
        state = state.copyWith(
          session: session,
          isLoading: false,
          isInitialized: true,
        );
      });

      // Subscribe to realtime attendance stream
      _attendanceSub =
          _repository.attendanceStream(_sessionId).listen((students) {
        if (_disposed) return;
        final counts = _recomputeCounts(students);
        state = state.copyWith(students: students, counts: counts);
      });

      // Start QR rotation if session is already active
      await _repository.getSession(_sessionId).then((session) {
        if (session.isActive && !_disposed) {
          _startQrRotation();
        }
      });
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to initialize session',
      );
    }
  }

  // ── Actions ──

  Future<void> startSession() async {
    if (state.isStarting) return;
    state = state.copyWith(isStarting: true, clearError: true);

    try {
      await _repository.startSession(_sessionId);
      state = state.copyWith(isStarting: false);
      _startQrRotation();
    } catch (e) {
      state = state.copyWith(isStarting: false, error: 'Failed to start session');
    }
  }

  Future<void> closeSession() async {
    if (state.isClosing) return;
    state = state.copyWith(isClosing: true, clearError: true);

    try {
      await _repository.closeSession(_sessionId);
      _stopQrRotation();
      state = state.copyWith(isClosing: false);
    } catch (e) {
      state = state.copyWith(isClosing: false, error: 'Failed to close session');
    }
  }

  Future<void> markAttendance({
    required String studentId,
    required AttendanceStatus status,
    int? lateMinutes,
  }) async {
    final statusStr = status.apiValue;

    // Optimistic update
    final updatedStudents = state.students.map((s) {
      if (s.studentId == studentId) {
        return s.copyWith(status: status, lateMinutes: lateMinutes);
      }
      return s;
    }).toList();

    final updatedCounts = _recomputeCounts(updatedStudents);
    state = state.copyWith(students: updatedStudents, counts: updatedCounts);

    try {
      await _repository.markAttendance(
        sessionId: _sessionId,
        studentId: studentId,
        status: statusStr,
        lateMinutes: lateMinutes,
      );
    } catch (_) {
      // Next poll will correct the state
    }
  }

  Future<void> bulkMarkAll(AttendanceStatus status) async {
    final attendances = state.students
        .where((s) => s.status != status)
        .map((s) => {
              'studentId': s.studentId,
              'status': status.apiValue,
            })
        .toList();

    if (attendances.isEmpty) return;

    await _repository.bulkMarkAttendance(
      sessionId: _sessionId,
      attendances: attendances,
    );
  }

  void setAttendanceMode(AttendanceMode mode) {
    state = state.copyWith(activeMode: mode);
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  Future<void> confirmWaitingStudent(String userId) async {
    await markAttendance(studentId: userId, status: AttendanceStatus.present);
  }

  Future<void> kickWaitingStudent(String userId) async {
    await markAttendance(studentId: userId, status: AttendanceStatus.absent);
  }

  // ── QR Rotation ──

  void _startQrRotation() {
    _stopQrRotation();
    _emitNextQrToken();
    _qrTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (_disposed) return;
      _emitNextQrToken();
    });
  }

  void _stopQrRotation() {
    _qrTimer?.cancel();
    _qrTimer = null;
  }

  void _emitNextQrToken() {
    final token = _generateQrToken();
    final expiresAt = DateTime.now().add(const Duration(seconds: 8));
    _repository.updateQrToken(
      _sessionId, token, expiresAt.millisecondsSinceEpoch);
    state = state.copyWith(
      currentQrToken: QRTokenData(
        sessionId: _sessionId,
        qrToken: token,
        expiresAt: expiresAt,
        receivedAt: DateTime.now(),
      ),
    );
  }

  String _generateQrToken() {
    final random = Random();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return List.generate(16, (_) => chars[random.nextInt(chars.length)]).join();
  }

  AttendanceCounts _recomputeCounts(List<AttendanceRecord> students) {
    return AttendanceCounts(
      total: state.session?.totalStudents ?? students.length,
      present: students.where((s) => s.status == AttendanceStatus.present).length,
      absent: students.where((s) => s.status == AttendanceStatus.absent).length,
      late: students.where((s) => s.status == AttendanceStatus.late).length,
    );
  }

  @override
  void dispose() {
    _disposed = true;
    _stopQrRotation();
    _sessionSub?.cancel();
    _attendanceSub?.cancel();
    super.dispose();
  }
}

// ── Providers ──

final activeSessionProvider =
    StateNotifierProvider.family<ActiveSessionNotifier, ActiveSessionState, String>(
  (ref, sessionId) {
    final repository = ref.watch(professorRepositoryProvider);
    return ActiveSessionNotifier(sessionId: sessionId, repository: repository);
  },
);

final sessionCountsProvider =
    Provider.family<AttendanceCounts, String>((ref, sessionId) {
  return ref.watch(activeSessionProvider(sessionId).select((s) => s.counts));
});

final sessionStudentsProvider =
    Provider.family<List<AttendanceRecord>, String>((ref, sessionId) {
  return ref.watch(activeSessionProvider(sessionId).select((s) => s.students));
});

final sessionQrTokenProvider =
    Provider.family<QRTokenData?, String>((ref, sessionId) {
  return ref.watch(activeSessionProvider(sessionId).select((s) => s.currentQrToken));
});

final sessionStatusProvider =
    Provider.family<SessionStatus?, String>((ref, sessionId) {
  return ref.watch(activeSessionProvider(sessionId).select((s) => s.session?.status));
});

final sessionDataProvider =
    Provider.family<SessionData?, String>((ref, sessionId) {
  return ref.watch(activeSessionProvider(sessionId).select((s) => s.session));
});

final sessionActiveModeProvider =
    Provider.family<AttendanceMode, String>((ref, sessionId) {
  return ref.watch(activeSessionProvider(sessionId).select((s) => s.activeMode));
});

final sessionWaitingRoomProvider =
    Provider.family<List<WaitingStudent>, String>((ref, sessionId) {
  return ref.watch(activeSessionProvider(sessionId).select((s) => s.waitingRoom));
});

/// Events emitted internally by ActiveSessionNotifier.
sealed class SessionEvent {
  const SessionEvent();
}

class SessionStartedEvent extends SessionEvent {
  const SessionStartedEvent();
}

class SessionClosedEvent extends SessionEvent {
  const SessionClosedEvent();
}

class NewQrTokenEvent extends SessionEvent {
  final String sessionId;
  final String qrToken;
  final DateTime expiresAt;

  const NewQrTokenEvent({
    required this.sessionId,
    required this.qrToken,
    required this.expiresAt,
  });
}

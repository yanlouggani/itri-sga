import 'package:equatable/equatable.dart';

class QRTokenData extends Equatable {
  final String sessionId;
  final String qrToken;
  final DateTime expiresAt;
  final DateTime receivedAt;

  const QRTokenData({
    required this.sessionId,
    required this.qrToken,
    required this.expiresAt,
    required this.receivedAt,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  Duration get remaining => expiresAt.difference(DateTime.now());
  double get remainingFraction {
    final totalLifetime = const Duration(seconds: 8);
    final elapsed = DateTime.now().difference(receivedAt);
    final fraction = elapsed.inMilliseconds / totalLifetime.inMilliseconds;
    return (1.0 - fraction).clamp(0.0, 1.0);
  }

  @override
  List<Object?> get props => [sessionId, qrToken, expiresAt, receivedAt];
}

import 'package:equatable/equatable.dart';

class WaitingStudent extends Equatable {
  final String userId;
  final String firstName;
  final String lastName;
  final DateTime joinedAt;

  const WaitingStudent({
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.joinedAt,
  });

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'.toUpperCase();

  @override
  List<Object?> get props => [userId, firstName, lastName, joinedAt];
}

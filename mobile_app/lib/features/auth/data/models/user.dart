import 'package:equatable/equatable.dart';

class AppUser extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String role;
  final String? identifier;
  final bool isActive;

  const AppUser({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
    this.identifier,
    this.isActive = true,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'student',
      identifier: json['identifier'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'role': role,
      'identifier': identifier,
      'isActive': isActive,
    };
  }

  AppUser copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? email,
    String? role,
    String? identifier,
    bool? isActive,
  }) {
    return AppUser(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      role: role ?? this.role,
      identifier: identifier ?? this.identifier,
      isActive: isActive ?? this.isActive,
    );
  }

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'.toUpperCase();

  bool get isAdmin => role == 'admin';
  bool get isProfessor => role == 'professor';
  bool get isStudent => role == 'student';

  @override
  List<Object?> get props => [id, firstName, lastName, email, role, identifier, isActive];
}

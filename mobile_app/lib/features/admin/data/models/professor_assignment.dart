import 'package:equatable/equatable.dart';

class ProfessorAssignment extends Equatable {
  final String professorId;
  final String professorName;
  final String moduleId;
  final String moduleName;
  final String sessionType;

  const ProfessorAssignment({
    required this.professorId,
    this.professorName = '',
    required this.moduleId,
    this.moduleName = '',
    this.sessionType = 'CM',
  });

  factory ProfessorAssignment.fromJson(Map<String, dynamic> json) {
    final professor = json['professors'] as Map?;
    final module = json['modules'] as Map?;
    return ProfessorAssignment(
      professorId: json['professorId'] as String? ?? '',
      professorName: (professor != null && professor['firstName'] != null)
          ? '${professor['firstName']} ${professor['lastName']}'
          : '',
      moduleId: json['moduleId'] as String? ?? '',
      moduleName: module?['name'] as String? ?? '',
      sessionType: json['sessionType'] as String? ?? 'CM',
    );
  }

  Map<String, dynamic> toJson() => {
    'professorId': professorId,
    'moduleId': moduleId,
    'sessionType': sessionType,
  };

  @override
  List<Object?> get props => [professorId, moduleId, sessionType];
}

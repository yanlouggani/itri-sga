import 'package:equatable/equatable.dart';

class UniversityGroup extends Equatable {
  final String id;
  final String name;
  final String moduleName;
  final String levelName;
  final int studentCount;
  final bool isActive;

  const UniversityGroup({
    required this.id,
    this.name = '',
    this.moduleName = '',
    this.levelName = '',
    this.studentCount = 0,
    this.isActive = true,
  });

  factory UniversityGroup.fromJson(Map<String, dynamic> json) {
    return UniversityGroup(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      moduleName: json['moduleName'] as String? ?? '',
      levelName: json['levelName'] as String? ?? '',
      studentCount: json['studentCount'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'moduleName': moduleName,
      'levelName': levelName,
      'studentCount': studentCount,
      'isActive': isActive,
    };
  }

  UniversityGroup copyWith({
    String? id,
    String? name,
    String? moduleName,
    String? levelName,
    int? studentCount,
    bool? isActive,
  }) {
    return UniversityGroup(
      id: id ?? this.id,
      name: name ?? this.name,
      moduleName: moduleName ?? this.moduleName,
      levelName: levelName ?? this.levelName,
      studentCount: studentCount ?? this.studentCount,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  List<Object?> get props => [id, name, moduleName, levelName, studentCount, isActive];
}

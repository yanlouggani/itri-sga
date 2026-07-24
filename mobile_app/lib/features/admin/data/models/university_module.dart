import 'package:equatable/equatable.dart';

class UniversityModule extends Equatable {
  final String id;
  final String name;
  final String domainId;
  final bool isActive;

  const UniversityModule({
    required this.id,
    this.name = '',
    this.domainId = '',
    this.isActive = true,
  });

  factory UniversityModule.fromJson(Map<String, dynamic> json) {
    return UniversityModule(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      domainId: json['domainId'] as String? ?? '',
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id.isNotEmpty) 'id': id,
      'name': name,
      'domainId': domainId,
      'isActive': isActive,
    };
  }

  UniversityModule copyWith({
    String? id,
    String? name,
    String? domainId,
    bool? isActive,
  }) {
    return UniversityModule(
      id: id ?? this.id,
      name: name ?? this.name,
      domainId: domainId ?? this.domainId,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  List<Object?> get props => [id, name, domainId, isActive];
}

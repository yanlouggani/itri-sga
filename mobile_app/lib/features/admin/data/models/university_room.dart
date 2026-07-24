import 'package:equatable/equatable.dart';

class UniversityRoom extends Equatable {
  final String id;
  final String name;
  final String code;
  final int capacity;
  final String building;
  final int floor;
  final bool hasProjector;
  final bool hasComputers;
  final bool isActive;

  const UniversityRoom({
    required this.id,
    this.name = '',
    this.code = '',
    this.capacity = 0,
    this.building = '',
    this.floor = 0,
    this.hasProjector = false,
    this.hasComputers = false,
    this.isActive = true,
  });

  factory UniversityRoom.fromJson(Map<String, dynamic> json) {
    return UniversityRoom(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      code: json['code'] as String? ?? '',
      capacity: json['capacity'] as int? ?? 0,
      building: json['building'] as String? ?? '',
      floor: json['floor'] as int? ?? 0,
      hasProjector: json['hasProjector'] as bool? ?? false,
      hasComputers: json['hasComputers'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'code': code,
      'capacity': capacity,
      'building': building,
      'floor': floor,
      'hasProjector': hasProjector,
      'hasComputers': hasComputers,
      'isActive': isActive,
    };
  }

  UniversityRoom copyWith({
    String? id,
    String? name,
    String? code,
    int? capacity,
    String? building,
    int? floor,
    bool? hasProjector,
    bool? hasComputers,
    bool? isActive,
  }) {
    return UniversityRoom(
      id: id ?? this.id,
      name: name ?? this.name,
      code: code ?? this.code,
      capacity: capacity ?? this.capacity,
      building: building ?? this.building,
      floor: floor ?? this.floor,
      hasProjector: hasProjector ?? this.hasProjector,
      hasComputers: hasComputers ?? this.hasComputers,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  List<Object?> get props =>
      [id, name, code, capacity, building, floor, hasProjector, hasComputers, isActive];
}

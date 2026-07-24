import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

enum GpsStatus { allowed, denied, disabled, unknown }

class GeofencingState {
  final GpsStatus status;
  final double? latitude;
  final double? longitude;
  final bool insideZone;
  final double distanceMeters;
  final String? error;

  const GeofencingState({
    this.status = GpsStatus.unknown,
    this.latitude,
    this.longitude,
    this.insideZone = false,
    this.distanceMeters = 0,
    this.error,
  });

  GeofencingState copyWith({
    GpsStatus? status,
    double? latitude,
    double? longitude,
    bool? insideZone,
    double? distanceMeters,
    String? error,
    bool clearError = false,
  }) {
    return GeofencingState(
      status: status ?? this.status,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      insideZone: insideZone ?? this.insideZone,
      distanceMeters: distanceMeters ?? this.distanceMeters,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class GeofencingService {
  Future<GpsStatus> checkPermission() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return GpsStatus.disabled;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      return GpsStatus.denied;
    }
    if (permission == LocationPermission.deniedForever) {
      return GpsStatus.denied;
    }
    return GpsStatus.allowed;
  }

  Future<GeofencingState> checkLocation({
    required double targetLat,
    required double targetLng,
    double radiusMeters = 50,
  }) async {
    final gpsStatus = await checkPermission();
    if (gpsStatus != GpsStatus.allowed) {
      return GeofencingState(status: gpsStatus);
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      );

      final distance = Geolocator.distanceBetween(
        targetLat,
        targetLng,
        position.latitude,
        position.longitude,
      );

      return GeofencingState(
        status: GpsStatus.allowed,
        latitude: position.latitude,
        longitude: position.longitude,
        insideZone: distance <= radiusMeters,
        distanceMeters: distance,
      );
    } catch (e) {
      return GeofencingState(
        status: GpsStatus.allowed,
        error: 'Failed to get location: $e',
      );
    }
  }
}

final geofencingServiceProvider = Provider<GeofencingService>((ref) {
  return GeofencingService();
});

class AdminDataState<T> {
  final List<T> data;
  final bool isLoading;
  final String? error;

  const AdminDataState({
    this.data = const [],
    this.isLoading = true,
    this.error,
  });

  AdminDataState<T> copyWith({
    List<T>? data,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return AdminDataState<T>(
      data: data ?? this.data,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

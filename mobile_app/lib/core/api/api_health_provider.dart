import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../supabase/supabase_client_provider.dart';

final apiHealthProvider = StreamProvider<bool>((ref) async* {
  final supabase = ref.watch(supabaseClientProvider);
  yield await _ping(supabase);

  yield* Stream.periodic(const Duration(seconds: 10)).asyncMap((_) => _ping(supabase));
});

Future<bool> _ping(supabase) async {
  try {
    await supabase.from('groups').select('id').limit(1);
    return true;
  } catch (_) {
    return false;
  }
}

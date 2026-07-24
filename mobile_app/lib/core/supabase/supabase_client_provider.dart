import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const String kSupabaseUrl = 'https://flllhvfjdfzlpmhywilt.supabase.co';
const String kSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsbGxodmZqZGZ6bHBtaHl3aWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODMyMTMsImV4cCI6MjA5Njg1OTIxM30.AmxpbLIw5FJMnu7QkGTujywgjVgh66ctJPOb9nzhVs8';

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

final supabaseSessionProvider = Provider<Session?>((ref) {
  return ref.watch(supabaseClientProvider).auth.currentSession;
});

final supabaseAuthStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(supabaseClientProvider).auth.onAuthStateChange.map(
    (event) => event.session?.user,
  );
});

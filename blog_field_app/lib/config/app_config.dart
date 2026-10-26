class AppConfig {
  static String supabaseUrl = "";
  static String supabaseAnonKey = "";

  static void load(Map<String, String> env) {
    String read(String key, String fallback) {
      final direct = env[key]?.trim() ?? "";
      if (direct.isNotEmpty) return direct;
      return env[fallback]?.trim() ?? "";
    }

    supabaseUrl = read("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
    supabaseAnonKey = read("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}

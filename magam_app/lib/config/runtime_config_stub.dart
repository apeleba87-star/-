class MagamRuntimeValues {
  const MagamRuntimeValues({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    this.shareBaseUrl,
  });

  final String supabaseUrl;
  final String supabaseAnonKey;
  final String? shareBaseUrl;
}

MagamRuntimeValues? readMagamRuntimeConfig() => null;

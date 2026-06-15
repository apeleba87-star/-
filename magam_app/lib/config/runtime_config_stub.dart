class MagamRuntimeValues {
  const MagamRuntimeValues({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    this.shareBaseUrl,
    this.oauthRedirectUrl,
  });

  final String supabaseUrl;
  final String supabaseAnonKey;
  final String? shareBaseUrl;
  final String? oauthRedirectUrl;
}

MagamRuntimeValues? readMagamRuntimeConfig() => null;

import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static String _fromDotenv(String key) {
    if (!dotenv.isInitialized) return '';
    return dotenv.env[key] ?? '';
  }

  static String get supabaseUrl {
    const fromDefine = String.fromEnvironment('SUPABASE_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    final direct = _fromDotenv('SUPABASE_URL');
    if (direct.isNotEmpty) return direct;
    // Next.js .env.local 복사 시 (NEXT_PUBLIC_ 접두사)
    return _fromDotenv('NEXT_PUBLIC_SUPABASE_URL');
  }

  static String get supabaseAnonKey {
    const fromDefine = String.fromEnvironment('SUPABASE_ANON_KEY');
    if (fromDefine.isNotEmpty) return fromDefine;
    final direct = _fromDotenv('SUPABASE_ANON_KEY');
    if (direct.isNotEmpty) return direct;
    return _fromDotenv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  static String get shareBaseUrl {
    const fromDefine = String.fromEnvironment('MAGAM_SHARE_BASE_URL');
    if (fromDefine.isNotEmpty) {
      return normalizeShareBaseUrl(fromDefine);
    }
    final fromEnv = _fromDotenv('MAGAM_SHARE_BASE_URL');
    if (fromEnv.isNotEmpty) {
      return normalizeShareBaseUrl(fromEnv);
    }
    return 'https://cleanidex.co.kr';
  }

  /// 등록되지 않은 cleanidex.com → cleanidex.co.kr (DNS NXDOMAIN 방지)
  static String normalizeShareBaseUrl(String raw) {
    final trimmed = raw.trim().replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.host == 'cleanidex.com') {
      return 'https://cleanidex.co.kr';
    }
    return trimmed;
  }

  static String shareUrl(String slug) =>
      '${normalizeShareBaseUrl(shareBaseUrl)}/p/$slug';

  /// 로컬 웹 개발 고정 포트 (run_web.ps1 / --web-port 와 동일)
  static const int webDevPort = 54222;

  static String get webDevOrigin => 'http://localhost:$webDevPort/';

  /// 카카오 OAuth redirectTo. 미설정 시 웹은 [webDevOrigin] 사용.
  static String? get oauthRedirectUrl {
    const fromDefine = String.fromEnvironment('MAGAM_OAUTH_REDIRECT_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    final fromEnv = _fromDotenv('MAGAM_OAUTH_REDIRECT_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    return null;
  }

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// Supabase Dashboard → Auth → URL Configuration
  static String? get supabaseAuthUrlConfigLink {
    if (supabaseUrl.isEmpty) return null;
    try {
      final host = Uri.parse(supabaseUrl).host;
      final ref = host.split('.').first;
      if (ref.isEmpty) return null;
      return 'https://supabase.com/dashboard/project/$ref/auth/url-configuration';
    } catch (_) {
      return null;
    }
  }
}

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'runtime_config.dart';

class AppConfig {
  static MagamRuntimeValues? _runtime;

  static void useRuntimeConfig(MagamRuntimeValues? values) {
    _runtime = values;
  }

  static String _fromDotenv(String key) {
    if (!dotenv.isInitialized) return '';
    return dotenv.env[key] ?? '';
  }

  static String get supabaseUrl {
    final runtime = _runtime?.supabaseUrl;
    if (runtime != null && runtime.isNotEmpty) return runtime;
    const fromDefine = String.fromEnvironment('SUPABASE_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    final direct = _fromDotenv('SUPABASE_URL');
    if (direct.isNotEmpty) return direct;
    // Next.js .env.local 복사 시 (NEXT_PUBLIC_ 접두사)
    return _fromDotenv('NEXT_PUBLIC_SUPABASE_URL');
  }

  static String get supabaseAnonKey {
    final runtime = _runtime?.supabaseAnonKey;
    if (runtime != null && runtime.isNotEmpty) return runtime;
    const fromDefine = String.fromEnvironment('SUPABASE_ANON_KEY');
    if (fromDefine.isNotEmpty) return fromDefine;
    final direct = _fromDotenv('SUPABASE_ANON_KEY');
    if (direct.isNotEmpty) return direct;
    return _fromDotenv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  static String get shareBaseUrl {
    final runtimeShare = _runtime?.shareBaseUrl;
    if (runtimeShare != null && runtimeShare.isNotEmpty) {
      return normalizeShareBaseUrl(runtimeShare);
    }
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

  /// 카카오 OAuth redirectTo. 웹 전용 — 네이티브(APK)는 [AuthRedirect.androidCallback].
  static String? get oauthRedirectUrl {
    if (!kIsWeb) return null;

    const fromDefine = String.fromEnvironment('MAGAM_OAUTH_REDIRECT_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    final fromEnv = _fromDotenv('MAGAM_OAUTH_REDIRECT_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    return null;
  }

  /// 프로덕션 PWA 경로 (cleanidex.co.kr/magam/app/)
  static String get webAppOrigin {
    const fromDefine = String.fromEnvironment('MAGAM_WEB_APP_PATH');
    final path = fromDefine.isNotEmpty ? fromDefine : '/magam/app';
    final normalized = path.startsWith('/') ? path : '/$path';
    return '${normalizeShareBaseUrl(shareBaseUrl)}$normalized/';
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

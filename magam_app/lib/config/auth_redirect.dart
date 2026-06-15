import 'package:flutter/foundation.dart' show kIsWeb;

import 'app_config.dart';

/// Supabase OAuth 콜백 URL — 웹(마감앱) / Android 딥링크
class AuthRedirect {
  /// Android: Supabase Redirect URLs + AndroidManifest intent-filter 와 일치
  static const androidCallback = 'io.supabase.magamapp://login-callback/';

  /// 카카오 OAuth 후 돌아올 URL. Supabase Dashboard Redirect URLs 와 **정확히** 일치해야 함.
  static String get oauthRedirect {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host == 'localhost' || host == '127.0.0.1') {
        final override = AppConfig.oauthRedirectUrl;
        if (override != null && override.isNotEmpty) return override;
        return AppConfig.webDevOrigin;
      }
      // 프로덕션: 현재 접속 주소 기준 (www / non-www · 모바일 인앱 브라우저)
      final uri = Uri.base;
      final path = uri.path.endsWith('/') ? uri.path : '${uri.path}/';
      return '${uri.scheme}://${uri.authority}$path';
    }
    return androidCallback;
  }

  static String signupUrl(String siteBase) => '$siteBase/signup?from=magam';
}

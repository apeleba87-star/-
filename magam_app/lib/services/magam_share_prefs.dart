import 'package:shared_preferences/shared_preferences.dart';

class MagamSharePrefs {
  static const _includePhoneKey = 'magam_kakao_share_include_phone_v1';
  static const _betaBannerKey = 'magam_web_beta_banner_dismissed_v1';

  static Future<bool> loadIncludePhoneInKakao() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_includePhoneKey) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> saveIncludePhoneInKakao(bool value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_includePhoneKey, value);
    } catch (_) {
      // 무시
    }
  }

  static Future<bool> isBetaBannerDismissed() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_betaBannerKey) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> dismissBetaBanner() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_betaBannerKey, true);
    } catch (_) {
      // 무시
    }
  }
}

import '../config/app_config.dart';
import '../constants/magam_copy.dart';

class MagamViralCopy {
  static String webAppUrl() => AppConfig.webAppOrigin;

  static String buildIntroCopy() {
    return [
      '구인·도급 올릴 때 $magamAppName 씁니다.',
      magamAppTagline,
      '',
      '▶ ${webAppUrl()}',
      '',
      magamIntroStoreNotice,
    ].join('\n');
  }

  static String buildIntroAfterCloseCopy() {
    return [
      magamIntroAfterCloseLead,
      '',
      buildIntroCopy(),
    ].join('\n');
  }
}

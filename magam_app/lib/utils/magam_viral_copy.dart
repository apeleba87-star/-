import '../config/app_config.dart';
import '../constants/magam_copy.dart';

class MagamViralCopy {
  static String webAppUrl() => AppConfig.webAppOrigin;

  static String buildIntroCopy() {
    return [
      '$magamAppName — $magamAppTagline',
      for (final line in magamAppHighlights) '· $line',
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

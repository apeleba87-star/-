import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/magam_listing.dart';
import '../utils/magam_share_format.dart';

enum KakaoShareOutcome {
  openedKakaoTalk,
  copiedForPaste,
  failed,
}

class MagamKakaoShare {
  static String buildShareText({
    required MagamListing listing,
    required String url,
    bool includePhone = false,
  }) {
    return MagamShareFormat.buildShareMessage(
      listing: listing,
      url: url,
      includePhone: includePhone,
    );
  }

  /// 카카오톡 채팅방 선택 화면으로 공유 (kakaotalk://send)
  static Future<KakaoShareOutcome> shareToKakaoTalk(String text) async {
    final encoded = Uri.encodeComponent(text);

    final targets = <Uri>[
      Uri.parse(
        'intent://send?text=$encoded#Intent;scheme=kakaotalk;package=com.kakao.talk;end',
      ),
      Uri.parse('kakaotalk://send?text=$encoded'),
      Uri.parse('kakaolink://send?text=$encoded'),
    ];

    for (final uri in targets) {
      try {
        if (await canLaunchUrl(uri)) {
          final ok = await launchUrl(
            uri,
            mode: LaunchMode.externalApplication,
          );
          if (ok) return KakaoShareOutcome.openedKakaoTalk;
        }
      } catch (_) {
        continue;
      }
    }

    if (kIsWeb) {
      await Clipboard.setData(ClipboardData(text: text));
      return KakaoShareOutcome.copiedForPaste;
    }

    return KakaoShareOutcome.failed;
  }

  static String snackbarMessage(KakaoShareOutcome outcome) {
    switch (outcome) {
      case KakaoShareOutcome.openedKakaoTalk:
        return '카카오톡에서 공유할 채팅방을 선택하세요.';
      case KakaoShareOutcome.copiedForPaste:
        return 'PC에서는 카카오톡 앱이 없어요. 내용이 복사됐으니 카톡에 붙여넣으세요.';
      case KakaoShareOutcome.failed:
        return '카카오톡을 열 수 없습니다. 링크 복사 후 카톡에 붙여넣어 주세요.';
    }
  }
}

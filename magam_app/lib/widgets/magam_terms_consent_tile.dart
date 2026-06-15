import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../constants/magam_copy.dart';
import '../theme/magam_theme.dart';

/// UGC — 글 등록 전 이용약관 동의 (Play UGC 정책)
class MagamTermsConsentTile extends StatelessWidget {
  const MagamTermsConsentTile({
    super.key,
    required this.checked,
    required this.onChanged,
    this.enabled = true,
  });

  final bool checked;
  final ValueChanged<bool> onChanged;
  final bool enabled;

  Future<void> _openTerms() async {
    final uri = Uri.parse('${AppConfig.shareBaseUrl}/terms');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: MagamColors.surface,
        border: Border.all(color: MagamColors.border),
        borderRadius: BorderRadius.circular(MagamColors.radiusLg),
      ),
      child: CheckboxListTile(
        value: checked,
        onChanged: enabled ? (v) => onChanged(v ?? false) : null,
        controlAffinity: ListTileControlAffinity.leading,
        contentPadding: const EdgeInsets.symmetric(horizontal: 8),
        title: RichText(
          text: TextSpan(
            style: Theme.of(context).textTheme.bodyMedium,
            children: [
              TextSpan(
                text: magamTermsConsentPrefix,
                recognizer: TapGestureRecognizer()..onTap = enabled ? _openTerms : null,
                style: const TextStyle(
                  decoration: TextDecoration.underline,
                  color: MagamColors.accent,
                  fontWeight: FontWeight.w600,
                ),
              ),
              TextSpan(text: magamTermsConsentSuffix),
            ],
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            magamTermsConsentHint,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      ),
    );
  }
}

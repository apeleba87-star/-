import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../constants/magam_copy.dart';
import '../utils/magam_viral_copy.dart';

enum MagamReferralVariant { intro, afterClose }

class MagamReferralCopyButton extends StatelessWidget {
  const MagamReferralCopyButton({
    super.key,
    this.variant = MagamReferralVariant.intro,
  });

  final MagamReferralVariant variant;

  String get _label => variant == MagamReferralVariant.afterClose
      ? magamReferralCopyAfterCloseLabel
      : magamReferralCopyLabel;

  String get _text => variant == MagamReferralVariant.afterClose
      ? MagamViralCopy.buildIntroAfterCloseCopy()
      : MagamViralCopy.buildIntroCopy();

  Future<void> _copy(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: _text));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(magamReferralCopyDone),
        duration: Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () => _copy(context),
      icon: const Icon(Icons.campaign_outlined, size: 20),
      label: Text(_label),
    );
  }
}

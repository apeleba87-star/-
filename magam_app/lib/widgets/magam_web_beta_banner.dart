import 'package:flutter/material.dart';

import '../constants/magam_copy.dart';
import '../services/magam_share_prefs.dart';
import '../theme/magam_theme.dart';
import 'magam_install_guide_dialog.dart';

class MagamWebBetaBanner extends StatefulWidget {
  const MagamWebBetaBanner({super.key});

  @override
  State<MagamWebBetaBanner> createState() => _MagamWebBetaBannerState();
}

class _MagamWebBetaBannerState extends State<MagamWebBetaBanner> {
  bool _visible = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final dismissed = await MagamSharePrefs.isBetaBannerDismissed();
    if (!mounted) return;
    setState(() {
      _visible = !dismissed;
      _loading = false;
    });
  }

  Future<void> _dismiss() async {
    await MagamSharePrefs.dismissBetaBanner();
    if (!mounted) return;
    setState(() => _visible = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || !_visible) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: MagamColors.accentSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      magamWebBetaTitle,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      magamWebBetaBody,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                onPressed: _dismiss,
                icon: const Icon(Icons.close_rounded, size: 18),
                tooltip: '닫기',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => MagamInstallGuideDialog.show(context),
              child: const Text(magamInstallGuideTitle),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../constants/magam_copy.dart';
import '../../theme/magam_theme.dart';

/// 체크 없이는 [onChanged](false) — 글 등록 불가.
/// [expanded]는 「연동 모집 노출 동의」 라벨 탭으로만 펼침.
class MagamSyncConsentTile extends StatefulWidget {
  const MagamSyncConsentTile({
    super.key,
    required this.checked,
    required this.onChanged,
    this.enabled = true,
  });

  final bool checked;
  final ValueChanged<bool> onChanged;
  final bool enabled;

  @override
  State<MagamSyncConsentTile> createState() => _MagamSyncConsentTileState();
}

class _MagamSyncConsentTileState extends State<MagamSyncConsentTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: MagamColors.surface,
        border: Border.all(color: MagamColors.border),
        borderRadius: BorderRadius.circular(MagamColors.radiusLg),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CheckboxListTile(
            value: widget.checked,
            onChanged: widget.enabled
                ? (v) => widget.onChanged(v ?? false)
                : null,
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
            title: InkWell(
              onTap: widget.enabled
                  ? () => setState(() => _expanded = !_expanded)
                  : null,
              borderRadius: BorderRadius.circular(8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      magamSyncConsentTitle,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: MagamColors.inkFaint,
                  ),
                ],
              ),
            ),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: magamSyncConsentDetails
                    .map(
                      (line) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          '· $line',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}

/// 프로필에 이미 1회 동의한 경우
class MagamSyncConsentGrantedBanner extends StatelessWidget {
  const MagamSyncConsentGrantedBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        border: Border.all(color: MagamColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.verified_outlined, size: 20, color: MagamColors.inkMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              magamSyncConsentAlreadyGranted,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

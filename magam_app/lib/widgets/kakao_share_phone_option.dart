import 'package:flutter/material.dart';

import '../constants/magam_copy.dart';
import '../theme/magam_theme.dart';

/// 카톡 공유 시 연락처 포함 옵션
class KakaoSharePhoneOption extends StatelessWidget {
  const KakaoSharePhoneOption({
    super.key,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: value ? MagamColors.accentSoft : MagamColors.surface,
      borderRadius: BorderRadius.circular(MagamColors.radiusMd),
      child: InkWell(
        onTap: enabled && onChanged != null ? () => onChanged!(!value) : null,
        borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 14, 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(MagamColors.radiusMd),
            border: Border.all(
              color: value ? MagamColors.accent : MagamColors.ink,
              width: value ? 2 : 1.5,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 28,
                height: 28,
                child: Checkbox(
                  value: value,
                  onChanged: enabled ? (v) => onChanged?.call(v ?? false) : null,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                  side: WidgetStateBorderSide.resolveWith((states) {
                    if (states.contains(WidgetState.selected)) {
                      return const BorderSide(color: MagamColors.accent, width: 2);
                    }
                    return const BorderSide(color: MagamColors.ink, width: 2);
                  }),
                  fillColor: WidgetStateProperty.resolveWith((states) {
                    if (states.contains(WidgetState.selected)) {
                      return MagamColors.accent;
                    }
                    return MagamColors.surface;
                  }),
                  checkColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      magamKakaoShareIncludePhone,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: MagamColors.ink,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      magamKakaoShareIncludePhoneHint,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: MagamColors.inkMuted,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../theme/magam_theme.dart';

/// 연락처 바로 아래 — 눈에 띄는 마감 CTA
class MagamCloseListingButton extends StatelessWidget {
  const MagamCloseListingButton({
    super.key,
    required this.onPressed,
    this.loading = false,
  });

  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;

    return Material(
      color: MagamColors.dangerSoft,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(MagamColors.radiusLg),
        side: BorderSide(
          color: disabled
              ? MagamColors.border
              : MagamColors.danger.withValues(alpha: 0.35),
          width: 1.5,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: disabled ? null : onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (loading)
                const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                )
              else
                Icon(
                  Icons.lock_outline_rounded,
                  size: 22,
                  color: disabled ? MagamColors.inkFaint : MagamColors.danger,
                ),
              const SizedBox(width: 10),
              Text(
                loading ? '마감 중…' : '모집 마감하기',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: disabled ? MagamColors.inkFaint : MagamColors.danger,
                      letterSpacing: -0.2,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../constants/magam_copy.dart';

/// 네이버 카페 붙여넣기용 복사 버튼
class NaverCafeCopyButton extends StatelessWidget {
  const NaverCafeCopyButton({
    super.key,
    required this.onPressed,
    this.loading = false,
  });

  final VoidCallback? onPressed;
  final bool loading;

  static const _naverGreen = Color(0xFF03C75A);
  static const _naverText = Color(0xFFFFFFFF);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton.icon(
        onPressed: loading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: _naverGreen,
          foregroundColor: _naverText,
          disabledBackgroundColor: _naverGreen.withValues(alpha: 0.5),
          disabledForegroundColor: _naverText.withValues(alpha: 0.7),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        icon: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: _naverText,
                ),
              )
            : const Icon(Icons.content_copy_rounded, size: 20),
        label: Text(
          loading ? '복사 중…' : magamNaverCafeCopyLabel,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

/// 카카오톡 단톡방 공유 버튼
class KakaoShareButton extends StatelessWidget {
  const KakaoShareButton({
    super.key,
    required this.onPressed,
    this.loading = false,
    this.compact = false,
  });

  final VoidCallback? onPressed;
  final bool loading;
  final bool compact;

  static const _kakaoYellow = Color(0xFFFEE500);
  static const _kakaoText = Color(0xFF191919);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: compact ? 48 : 52,
      child: FilledButton.icon(
        onPressed: loading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: _kakaoYellow,
          foregroundColor: _kakaoText,
          disabledBackgroundColor: _kakaoYellow.withValues(alpha: 0.5),
          disabledForegroundColor: _kakaoText.withValues(alpha: 0.5),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        icon: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: _kakaoText),
              )
            : const Icon(Icons.chat_bubble_outline_rounded, size: 20),
        label: Text(
          loading ? '카카오톡 여는 중…' : '카톡 단톡방 공유',
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

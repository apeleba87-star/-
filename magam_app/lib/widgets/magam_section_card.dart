import 'package:flutter/material.dart';

import '../theme/magam_theme.dart';

/// 글쓰기 등 폼 섹션 카드
class MagamSectionCard extends StatelessWidget {
  const MagamSectionCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: padding,
      decoration: BoxDecoration(
        color: MagamColors.surface,
        borderRadius: BorderRadius.circular(MagamColors.radiusLg),
        border: Border.all(color: MagamColors.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 12,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}

class MagamSubLabel extends StatelessWidget {
  const MagamSubLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.bodySmall,
    );
  }
}

class MagamPreviewCard extends StatelessWidget {
  const MagamPreviewCard({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MagamColors.accentSoft,
        borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        border: Border.all(color: const Color(0xFFD6E4FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '미리보기',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: MagamColors.accent,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            text,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  height: 1.45,
                ),
          ),
        ],
      ),
    );
  }
}

class MagamErrorBanner extends StatelessWidget {
  const MagamErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: MagamColors.dangerSoft,
        borderRadius: BorderRadius.circular(MagamColors.radiusMd),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Text(
        message,
        style: const TextStyle(
          color: MagamColors.danger,
          fontSize: 14,
          height: 1.4,
        ),
      ),
    );
  }
}

class MagamStatusBadge extends StatelessWidget {
  const MagamStatusBadge({super.key, required this.label, required this.isOpen});

  final String label;
  final bool isOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isOpen ? MagamColors.successSoft : const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: isOpen ? const Color(0xFFA7F3D0) : MagamColors.border,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: isOpen ? MagamColors.success : MagamColors.inkMuted,
        ),
      ),
    );
  }
}

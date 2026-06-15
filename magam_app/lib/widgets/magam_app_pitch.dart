import 'package:flutter/material.dart';

import '../constants/magam_copy.dart';
import '../theme/magam_theme.dart';

/// 헤드라인 + 3줄 설명
class MagamAppPitch extends StatelessWidget {
  const MagamAppPitch({
    super.key,
    this.textAlign = TextAlign.start,
    this.dense = false,
  });

  final TextAlign textAlign;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final headlineStyle = dense
        ? Theme.of(context).textTheme.bodySmall
        : Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: MagamColors.accent,
              fontWeight: FontWeight.w600,
            );
    final bulletStyle = Theme.of(context).textTheme.bodySmall?.copyWith(
          color: MagamColors.inkMuted,
        );

    return Column(
      crossAxisAlignment: textAlign == TextAlign.center
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        Text(
          magamAppTagline,
          style: headlineStyle,
          textAlign: textAlign,
        ),
        SizedBox(height: dense ? 6 : 10),
        for (final line in magamAppHighlights) ...[
          Text(
            '· $line',
            style: bulletStyle,
            textAlign: textAlign,
          ),
          if (line != magamAppHighlights.last) const SizedBox(height: 4),
        ],
      ],
    );
  }
}

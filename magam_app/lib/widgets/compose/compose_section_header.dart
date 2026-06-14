import 'package:flutter/material.dart';

import '../../theme/magam_theme.dart';

class ComposeSectionHeader extends StatelessWidget {
  const ComposeSectionHeader({
    super.key,
    required this.step,
    required this.title,
  });

  final String step;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: MagamColors.ink,
              borderRadius: BorderRadius.circular(9),
            ),
            child: Text(
              step,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(title, style: Theme.of(context).textTheme.titleLarge),
        ],
      ),
    );
  }
}

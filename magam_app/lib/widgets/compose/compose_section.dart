import 'package:flutter/material.dart';

import '../magam_section_card.dart';
import 'compose_section_header.dart';

class ComposeSection extends StatelessWidget {
  const ComposeSection({
    super.key,
    required this.step,
    required this.title,
    required this.child,
  });

  final String step;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return MagamSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ComposeSectionHeader(step: step, title: title),
          child,
        ],
      ),
    );
  }
}

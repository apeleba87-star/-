import 'package:flutter/material.dart';

import '../constants/magam_copy.dart';

class MagamInstallGuideDialog {
  static Future<void> show(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(magamInstallGuideTitle),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < magamInstallGuideSteps.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              Text(
                '${i + 1}. ${magamInstallGuideSteps[i]}',
                style: Theme.of(ctx).textTheme.bodyMedium,
              ),
            ],
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('확인'),
          ),
        ],
      ),
    );
  }
}

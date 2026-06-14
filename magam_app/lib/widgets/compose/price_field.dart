import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../constants/magam_copy.dart';

class PriceField extends StatelessWidget {
  const PriceField({
    super.key,
    required this.controller,
    this.isHiring = false,
    this.enabled = true,
  });

  final TextEditingController controller;
  final bool isHiring;
  final bool enabled;

  static int? parseAmount(String raw) {
    final n = int.tryParse(raw.trim());
    if (n == null || n <= 0) return null;
    return n * 10000;
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: InputDecoration(
        hintText: isHiring ? magamHiringPriceHint : '13',
        suffixText: isHiring ? magamHiringPriceSuffix : '만원',
        border: const OutlineInputBorder(),
      ),
    );
  }
}

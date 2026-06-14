import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class PriceField extends StatelessWidget {
  const PriceField({
    super.key,
    required this.controller,
    required this.unit,
    required this.onUnitChanged,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String unit;
  final ValueChanged<String> onUnitChanged;
  final bool enabled;

  static int? parseAmount(String raw, String unit) {
    final n = int.tryParse(raw.trim());
    if (n == null || n <= 0) return null;
    return n * 10000;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          enabled: enabled,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: InputDecoration(
            hintText: unit == 'man' ? '예: 13' : '예: 15',
            suffixText: unit == 'man' ? '만원' : '잔',
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: const Text('만원'),
              selected: unit == 'man',
              onSelected: enabled ? (_) => onUnitChanged('man') : null,
            ),
            ChoiceChip(
              label: const Text('잔'),
              selected: unit == 'jan',
              onSelected: enabled ? (_) => onUnitChanged('jan') : null,
            ),
          ],
        ),
      ],
    );
  }
}

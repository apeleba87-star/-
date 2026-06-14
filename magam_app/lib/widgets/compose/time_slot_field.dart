import 'package:flutter/material.dart';

import '../../constants/work_kind_copy.dart';

class TimeSlotField extends StatelessWidget {
  const TimeSlotField({
    super.key,
    required this.selected,
    required this.onChanged,
    this.slots = allSlots,
    this.enabled = true,
  });

  final String? selected;
  final ValueChanged<String?> onChanged;
  final List<String> slots;
  final bool enabled;

  static const allSlots = ['morning', 'afternoon', 'same_day', 'flexible'];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final slot in slots)
          ChoiceChip(
            label: Text(timeSlotLabels[slot] ?? slot),
            selected: selected == slot,
            onSelected: enabled
                ? (on) => onChanged(on ? slot : null)
                : null,
          ),
      ],
    );
  }
}

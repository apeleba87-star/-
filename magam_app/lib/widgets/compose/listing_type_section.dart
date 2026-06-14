import 'package:flutter/material.dart';

import '../../constants/magam_copy.dart';

class ListingTypeSection extends StatelessWidget {
  const ListingTypeSection({
    super.key,
    required this.listingType,
    required this.onChanged,
    this.enabled = true,
  });

  final String listingType;
  final ValueChanged<String> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: [
        for (final type in listingTypeLabels.keys)
          ChoiceChip(
            label: Text(listingTypeLabels[type]!),
            selected: listingType == type,
            onSelected: enabled ? (_) => onChanged(type) : null,
          ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../constants/magam_copy.dart';
import '../../constants/work_kind_copy.dart';
import '../magam_section_card.dart';

class WorkKindSection extends StatelessWidget {
  const WorkKindSection({
    super.key,
    required this.listingType,
    required this.workKind,
    required this.pyeongController,
    required this.otherDetailController,
    required this.acTypes,
    required this.onListingTypeChanged,
    required this.onWorkKindChanged,
    required this.onAcTypesChanged,
    this.enabled = true,
  });

  final String listingType;
  final String? workKind;
  final TextEditingController pyeongController;
  final TextEditingController otherDetailController;
  final Set<String> acTypes;
  final ValueChanged<String> onListingTypeChanged;
  final ValueChanged<String> onWorkKindChanged;
  final ValueChanged<Set<String>> onAcTypesChanged;
  final bool enabled;

  static const workKinds = ['move_in_new', 'move_out', 'ac', 'other'];
  static const acOptions = [
    'wall',
    'stand',
    'two_in_one',
    'one_two_way',
    'four_way',
    'other',
  ];

  @override
  Widget build(BuildContext context) {
    final needsPyeong = workKind == 'move_in_new' || workKind == 'move_out';
    final needsAc = workKind == 'ac';
    final showNotes = workKind == 'other';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const MagamSubLabel('도급 / 구인'),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          children: [
            for (final type in listingTypeLabels.keys)
              ChoiceChip(
                label: Text(listingTypeLabels[type]!),
                selected: listingType == type,
                onSelected: enabled
                    ? (_) => onListingTypeChanged(type)
                    : null,
              ),
          ],
        ),
        const SizedBox(height: 16),
        const MagamSubLabel('작업 종류'),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final kind in workKinds)
              ChoiceChip(
                label: Text(workKindLabels[kind] ?? kind),
                selected: workKind == kind,
                onSelected: enabled ? (_) => onWorkKindChanged(kind) : null,
              ),
          ],
        ),
        if (needsPyeong) ...[
          const SizedBox(height: 16),
          TextField(
            controller: pyeongController,
            enabled: enabled,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: '평형',
              suffixText: '평',
              border: OutlineInputBorder(),
            ),
          ),
        ],
        if (needsAc) ...[
          const SizedBox(height: 16),
          const MagamSubLabel('에어컨 종류 (복수 선택)'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final ac in acOptions)
                FilterChip(
                  label: Text(acTypeLabels[ac] ?? ac),
                  selected: acTypes.contains(ac),
                  onSelected: enabled
                      ? (on) {
                          final next = Set<String>.from(acTypes);
                          if (on) {
                            next.add(ac);
                          } else {
                            next.remove(ac);
                          }
                          onAcTypesChanged(next);
                        }
                      : null,
                ),
            ],
          ),
        ],
        if (showNotes) ...[
          const SizedBox(height: 16),
          TextField(
            controller: otherDetailController,
            enabled: enabled,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: '어떤 청소인지',
              hintText: '예) 입주 전 오피스텔 1회성, 창틀·베란다 포함',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ],
    );
  }
}

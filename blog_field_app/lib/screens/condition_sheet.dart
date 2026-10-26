import "package:flutter/material.dart";

const conditionChoices = ["물때", "곰팡이", "기름때", "먼지", "찌든때", "요석", "비누때", "석회"];

String conditionText(Iterable<String> selected, String extra) {
  final chosen = selected.toSet();
  final parts = [
    for (final name in conditionChoices)
      if (chosen.contains(name)) name,
    extra.trim(),
  ].where((part) => part.isNotEmpty);
  final text = parts.join(", ");
  if (text.length <= 200) return text;
  return text.substring(0, 200);
}

({Set<String> chips, String extra}) splitCondition(String raw) {
  final chips = <String>{};
  final extra = <String>[];
  for (final part in raw.split(",")) {
    final name = part.trim();
    if (name.isEmpty) continue;
    if (conditionChoices.contains(name)) {
      chips.add(name);
    } else {
      extra.add(name);
    }
  }
  return (chips: chips, extra: extra.join(", "));
}

class NewPlace {
  const NewPlace({required this.label, required this.condition});

  final String label;
  final String condition;
}

Future<NewPlace?> showAddPlaceSheet(BuildContext context) {
  return showModalBottomSheet<NewPlace>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _AddPlaceSheet(),
  );
}

Future<String?> showConditionSheet(
  BuildContext context, {
  required String placeLabel,
  required String initial,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    builder: (context) => _ConditionSheet(placeLabel: placeLabel, initial: initial),
  );
}

class _AddPlaceSheet extends StatefulWidget {
  const _AddPlaceSheet();

  @override
  State<_AddPlaceSheet> createState() => _AddPlaceSheetState();
}

class _AddPlaceSheetState extends State<_AddPlaceSheet> {
  final _label = TextEditingController();
  final _extra = TextEditingController();
  final _selected = <String>{};

  @override
  void dispose() {
    _label.dispose();
    _extra.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("장소", style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final chip in const ["거실", "안방", "주방", "화장실", "베란다", "현관", "창틀"])
                  ActionChip(label: Text(chip), onPressed: () => setState(() => _label.text = chip)),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _label,
              textInputAction: TextInputAction.next,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: "장소 이름", border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            const Text("오염 상태", style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text("여러 개 골라도 됩니다. 모르면 비워 두고, 찍은 뒤에 골라도 됩니다."),
            const SizedBox(height: 8),
            _ConditionChips(
              selected: _selected,
              onToggle: (name) => setState(() {
                if (!_selected.add(name)) _selected.remove(name);
              }),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _extra,
              decoration: const InputDecoration(
                labelText: "직접 입력",
                hintText: "예: 수전 녹",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text("취소")),
                const Spacer(),
                FilledButton(
                  onPressed: _label.text.trim().isEmpty
                      ? null
                      : () {
                          Navigator.pop(
                            context,
                            NewPlace(label: _label.text.trim(), condition: conditionText(_selected, _extra.text)),
                          );
                        },
                  child: const Text("추가"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ConditionSheet extends StatefulWidget {
  const _ConditionSheet({required this.placeLabel, required this.initial});

  final String placeLabel;
  final String initial;

  @override
  State<_ConditionSheet> createState() => _ConditionSheetState();
}

class _ConditionSheetState extends State<_ConditionSheet> {
  late final TextEditingController _extra;
  late final Set<String> _selected;

  @override
  void initState() {
    super.initState();
    final parsed = splitCondition(widget.initial);
    _selected = parsed.chips;
    _extra = TextEditingController(text: parsed.extra);
  }

  @override
  void dispose() {
    _extra.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("${widget.placeLabel} · 오염 상태", style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text("고른 내용이 그 장소 글에 들어갑니다."),
            const SizedBox(height: 8),
            _ConditionChips(
              selected: _selected,
              onToggle: (name) => setState(() {
                if (!_selected.add(name)) _selected.remove(name);
              }),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _extra,
              decoration: const InputDecoration(
                labelText: "직접 입력",
                hintText: "예: 수전 녹",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text("나중에")),
                const Spacer(),
                FilledButton(
                  onPressed: () => Navigator.pop(context, conditionText(_selected, _extra.text)),
                  child: const Text("저장"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ConditionChips extends StatelessWidget {
  const _ConditionChips({required this.selected, required this.onToggle});

  final Set<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final name in conditionChoices)
          FilterChip(
            label: Text(name),
            selected: selected.contains(name),
            onSelected: (_) => onToggle(name),
          ),
      ],
    );
  }
}

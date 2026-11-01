import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

/// 하단 탭: 0 현장 · 1 현황 · 2 내 정보
Widget accountBottomNav(BuildContext context, {required int selectedIndex}) {
  return NavigationBar(
    selectedIndex: selectedIndex,
    destinations: const [
      NavigationDestination(icon: Icon(Icons.home_outlined), label: "현장"),
      NavigationDestination(icon: Icon(Icons.bar_chart_outlined), label: "현황"),
      NavigationDestination(icon: Icon(Icons.person_outline), label: "내 정보"),
    ],
    onDestinationSelected: (index) {
      if (index == 0) context.go("/");
      if (index == 1) context.go("/dashboard");
      if (index == 2) context.go("/account");
    },
  );
}

class AccountMenuTile extends StatelessWidget {
  const AccountMenuTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      title: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Text(subtitle, style: const TextStyle(fontSize: 14, color: Color(0xFF52525B), height: 1.35)),
      ),
      trailing: const Icon(Icons.chevron_right, size: 28),
      onTap: onTap,
    );
  }
}

class TagEditor extends StatefulWidget {
  const TagEditor({
    super.key,
    required this.values,
    required this.onChanged,
    this.hint = "입력 후 추가",
    this.enabled = true,
  });

  final List<String> values;
  final ValueChanged<List<String>> onChanged;
  final String hint;
  final bool enabled;

  @override
  State<TagEditor> createState() => _TagEditorState();
}

class _TagEditorState extends State<TagEditor> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _add() {
    final value = _controller.text.trim();
    if (value.isEmpty) return;
    if (widget.values.contains(value)) {
      _controller.clear();
      return;
    }
    widget.onChanged([...widget.values, value]);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final tag in widget.values)
              InputChip(
                label: Text(tag),
                onDeleted: widget.enabled
                    ? () => widget.onChanged([for (final v in widget.values) if (v != tag) v])
                    : null,
              ),
          ],
        ),
        if (widget.enabled) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: InputDecoration(border: const OutlineInputBorder(), hintText: widget.hint),
                  onSubmitted: (_) => _add(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(onPressed: _add, child: const Text("추가")),
            ],
          ),
        ],
      ],
    );
  }
}

import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../field_scope.dart";

const serviceTypes = ["입주청소", "거주청소", "특수청소"];

class JobCreateScreen extends StatefulWidget {
  const JobCreateScreen({super.key});

  @override
  State<JobCreateScreen> createState() => _JobCreateScreenState();
}

class _JobCreateScreenState extends State<JobCreateScreen> {
  final _name = TextEditingController();
  var _service = serviceTypes.first;
  var _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.isEmpty) return;
    setState(() => _busy = true);
    final store = FieldScope.of(context);
    final id = await store.createJob(name, _service);
    if (!mounted) return;
    if (id == null) {
      setState(() => _busy = false);
      return;
    }
    context.go("/jobs/$id");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("현장 만들기")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _name,
            decoration: const InputDecoration(
              labelText: "현장 이름",
              hintText: "자양동 34평",
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          const Text("청소 종류"),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final item in serviceTypes)
                ChoiceChip(
                  label: Text(item),
                  selected: _service == item,
                  onSelected: (_) => setState(() => _service = item),
                ),
            ],
          ),
          const SizedBox(height: 12),
          const Text("평수와 금액은 사무실 PC에서 입력합니다."),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: const Text("장소 찍기"),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../services/knowledge_catalog.dart';
import '../widgets/entity_cards.dart';

class ContaminantsScreen extends StatelessWidget {
  const ContaminantsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = KnowledgeCatalog.instance.bundle.contaminants;
    return Scaffold(
      appBar: AppBar(title: const Text('오염으로 찾기')),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, i) => ContaminantCard(contaminant: items[i]),
      ),
    );
  }
}

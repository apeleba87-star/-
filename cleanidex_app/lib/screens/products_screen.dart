import 'package:flutter/material.dart';

import '../services/knowledge_catalog.dart';
import '../widgets/entity_cards.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final all = KnowledgeCatalog.instance.bundle.products;
    final items = _q.trim().isEmpty
        ? all
        : all.where((p) => p.searchText.contains(_q.trim().toLowerCase())).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('세제로 찾기')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              decoration: const InputDecoration(
                hintText: '세제명·별칭 검색',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _q = v),
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) => ProductCard(product: items[i]),
            ),
          ),
        ],
      ),
    );
  }
}

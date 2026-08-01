import 'package:flutter/material.dart';

import '../services/knowledge_catalog.dart';
import '../theme/app_theme.dart';
import '../widgets/entity_cards.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, this.initialQuery = ''});

  final String initialQuery;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialQuery);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _controller.text;
    final result = KnowledgeCatalog.instance.search(q);

    return Scaffold(
      appBar: AppBar(title: const Text('검색')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _controller,
              autofocus: widget.initialQuery.isEmpty,
              decoration: const InputDecoration(
                hintText: '오염·세제·사용법 검색',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              children: [
                if (q.trim().isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 24),
                    child: Text(
                      '검색어를 입력하세요.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: kTextSec),
                    ),
                  )
                else ...[
                  if (result.contaminants.isNotEmpty) ...[
                    const Text('오염', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                    const SizedBox(height: 8),
                    ...result.contaminants.map(
                      (c) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: ContaminantCard(contaminant: c),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (result.products.isNotEmpty) ...[
                    const Text('세제', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                    const SizedBox(height: 8),
                    ...result.products.map(
                      (p) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: ProductCard(product: p),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (result.recipes.isNotEmpty) ...[
                    const Text('사용법', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                    const SizedBox(height: 8),
                    ...result.recipes.map(
                      (r) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: RecipeTeaserCard(recipe: r),
                      ),
                    ),
                  ],
                  if (result.contaminants.isEmpty &&
                      result.products.isEmpty &&
                      result.recipes.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 24),
                      child: Text(
                        '결과가 없습니다.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: kTextSec),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

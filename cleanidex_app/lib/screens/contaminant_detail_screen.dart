import 'package:flutter/material.dart';

import '../services/knowledge_catalog.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';
import '../widgets/entity_cards.dart';

class ContaminantDetailScreen extends StatelessWidget {
  const ContaminantDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context) {
    final catalog = KnowledgeCatalog.instance;
    final c = catalog.contaminantById(id);
    if (c == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('오염')),
        body: const Center(child: Text('오염 정보를 찾을 수 없습니다.')),
      );
    }

    final products = catalog.productsForContaminant(id);
    final recipes = catalog.recipesForContaminant(id);

    return Scaffold(
      appBar: AppBar(title: Text(c.name)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          WhiteCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '한줄로 보면',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: kPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  c.notes?.isNotEmpty == true
                      ? c.notes!
                      : '${c.name} 제거에 맞는 세제와 사용법을 아래에서 고르세요.',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    height: 1.55,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          SectionHead(
            title: '이 세제를 써보세요',
            subtitle: '희석을 먼저 확인하세요',
            color: kPrimary,
          ),
          if (products.isEmpty)
            const Text('연결된 세제가 없습니다.', style: TextStyle(color: kTextSec))
          else
            ...products.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ProductCard(product: p),
              ),
            ),
          const SizedBox(height: 12),
          SectionHead(
            title: '이렇게 하세요',
            subtitle: '상황별 사용법',
            color: kAccent,
          ),
          if (recipes.isEmpty)
            const Text('등록된 사용법이 없습니다.', style: TextStyle(color: kTextSec))
          else
            ...recipes.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: RecipeTeaserCard(recipe: r),
              ),
            ),
        ],
      ),
    );
  }
}

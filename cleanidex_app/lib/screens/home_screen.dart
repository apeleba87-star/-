import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/app_models.dart';
import '../services/knowledge_catalog.dart';
import '../theme/app_theme.dart';
import '../widgets/entity_cards.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _controller = TextEditingController();
  List<AppRecipe> _recent = const [];

  @override
  void initState() {
    super.initState();
    _loadRecent();
  }

  Future<void> _loadRecent() async {
    final list = await KnowledgeCatalog.instance.recentRecipes();
    if (mounted) setState(() => _recent = list);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final catalog = KnowledgeCatalog.instance;
    final quick = catalog.quickContaminants();

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            const Text(
              '클린아이덱스',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.6,
                color: kPrimary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              '무엇을 지울까요?',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              '오염이나 세제를 고르면 희석·순서를 바로 보여 드립니다.',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: kTextSec,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                hintText: '요석, 곰팡이, 사니칼…',
                prefixIcon: Icon(Icons.search, color: kTextSec),
              ),
              onSubmitted: (q) {
                final query = q.trim();
                if (query.isEmpty) return;
                context.push('/search?q=${Uri.encodeQueryComponent(query)}');
              },
            ),
            const SizedBox(height: 18),
            const Text(
              '빠른 오염',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: quick.map((c) {
                return ActionChip(
                  label: Text(c.name.split('·').first.trim()),
                  onPressed: () => context.go('/pollution/${c.id}'),
                );
              }).toList(),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: _BranchCard(
                    title: '오염으로 찾기',
                    subtitle: '얼룩 종류 선택',
                    icon: Icons.water_drop_outlined,
                    onTap: () => context.go('/pollution'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _BranchCard(
                    title: '세제로 찾기',
                    subtitle: '희석·사용법',
                    icon: Icons.science_outlined,
                    onTap: () => context.go('/products'),
                  ),
                ),
              ],
            ),
            if (_recent.isNotEmpty) ...[
              const SizedBox(height: 26),
              const Text(
                '최근 본 사용법',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              ..._recent.map(
                (r) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: RecipeTeaserCard(recipe: r),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BranchCard extends StatelessWidget {
  const _BranchCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [kPrimary, kPrimarySoft],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: Colors.white, size: 26),
              const SizedBox(height: 14),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.9),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

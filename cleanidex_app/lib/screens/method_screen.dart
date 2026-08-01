import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/knowledge_catalog.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';

class MethodScreen extends StatefulWidget {
  const MethodScreen({super.key, required this.slug});

  final String slug;

  @override
  State<MethodScreen> createState() => _MethodScreenState();
}

class _MethodScreenState extends State<MethodScreen> {
  @override
  void initState() {
    super.initState();
    KnowledgeCatalog.instance.rememberRecipe(widget.slug);
  }

  @override
  Widget build(BuildContext context) {
    final catalog = KnowledgeCatalog.instance;
    final r = catalog.recipeBySlug(widget.slug);
    if (r == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('사용법')),
        body: const Center(child: Text('사용법을 찾을 수 없습니다.')),
      );
    }

    final similar = catalog
        .recipesForContaminant(r.contaminantId)
        .where((x) => x.slug != r.slug)
        .take(3)
        .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('사용법')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          Text(
            '${r.contaminantName} × ${r.materialName} × ${r.productName}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: kTextSec,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            r.title,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 16),
          WhiteCard(
            child: DilutionHighlight(dilution: r.dilution, large: true),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (r.dwellTime != null && r.dwellTime!.isNotEmpty)
                Chip(avatar: const Icon(Icons.timer_outlined, size: 16), label: Text(r.dwellTime!)),
              ...r.tools.take(4).map((t) => Chip(label: Text(t))),
            ],
          ),
          if (r.summary.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              r.summary,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                height: 1.55,
                color: kTextSec,
              ),
            ),
          ],
          const SizedBox(height: 22),
          const SectionHead(title: '순서대로 따라 하기', color: Color(0xFF0984E3)),
          if (r.steps.isEmpty)
            const Text('등록된 단계가 없습니다.', style: TextStyle(color: kTextSec))
          else
            StepList(steps: r.steps),
          if (r.warnings.isNotEmpty) ...[
            const SizedBox(height: 22),
            const SectionHead(title: '꼭 기억해 주세요', color: kDanger),
            WarningBlock(warnings: r.warnings),
          ],
          if (similar.isNotEmpty) ...[
            const SizedBox(height: 22),
            const SectionHead(title: '비슷한 사용법', color: kAccent),
            ...similar.map(
              (s) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(s.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text(s.dilution),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.pushReplacement('/methods/${s.slug}'),
              ),
            ),
          ],
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => context.push('/products/${r.productId}'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    foregroundColor: kPrimary,
                    side: const BorderSide(color: kPrimary),
                  ),
                  child: const Text('다른 세제 보기', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: () async {
                    final url = catalog.webUrl(r.webPath);
                    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: kPrimary,
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: const Text('웹에서 보기', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/knowledge_catalog.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  String? _expandedSlug;

  @override
  Widget build(BuildContext context) {
    final catalog = KnowledgeCatalog.instance;
    final p = catalog.productById(widget.id);
    if (p == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('세제')),
        body: const Center(child: Text('제품을 찾을 수 없습니다.')),
      );
    }
    final recipes = catalog.recipesForProduct(p.id);

    return Scaffold(
      appBar: AppBar(title: Text(p.name)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [kPrimary, kPrimarySoft],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.brand,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  p.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    height: 1.25,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 12),
                PhChip(phApprox: p.phApprox),
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: DilutionHighlight(
                    dilution: p.standardDilution ?? '',
                    large: true,
                  ),
                ),
                if (p.strongDilution != null && p.strongDilution!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    '강력: ${p.strongDilution}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.95),
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (p.summary != null && p.summary!.isNotEmpty) ...[
            const SizedBox(height: 16),
            WhiteCard(
              child: Text(
                p.summary!,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  height: 1.55,
                ),
              ),
            ),
          ],
          const SizedBox(height: 22),
          SectionHead(
            title: '상황별 사용법',
            subtitle: '확인하고 바로 따라 하세요',
          ),
          if (recipes.isEmpty)
            const Text('연결된 사용법이 없습니다.', style: TextStyle(color: kTextSec))
          else
            ...recipes.map((r) {
              final open = _expandedSlug == r.slug;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: WhiteCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      InkWell(
                        onTap: () => setState(() => _expandedSlug = open ? null : r.slug),
                        borderRadius: BorderRadius.circular(16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                r.title,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${r.contaminantName} · ${r.materialName}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: kTextSec,
                                ),
                              ),
                              const SizedBox(height: 10),
                              DilutionHighlight(dilution: r.dilution),
                              const SizedBox(height: 10),
                              Align(
                                alignment: Alignment.centerRight,
                                child: Text(
                                  open ? '접기 ▲' : '확인하기 ▶',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: kPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (open)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (r.steps.isNotEmpty) StepList(steps: r.steps.take(4).toList()),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: () => context.push('/methods/${r.slug}'),
                                style: FilledButton.styleFrom(
                                  backgroundColor: kPrimary,
                                  minimumSize: const Size.fromHeight(48),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: const Text(
                                  '전체 사용법 보기 →',
                                  style: TextStyle(fontWeight: FontWeight.w800),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }),
          if (p.warnings.isNotEmpty) ...[
            const SizedBox(height: 16),
            SectionHead(title: '주의', color: kDanger),
            WarningBlock(warnings: p.warnings),
          ],
          if (p.forbiddenMaterialIds.isNotEmpty || p.materialsRaw.isNotEmpty) ...[
            const SizedBox(height: 16),
            SectionHead(title: '적용·주의 재질', color: kAccent),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ...p.materialsRaw.take(8).map((m) => Chip(label: Text(m))),
              ],
            ),
          ],
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: () async {
              final url = catalog.webUrl('/products/${p.id}');
              await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
            },
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              side: const BorderSide(color: kPrimary),
              foregroundColor: kPrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('웹에서 더보기', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
          if (p.salesUrl != null && p.salesUrl!.isNotEmpty) ...[
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () async {
                await launchUrl(Uri.parse(p.salesUrl!), mode: LaunchMode.externalApplication);
              },
              style: FilledButton.styleFrom(
                backgroundColor: kText,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('구매 링크', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ],
        ],
      ),
    );
  }
}

import type { CatalogTopic } from "@/lib/knowledge-hub/catalog";
import { getCatalogTopicByPath, CATALOG_TOPICS, HUB_CATEGORIES } from "@/lib/knowledge-hub/catalog";
import {
  getCleaningKnowledgeDb,
  getContaminantById,
  getFactsForGuidePath,
  getMaterialById,
  getProductById,
  getRecipesForGuidePath,
  listProductsForMaterial,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import type { GuideBodyJson, GuideBlock } from "@/lib/knowledge-hub/types";
import { PH_DIRECTION_KO } from "@/lib/knowledge-hub/korean-labels";

const GLOBAL_RULE_IDS = ["rule-no-mix-bleach-acid", "rule-pretest", "rule-material-contaminant-first"];

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function recipesForContaminant(contaminantId: string) {
  return getCleaningKnowledgeDb().recipes.filter((r) => r.contaminantId === contaminantId);
}

function recipesForMaterial(materialId: string) {
  return getCleaningKnowledgeDb().recipes.filter((r) => r.materialId === materialId);
}

function productsForMaterial(materialId: string) {
  return listProductsForMaterial(materialId);
}

function productsForContaminant(contaminantId: string) {
  return getCleaningKnowledgeDb().products.filter((p) => p.contaminantIds?.includes(contaminantId));
}

function productsForbiddingMaterial(materialId: string) {
  return getCleaningKnowledgeDb().products.filter((p) => p.forbiddenMaterialIds?.includes(materialId));
}

function casesForMaterial(materialId: string) {
  const mat = getMaterialById(materialId);
  if (!mat) return [];
  const names = [mat.name, ...(mat.aliases ?? [])].map((n) => n.split("(")[0]!.trim()).filter(Boolean);
  // 재질 ID별 문서 키워드 (리스트업·사례 원문)
  const extra: Record<string, string[]> = {
    porcelain: ["도기", "변기", "세면대", "소변기"],
    glass: ["유리", "거울", "샤워부스"],
    "ceramic-tile": ["타일", "포세린"],
    stainless: ["스테인리스", "스테인레스"],
    leather: ["가죽"],
    carpet: ["카페트", "카펫"],
    plastic: ["플라스틱"],
  };
  const needles = [...names, ...(extra[materialId] ?? [])];
  return (getCleaningKnowledgeDb().cases ?? []).filter((c) => {
    const hay = `${c.materialRaw ?? ""} ${c.name}`;
    return needles.some((n) => n.length >= 2 && hay.includes(n));
  });
}

function casesForContaminant(contaminantId: string) {
  const cont = getContaminantById(contaminantId);
  if (!cont) return [];
  const needles: string[] = [];
  if (contaminantId === "soap-scum") needles.push("비누");
  else if (contaminantId === "water-spot") needles.push("물때", "경수");
  else if (contaminantId === "limescale") needles.push("요석", "석회", "백화");
  else if (contaminantId === "lime-deposit") needles.push("석회", "백화");
  else if (contaminantId === "grease") needles.push("기름", "유분", "구리스");
  else if (contaminantId === "adhesive") needles.push("스티커", "접착");
  else needles.push(...cont.name.split(/[·・]/).map((s) => s.trim()).filter((s) => s.length >= 2));
  return (getCleaningKnowledgeDb().cases ?? []).filter((c) => {
    const hay = c.contaminantRaw ?? "";
    return needles.some((n) => hay.includes(n));
  });
}

function buildLinkedProductsBlock(
  products: ReturnType<typeof productsForMaterial>,
  title: string,
  subtitle?: string
): GuideBlock | null {
  if (!products.length) return null;
  return {
    id: "linked-products",
    type: "products",
    title,
    productIds: products.map((p) => p.id),
    subtitle,
  };
}

function rulesTouchingLabel(labels: string[]): string[] {
  const db = getCleaningKnowledgeDb();
  return db.rules
    .filter((r) => labels.some((l) => l && r.body.includes(l)))
    .map((r) => r.body);
}

function factsForContaminant(contaminantId: string) {
  return getCleaningKnowledgeDb().facts.filter((f) => f.contaminantId === contaminantId);
}

function factsForMaterial(materialId: string) {
  return getCleaningKnowledgeDb().facts.filter((f) => f.materialIds?.includes(materialId));
}

function recipesForProduct(productId: string) {
  return getCleaningKnowledgeDb().recipes.filter((r) => r.productId === productId);
}

function factsForProduct(productId: string) {
  return getCleaningKnowledgeDb().facts.filter((f) => f.productId === productId);
}

function relatedGuidesFromRecipes(recipeIds: string[]): string[] {
  const db = getCleaningKnowledgeDb();
  const paths: string[] = [];
  for (const id of recipeIds) {
    const r = db.recipes.find((x) => x.id === id || x.slug === id);
    if (r?.guidePaths) paths.push(...r.guidePaths);
  }
  return unique(paths).filter((p) => CATALOG_TOPICS.some((t) => t.path === p));
}

function buildRecipeListBlock(
  recipes: ReturnType<typeof getRecipesForGuidePath>,
  title: string,
  subtitle?: string
): GuideBlock | null {
  if (!recipes.length) return null;
  return {
    id: "recipes",
    type: "recipes",
    title,
    recipeSlugs: recipes.map((r) => r.slug),
    subtitle,
  };
}

function buildFactsSection(facts: ReturnType<typeof getFactsForGuidePath>, title: string): GuideBlock | null {
  if (!facts.length) return null;
  return {
    id: "facts",
    type: "section",
    title,
    paragraphs: facts.map((f) => f.body),
  };
}

function buildCautionBlock(warnings: string[]): GuideBlock | null {
  const uniq = unique(warnings).filter(Boolean);
  if (!uniq.length) return null;
  return {
    id: "caution",
    type: "section",
    title: "주의사항",
    tone: "caution",
    paragraphs: uniq,
  };
}

function buildFaqForPath(path: string): GuideBlock | null {
  const db = getCleaningKnowledgeDb();
  const factsOnPath = getFactsForGuidePath(path);
  const relatedFactIds = new Set(factsOnPath.map((f) => f.id));
  const items = db.qaCases
    .filter((q) => q.relatedFactIds?.some((id) => relatedFactIds.has(id)))
    .map((q) => ({ q: q.question, a: q.answerSummary }));

  if (!items.length) return null;
  return { id: "faq", type: "faq", title: "자주 묻는 질문", items };
}

function globalCautions(): string[] {
  const db = getCleaningKnowledgeDb();
  return db.rules
    .filter((r) => GLOBAL_RULE_IDS.includes(r.id) || r.severity === "critical")
    .map((r) => r.body);
}

function productWarningsFromRecipes(recipes: ReturnType<typeof getRecipesForGuidePath>): string[] {
  return recipes.flatMap((r) => r.warnings);
}

function getSiblingTopics(categorySlug: string, excludePath: string): CatalogTopic[] {
  return CATALOG_TOPICS.filter(
    (t) => t.categorySlug === categorySlug && t.path !== excludePath && t.topicSlug !== "overview"
  );
}

function aggregateRecipesForCategory(categorySlug: string, limit = 8) {
  const seen = new Set<string>();
  const recipes: ReturnType<typeof getRecipesForGuidePath> = [];
  for (const topic of getSiblingTopics(categorySlug, "")) {
    for (const r of getRecipesForGuidePath(topic.path)) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      recipes.push(r);
    }
  }
  return recipes.slice(0, limit);
}

function aggregateFactsForCategory(categorySlug: string, limit = 8) {
  const seen = new Set<string>();
  const facts: ReturnType<typeof getFactsForGuidePath> = [];
  for (const topic of getSiblingTopics(categorySlug, "")) {
    for (const f of getFactsForGuidePath(topic.path)) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      facts.push(f);
    }
  }
  return facts.slice(0, limit);
}

function buildAreaGuideChecklist(topic: CatalogTopic): GuideBlock | null {
  if (topic.topicSlug !== "overview") return null;
  const siblings = getSiblingTopics(topic.categorySlug, topic.path);
  if (!siblings.length) return null;
  return {
    id: "area-guides",
    type: "checklist",
    title: "영역별 상세 가이드",
    items: siblings.map((t) => `${t.h1} — ${t.focus}`),
  };
}

function buildOverviewBlocks(topic: CatalogTopic): GuideBlock[] {
  /** 문서 근거 없는 범위·주기·순서 문장은 넣지 않음. 하위 가이드 목록(네비)만 허용 */
  const areaGuides = buildAreaGuideChecklist(topic);
  return areaGuides ? [areaGuides] : [];
}

/** 카탈로그 가이드 본문 — 연결된 레시피·팩트·규칙만 (임의 문장 금지) */
export function generateGuideBodyForTopic(topic: CatalogTopic): GuideBodyJson {
  const path = topic.path;
  const isOverview = topic.topicSlug === "overview";

  let recipes = getRecipesForGuidePath(path);
  let facts = getFactsForGuidePath(path);

  if (isOverview) {
    if (!recipes.length) recipes = aggregateRecipesForCategory(topic.categorySlug);
    if (!facts.length) facts = aggregateFactsForCategory(topic.categorySlug);
  }

  const warnings = [...productWarningsFromRecipes(recipes), ...globalCautions()];

  const blocks: GuideBlock[] = [];

  if (isOverview) {
    blocks.push(...buildOverviewBlocks(topic));
  }

  const recipeBlock = buildRecipeListBlock(
    recipes,
    "사용 레시피",
    recipes.length ? undefined : undefined
  );
  if (recipeBlock) blocks.push(recipeBlock);

  const factBlock = buildFactsSection(facts, "검증된 정리");
  if (factBlock) blocks.push(factBlock);

  /** 연결 데이터가 있을 때만 원칙 규칙 노출 */
  if (recipes.length || facts.length) {
    const principleRules = getCleaningKnowledgeDb()
      .rules.filter((r) => r.id === "rule-material-contaminant-first" || r.id === "rule-pretest")
      .map((r) => r.body);
    if (principleRules.length) {
      blocks.push({
        id: "principle",
        type: "section",
        title: "작업 원칙",
        paragraphs: principleRules,
      });
    }
  }

  const caution = buildCautionBlock(warnings);
  if (caution) blocks.push(caution);

  const faq = buildFaqForPath(path);
  if (faq) blocks.push(faq);

  if (recipes.length) {
    blocks.push({
      id: "products",
      type: "products",
      title: "관련 제품",
      productIds: unique([
        ...recipes.map((r) => r.productId),
        ...facts.map((f) => f.productId).filter(Boolean) as string[],
      ]),
      subtitle: "이 주제에 연결된 제품입니다.",
    });
  }

  if (!blocks.length) {
    blocks.push({
      id: "empty",
      type: "section",
      title: "등록된 사용법 없음",
      tone: "summary",
      paragraphs: [
        "이 주제에 등록된 레시피·팩트가 아직 없습니다.",
      ],
    });
  }

  const summary = [
    `대상: ${topic.focus}`,
    recipes.length ? `연결 레시피 ${recipes.length}건` : "연결 레시피 없음",
    facts.length ? `팩트 ${facts.length}건` : null,
  ].filter(Boolean) as string[];

  const relatedPaths = unique([
    ...relatedGuidesFromRecipes(recipes.map((r) => r.id)),
    ...(isOverview ? getSiblingTopics(topic.categorySlug, path).map((t) => t.path) : getTopicsByCategoryFallback(topic.categorySlug, path)),
  ]).slice(0, isOverview ? 9 : 5);

  const intro = recipes.length || facts.length ? topic.seoDescription : `${topic.h1} — 문서 근거 데이터 연결 대기 중`;

  return {
    intro,
    summary,
    toc: blocks.map((b) => b.title),
    blocks,
    relatedPaths,
  };
}

function getTopicsByCategoryFallback(categorySlug: string, excludePath: string): string[] {
  return CATALOG_TOPICS.filter((t) => t.categorySlug === categorySlug && t.path !== excludePath)
    .slice(0, 3)
    .map((t) => t.path);
}

export function generateGuideBodyForPath(path: string): GuideBodyJson | null {
  const topic = getCatalogTopicByPath(path);
  if (!topic) return null;
  return generateGuideBodyForTopic(topic);
}

/** 제품 허브 페이지 본문 — 문서 필드만 */
export function generateProductPageBody(productId: string): GuideBodyJson | null {
  const product = getProductById(productId);
  if (!product) return null;

  const recipes = recipesForProduct(productId);
  const facts = factsForProduct(productId);
  const blocks: GuideBlock[] = [];

  const overviewParas = [
    product.summary,
    product.mainUse.length ? `주요 용도·장소: ${product.mainUse.join(", ")}` : "",
    product.standardDilution ? `희석: ${product.standardDilution}` : "",
    product.strongDilution ? `집중: ${product.strongDilution}` : "",
    product.dwellTime ? `대기 시간: ${product.dwellTime}` : "",
    product.phApprox ? `pH: ${product.phApprox}` : "",
    product.packSizes?.length ? `규격: ${product.packSizes.join(", ")}` : "",
  ].filter(Boolean) as string[];

  if (overviewParas.length) {
    blocks.push({
      id: "overview",
      type: "section",
      title: "제품 개요",
      paragraphs: overviewParas,
    });
  }

  if (product.materialsRaw?.length) {
    blocks.push({
      id: "materials",
      type: "checklist",
      title: "적용 재질",
      items: product.materialsRaw,
    });
  } else if (product.compatibleMaterialIds?.length) {
    blocks.push({
      id: "materials",
      type: "checklist",
      title: "적용 재질",
      items: product.compatibleMaterialIds.map((id) => getMaterialById(id)?.name ?? id),
    });
  }

  if (product.contaminantsRaw?.length) {
    blocks.push({
      id: "contaminants",
      type: "checklist",
      title: "제거 가능한 오염",
      items: product.contaminantsRaw,
    });
  } else if (product.contaminantIds?.length) {
    blocks.push({
      id: "contaminants",
      type: "checklist",
      title: "제거 가능한 오염",
      items: product.contaminantIds.map((id) => getContaminantById(id)?.name ?? id),
    });
  }

  if (product.forbiddenRaw?.length) {
    blocks.push({
      id: "forbidden",
      type: "section",
      title: "사용 주의·불가",
      tone: "caution",
      paragraphs: product.forbiddenRaw,
    });
  } else if (product.forbiddenMaterialIds?.length) {
    blocks.push({
      id: "forbidden",
      type: "section",
      title: "사용 주의·불가 재질",
      tone: "caution",
      paragraphs: product.forbiddenMaterialIds.map((id) => getMaterialById(id)?.name ?? id),
    });
  }

  const factBlock = buildFactsSection(facts, "사용 요령");
  if (factBlock) blocks.push(factBlock);

  const recipeBlock = buildRecipeListBlock(recipes, "이 제품 레시피 (사례)");
  if (recipeBlock) blocks.push(recipeBlock);

  const caution = buildCautionBlock([...product.warnings, ...productWarningsFromRecipes(recipes)]);
  if (caution) blocks.push(caution);

  if (!blocks.length) {
    blocks.push({
      id: "empty",
      type: "section",
      title: "상세 스펙 없음",
      paragraphs: [
        "이 제품은 현장 사례에서만 언급되었습니다. 스펙·희석·적용 범위는 상세 정보가 추가되면 채워집니다.",
      ],
    });
  }

  const intro =
    product.status === "draft"
      ? product.summary ?? `${product.name} — 사례에서 언급된 제품`
      : product.summary ?? `${product.name}`;

  return {
    intro,
    summary:
      product.status === "draft"
        ? ["사례 근거 제품", ...product.mainUse.slice(0, 2)]
        : product.mainUse.slice(0, 3),
    toc: blocks.map((b) => b.title),
    blocks,
    relatedPaths: relatedGuidesFromRecipes(recipes.map((r) => r.id)),
  };
}

/** 재질 허브 — 문서(리스트업) 적용 재질·사례로 연결된 제품만 노출 */
export function generateMaterialPageBody(materialId: string): GuideBodyJson | null {
  const material = getMaterialById(materialId);
  if (!material) return null;

  const recipes = recipesForMaterial(materialId);
  const facts = factsForMaterial(materialId);
  const products = productsForMaterial(materialId);
  const forbiddenBy = productsForbiddingMaterial(materialId);
  const cases = casesForMaterial(materialId);
  const blocks: GuideBlock[] = [];
  const isHighRisk = material.riskLevel === "high" || material.riskLevel === "very_high";

  const forbidNotes = [
    ...forbiddenBy.flatMap((p) =>
      (p.forbiddenRaw ?? [])
        .filter((f) => materialIdsMention(f, material))
        .map((f) => `${p.name}: ${f}`)
    ),
    ...rulesTouchingLabel(
      [
        material.name,
        ...(material.aliases ?? []),
        materialId === "aluminum" ? "알루미늄" : "",
        materialId === "marble" ? "대리석" : "",
      ].filter(Boolean)
    ),
  ];
  const caution = buildCautionBlock(forbidNotes);

  if (isHighRisk && caution) blocks.push(caution);

  if (material.notes) {
    blocks.push({
      id: "overview",
      type: "section",
      title: "재질 특성",
      paragraphs: [material.notes],
    });
  }

  const productBlock = buildLinkedProductsBlock(products, "적용 제품");
  if (productBlock) blocks.push(productBlock);

  // 관련 오염은 제품 합집합이 아니라, 이 재질 레시피에 쓰인 오염만
  const contFromRecipes = unique(recipes.map((r) => r.contaminantId).filter(Boolean));
  const contLinks = contFromRecipes
    .map((id) => {
      const c = getContaminantById(id);
      return c ? { href: `/pollution/${id}`, label: c.name } : null;
    })
    .filter(Boolean) as { href: string; label: string }[];
  if (contLinks.length) {
    blocks.push({
      id: "related-contaminants",
      type: "links",
      title: "관련 오염",
      items: contLinks,
    });
  }

  if (cases.length) {
    blocks.push({
      id: "cases",
      type: "links",
      title: "관련 사례",
      items: cases.slice(0, 12).map((c) => ({
        href: `/cases/${c.id}`,
        label: c.name,
        note: c.contaminantRaw ?? undefined,
      })),
    });
  }

  const factBlock = buildFactsSection(facts, "세정 시 알아둘 점");
  if (factBlock) blocks.push(factBlock);

  const recipeBlock = buildRecipeListBlock(recipes, "이 재질 레시피");
  if (recipeBlock) blocks.push(recipeBlock);

  if (!isHighRisk && caution) blocks.push(caution);

  if (blocks.length === 0) {
    blocks.push({
      id: "empty",
      type: "section",
      title: "연결 데이터 없음",
      tone: "summary",
      paragraphs: ["이 재질에 직접 연결된 제품·레시피가 아직 없습니다."],
    });
  }

  const summary = [
    products.length ? `제품 ${products.length}` : null,
    recipes.length ? `레시피 ${recipes.length}` : null,
    cases.length ? `사례 ${cases.length}` : null,
  ].filter(Boolean) as string[];

  return {
    summary,
    toc: blocks.length > 3 ? blocks.map((b) => b.title) : undefined,
    blocks,
    relatedPaths: relatedGuidesFromRecipes(recipes.map((r) => r.id)),
  };
}

function materialIdsMention(forbiddenPhrase: string, material: NonNullable<ReturnType<typeof getMaterialById>>): boolean {
  const hay = forbiddenPhrase;
  if (hay.includes(material.name.split("(")[0]!.trim())) return true;
  return (material.aliases ?? []).some((a) => hay.includes(a));
}

/** 오염 허브 — 리스트업「제거 가능한 오염」·사례로 연결된 제품만 */
export function generateContaminantPageBody(contaminantId: string): GuideBodyJson | null {
  const contaminant = getContaminantById(contaminantId);
  if (!contaminant) return null;

  const recipes = recipesForContaminant(contaminantId);
  const facts = factsForContaminant(contaminantId);
  const products = productsForContaminant(contaminantId);
  const cases = casesForContaminant(contaminantId);
  const blocks: GuideBlock[] = [];

  const overviewParas = [
    contaminant.notes ?? "",
    contaminant.phDirection
      ? `세정 방향: ${PH_DIRECTION_KO[contaminant.phDirection] ?? contaminant.phDirection}`
      : "",
  ].filter(Boolean);
  if (overviewParas.length) {
    blocks.push({
      id: "overview",
      type: "section",
      title: "오염 개요",
      paragraphs: overviewParas,
    });
  }

  const productBlock = buildLinkedProductsBlock(products, "제거 가능 제품");
  if (productBlock) blocks.push(productBlock);

  // 적용 재질은 제품 전체 합집합이 아니라, 이 오염 레시피에 쓰인 재질만
  const matFromRecipes = unique(recipes.map((r) => r.materialId).filter(Boolean));
  const matLinks = matFromRecipes
    .map((id) => {
      const m = getMaterialById(id);
      return m ? { href: `/materials/${id}`, label: m.name } : null;
    })
    .filter(Boolean) as { href: string; label: string }[];
  if (matLinks.length) {
    blocks.push({
      id: "related-materials",
      type: "links",
      title: "관련 재질",
      items: matLinks,
    });
  }

  if (cases.length) {
    blocks.push({
      id: "cases",
      type: "links",
      title: "관련 사례",
      items: cases.slice(0, 12).map((c) => ({
        href: `/cases/${c.id}`,
        label: c.name,
        note: c.materialRaw ?? undefined,
      })),
    });
  }

  const factBlock = buildFactsSection(facts, "제거 원칙");
  if (factBlock) blocks.push(factBlock);

  const recipeBlock = buildRecipeListBlock(recipes, "이 오염 레시피");
  if (recipeBlock) blocks.push(recipeBlock);

  const principleBits = rulesTouchingLabel(
    [
      contaminant.name,
      contaminantId === "limescale" ? "석회" : "",
      contaminantId === "lime-deposit" ? "석회" : "",
      contaminantId === "grease" ? "기름때" : "",
      contaminantId === "water-spot" ? "물때" : "",
      contaminantId === "mold" ? "곰팡이" : "",
    ].filter(Boolean)
  );
  const caution = buildCautionBlock([...principleBits, ...globalCautions()]);
  if (caution) blocks.push(caution);

  if (blocks.length === 0) {
    blocks.push({
      id: "empty",
      type: "section",
      title: "연결 데이터 없음",
      tone: "summary",
      paragraphs: ["이 오염에 직접 연결된 제품·레시피가 아직 없습니다."],
    });
  }

  const summary = [
    products.length ? `제품 ${products.length}` : null,
    recipes.length ? `레시피 ${recipes.length}` : null,
    cases.length ? `사례 ${cases.length}` : null,
  ].filter(Boolean) as string[];

  return {
    summary,
    toc: blocks.length > 3 ? blocks.map((b) => b.title) : undefined,
    blocks,
    relatedPaths: relatedGuidesFromRecipes(recipes.map((r) => r.id)),
  };
}

/** 현장(카테고리) 허브 요약 */
export function generateFacilityHubSummary(categorySlug: string): {
  title: string;
  description: string;
  guidePaths: string[];
  recipeCount: number;
} {
  const topics = CATALOG_TOPICS.filter((t) => t.categorySlug === categorySlug);
  const paths = topics.map((t) => t.path);
  let recipeCount = 0;
  for (const p of paths) recipeCount += getRecipesForGuidePath(p).length;
  const first = topics[0];
  return {
    title: first ? getCategoryKoreanName(categorySlug) : categorySlug,
    description: `${topics.length}개 가이드 · 연결 레시피 ${recipeCount}건`,
    guidePaths: paths,
    recipeCount,
  };
}

export function getCategoryKoreanName(slug: string): string {
  const cat = HUB_CATEGORIES.find((c) => c.slug === slug);
  return cat?.name ?? slug;
}

export function dbLinkedProductIdsForPath(path: string): string[] {
  const topic = getCatalogTopicByPath(path);
  let recipes = getRecipesForGuidePath(path);
  let facts = getFactsForGuidePath(path);
  if (topic?.topicSlug === "overview") {
    if (!recipes.length) recipes = aggregateRecipesForCategory(topic.categorySlug);
    if (!facts.length) facts = aggregateFactsForCategory(topic.categorySlug);
  }
  return unique([
    ...recipes.map((r) => r.productId),
    ...facts.map((f) => f.productId).filter(Boolean) as string[],
  ]);
}

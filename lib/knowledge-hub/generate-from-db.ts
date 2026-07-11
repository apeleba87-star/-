import type { CatalogTopic } from "@/lib/knowledge-hub/catalog";
import { getCatalogTopicByPath, CATALOG_TOPICS, HUB_CATEGORIES } from "@/lib/knowledge-hub/catalog";
import {
  getCleaningKnowledgeDb,
  getContaminantById,
  getFactsForGuidePath,
  getMaterialById,
  getProductById,
  getRecipesForGuidePath,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import type { GuideBodyJson, GuideBlock } from "@/lib/knowledge-hub/types";
import { CONTAMINANT_TYPE_KO, PH_DIRECTION_KO, RISK_LEVEL_KO } from "@/lib/knowledge-hub/korean-labels";

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
    "문서·사례 기반 레시피",
    recipes.length ? undefined : undefined
  );
  if (recipeBlock) blocks.push(recipeBlock);

  const factBlock = buildFactsSection(facts, "검증된 정리");
  if (factBlock) blocks.push(factBlock);

  /** 연결 데이터가 있을 때만 원칙 규칙 노출 (전역 규칙 = 원문 추출분) */
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
    });
  }

  if (!blocks.length) {
    blocks.push({
      id: "empty",
      type: "section",
      title: "등록된 사용법 없음",
      tone: "summary",
      paragraphs: [
        "이 주제에는 아직 제공하신 문서·사례에 근거한 레시피·팩트가 없습니다. 임의로 작성한 내용은 표시하지 않습니다.",
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

  if (product.compatibleMaterialIds?.length) {
    blocks.push({
      id: "materials",
      type: "checklist",
      title: "적용 재질 (문서)",
      items: product.compatibleMaterialIds.map((id) => getMaterialById(id)?.name ?? id),
    });
  }

  if (product.contaminantIds?.length) {
    blocks.push({
      id: "contaminants",
      type: "checklist",
      title: "제거 가능한 오염 (문서)",
      items: product.contaminantIds.map((id) => getContaminantById(id)?.name ?? id),
    });
  }

  if (product.forbiddenMaterialIds?.length) {
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
      title: "상세 스펙 대기",
      paragraphs: ["사례에서 언급된 제품입니다. 리스트업 상세가 추가되면 스펙이 채워집니다."],
    });
  }

  return {
    intro: product.summary ?? `${product.name} — 문서·사례 근거 정보`,
    summary: product.mainUse.slice(0, 3),
    toc: blocks.map((b) => b.title),
    blocks,
    relatedPaths: relatedGuidesFromRecipes(recipes.map((r) => r.id)),
  };
}

/** 재질 허브 */
export function generateMaterialPageBody(materialId: string): GuideBodyJson | null {
  const material = getMaterialById(materialId);
  if (!material) return null;

  const recipes = recipesForMaterial(materialId);
  const facts = factsForMaterial(materialId);
  const blocks: GuideBlock[] = [];

  blocks.push({
    id: "overview",
    type: "section",
    title: "재질 특성",
    paragraphs: [
      `위험도: ${RISK_LEVEL_KO[material.riskLevel] ?? material.riskLevel}`,
      material.notes ?? "사전 테스트를 권장합니다.",
    ],
  });

  const factBlock = buildFactsSection(facts, "세정 시 알아둘 점");
  if (factBlock) blocks.push(factBlock);

  const recipeBlock = buildRecipeListBlock(recipes, "이 재질 레시피");
  if (recipeBlock) blocks.push(recipeBlock);

  return {
    intro: `${material.name} 청소 시 사용할 제품과 주의사항입니다.`,
    toc: blocks.map((b) => b.title),
    blocks,
    relatedPaths: relatedGuidesFromRecipes(recipes.map((r) => r.id)),
  };
}

/** 오염 허브 */
export function generateContaminantPageBody(contaminantId: string): GuideBodyJson | null {
  const contaminant = getContaminantById(contaminantId);
  if (!contaminant) return null;

  const recipes = recipesForContaminant(contaminantId);
  const facts = factsForContaminant(contaminantId);
  const blocks: GuideBlock[] = [];

  blocks.push({
    id: "overview",
    type: "section",
    title: "오염 개요",
    paragraphs: [
      `유형: ${CONTAMINANT_TYPE_KO[contaminant.type] ?? contaminant.type}`,
      contaminant.notes ?? "",
      contaminant.phDirection ? `세정 방향: ${PH_DIRECTION_KO[contaminant.phDirection] ?? contaminant.phDirection}` : "",
    ].filter(Boolean),
  });

  const factBlock = buildFactsSection(facts, "제거 원칙");
  if (factBlock) blocks.push(factBlock);

  const recipeBlock = buildRecipeListBlock(recipes, "이 오염 레시피");
  if (recipeBlock) blocks.push(recipeBlock);

  const caution = buildCautionBlock(globalCautions());
  if (caution) blocks.push(caution);

  return {
    intro: `${contaminant.name} 제거 방법과 연결 제품·레시피입니다.`,
    toc: blocks.map((b) => b.title),
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

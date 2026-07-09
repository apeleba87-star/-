import type { CatalogTopic } from "@/lib/knowledge-hub/catalog";
import { getCatalogTopicByPath, CATALOG_TOPICS, HUB_CATEGORIES } from "@/lib/knowledge-hub/catalog";
import { CATEGORY_OVERVIEW, CATEGORY_OVERVIEW_FULL } from "@/lib/knowledge-hub/category-overview";
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

const GLOBAL_RULE_IDS = ["rule-no-mix", "rule-pretest", "rule-material-first"];

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

function buildFaqForPath(path: string, skipGlobalFallback = false): GuideBlock | null {
  const db = getCleaningKnowledgeDb();
  const factsOnPath = getFactsForGuidePath(path);
  const relatedFactIds = new Set(factsOnPath.map((f) => f.id));
  const items = db.qaCases
    .filter((q) => q.relatedFactIds?.some((id) => relatedFactIds.has(id)))
    .map((q) => ({ q: q.question, a: q.answerSummary }));

  if (!items.length) {
    if (skipGlobalFallback) return null;
    const fallback = db.qaCases.slice(0, 2).map((q) => ({ q: q.question, a: q.answerSummary }));
    if (!fallback.length) return null;
    return { id: "faq", type: "faq", title: "자주 묻는 질문", items: fallback };
  }
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
  const content = CATEGORY_OVERVIEW_FULL[topic.categorySlug];
  if (!content) return [];

  const blocks: GuideBlock[] = [];

  blocks.push({
    id: "scope",
    type: "checklist",
    title: content.scopeTitle,
    items: content.scopeItems,
  });

  blocks.push({
    id: "sequence",
    type: "steps",
    title: content.sequenceTitle,
    steps: content.sequence,
  });

  blocks.push({
    id: "frequency",
    type: "section",
    title: "청소 주기",
    tone: "summary",
    paragraphs: [content.frequency],
  });

  const areaGuides = buildAreaGuideChecklist(topic);
  if (areaGuides) blocks.push(areaGuides);

  return blocks;
}

/** 카탈로그 가이드(50페이지) 본문 — DB 팩트·레시피 기반 */
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
    isOverview ? "현장 레시피" : "현장 레시피",
    isOverview ? "이 현장에서 자주 쓰는 제품 조합입니다." : undefined
  );
  if (recipeBlock) blocks.push(recipeBlock);

  const factBlock = buildFactsSection(facts, isOverview ? "핵심 정리 (구역별 팩트 모음)" : "핵심 정리");
  if (factBlock) blocks.push(factBlock);

  if (topic.guideType === "service_method" || topic.guideType === "problem") {
    if (!isOverview) {
      blocks.push({
        id: "principle",
        type: "section",
        title: "작업 원칙",
        paragraphs: [
          "재질과 오염원을 먼저 확인한 뒤 제품을 고릅니다. 화장실세정제·유리세정제 등 장소 라벨은 편의 구분일 뿐입니다.",
          "사전 테스트(눈에 띄지 않는 구석) 후 본 작업을 진행합니다.",
          "산성 세정 후에는 물로 충분히 헹구고 잔수를 제거합니다. 입주·마감·고오염 바닥은 마른 걸레 마무리를 권장합니다.",
        ],
      });
    }
  }

  const caution = buildCautionBlock(warnings);
  if (caution) blocks.push(caution);

  const faq = buildFaqForPath(path, isOverview);
  if (faq) blocks.push(faq);

  if (recipes.length) {
    blocks.push({
      id: "products",
      type: "products",
      title: "관련 제품",
    });
  }

  const overviewContent = isOverview ? CATEGORY_OVERVIEW_FULL[topic.categorySlug] : undefined;

  const summary = [
    `대상: ${topic.focus}`,
    isOverview && overviewContent ? overviewContent.frequency : null,
    recipes.length ? `연결 레시피 ${recipes.length}건` : null,
    facts.length ? `검증 팩트 ${facts.length}건 반영` : null,
  ].filter(Boolean) as string[];

  const relatedPaths = unique([
    ...relatedGuidesFromRecipes(recipes.map((r) => r.id)),
    ...(topic.guideType === "problem"
      ? []
      : isOverview
        ? getSiblingTopics(topic.categorySlug, path).map((t) => t.path)
        : getTopicsByCategoryFallback(topic.categorySlug, path)),
  ]).slice(0, isOverview ? 9 : 5);

  const intro =
    isOverview && overviewContent?.introExtra
      ? overviewContent.introExtra
      : topic.seoDescription;

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

/** 제품 허브 페이지 본문 */
export function generateProductPageBody(productId: string): GuideBodyJson | null {
  const product = getProductById(productId);
  if (!product) return null;

  const recipes = recipesForProduct(productId);
  const facts = factsForProduct(productId);
  const blocks: GuideBlock[] = [];

  blocks.push({
    id: "overview",
    type: "section",
    title: "제품 개요",
    paragraphs: [
      `${product.brand} ${product.name}`,
      `주요 용도: ${product.mainUse.join(", ")}`,
      product.standardDilution ? `표준 희석: ${product.standardDilution}` : "",
      product.strongDilution ? `집중 세정: ${product.strongDilution}` : "",
      product.dwellTime ? `대기 시간: ${product.dwellTime}` : "",
      product.phApprox ? `pH: ${product.phApprox}` : "",
    ].filter(Boolean),
  });

  const factBlock = buildFactsSection(facts, "사용 요령");
  if (factBlock) blocks.push(factBlock);

  const recipeBlock = buildRecipeListBlock(recipes, "이 제품 레시피");
  if (recipeBlock) blocks.push(recipeBlock);

  const caution = buildCautionBlock([...product.warnings, ...productWarningsFromRecipes(recipes)]);
  if (caution) blocks.push(caution);

  return {
    intro: `${product.name} 사용법·희석·주의사항을 정리했습니다.`,
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

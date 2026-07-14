import { INITIAL_CLEANING_KNOWLEDGE } from "@/lib/knowledge-hub/cleaning-knowledge/initial-knowledge";
import {
  SOURCE_DOC_KNOWLEDGE,
  productHardForbidsMaterial,
} from "@/lib/knowledge-hub/cleaning-knowledge/build-from-source";
import type {
  CleaningKnowledgeDb,
  KnowledgeCaseEvidence,
  KnowledgeFact,
  KnowledgeProduct,
  KnowledgeRecipe,
} from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { recipeMatchesGuidePath, enrichedGuidePathsForRecipe } from "@/lib/knowledge-hub/recipe-guide-linker";

let cache: CleaningKnowledgeDb | null = null;

/**
 * 런타임 단일 소스.
 * v3: 사용자 제공 문서(리스트업·사례·원문 원칙) 기준. 더미 레시피/팩트 미포함.
 * 레거시 initial-knowledge는 마이그레이션 참고용으로만 유지.
 */
export function getCleaningKnowledgeDb(): CleaningKnowledgeDb {
  if (!cache) {
    cache = SOURCE_DOC_KNOWLEDGE;
  }
  return cache;
}

/** @deprecated 문서 근거 DB로 전환됨. 비교·마이그레이션용 */
export function getLegacyCleaningKnowledgeDb(): CleaningKnowledgeDb {
  return INITIAL_CLEANING_KNOWLEDGE;
}

export function listRecipes(): KnowledgeRecipe[] {
  return getCleaningKnowledgeDb().recipes;
}

/** 문서 시드 제품만 (DB 오버레이 없음) */
export function listSourceProducts(): KnowledgeProduct[] {
  return getCleaningKnowledgeDb().products;
}

/** @deprecated 가능하면 listMergedProducts 사용 — 동기 호출용 시드 목록 */
export function listProducts(): KnowledgeProduct[] {
  return listSourceProducts();
}

/** 데코·리놀·PVC바닥은 문서 허용/금지가 갈라지므로 원문 구문으로 판별 */
function productAllowsPvcDecoFamily(p: KnowledgeProduct): boolean {
  const mats = p.materialsRaw ?? [];
  const forb = p.forbiddenRaw ?? [];
  const decoOk =
    mats.some((s) => /데코타일|PVC\s*계?\s*데코|PVC\s*바닥|비닐\s*바닥|탄성\s*바닥/.test(s)) &&
    !forb.some((s) => /데코타일|PVC\s*계?\s*데코|PVC\s*바닥|비닐\s*바닥|합성수지/.test(s));
  const linoOk = mats.some((s) => /리놀륨/.test(s)) && !forb.some((s) => /리놀륨/.test(s));
  return decoOk || linoOk;
}

/** 크롬·수전: 전면 금지 문구가 있으면 제외(손상·코팅 등 조건부 금지는 허용 목록 유지) */
function productAllowsChromeFaucet(p: KnowledgeProduct): boolean {
  const mats = p.materialsRaw ?? [];
  const forb = p.forbiddenRaw ?? [];
  const allowed = mats.some((s) => /수전|수도꼭지|크롬/.test(s));
  if (!allowed) return false;
  return !forb.some(
    (s) => /수전|크롬/.test(s) && !/코팅|손상|민감|도금 부속|니켈|사전\s*테스트/.test(s)
  );
}

/** 재질에 문서상 적용 가능한 제품 (전면 금지 재질만 제외, 코팅·손상 등 조건부 금지는 유지) */
export function filterProductsForMaterial(
  products: KnowledgeProduct[],
  materialId: string
): KnowledgeProduct[] {
  if (materialId === "pvc-deco") {
    return products.filter(productAllowsPvcDecoFamily);
  }
  if (materialId === "chrome-faucet") {
    return products.filter(productAllowsChromeFaucet);
  }
  return products.filter(
    (p) =>
      Boolean(p.compatibleMaterialIds?.includes(materialId)) &&
      !productHardForbidsMaterial(p.forbiddenRaw, materialId)
  );
}

export function listProductsForMaterial(materialId: string): KnowledgeProduct[] {
  return filterProductsForMaterial(listProducts(), materialId);
}

export function listMaterials() {
  return getCleaningKnowledgeDb().materials;
}

export function listContaminants() {
  return getCleaningKnowledgeDb().contaminants;
}

export function listCases(): KnowledgeCaseEvidence[] {
  return getCleaningKnowledgeDb().cases ?? [];
}

export function getCaseById(id: string): KnowledgeCaseEvidence | undefined {
  return listCases().find((c) => c.id === id);
}

export function listCasesForProduct(productId: string): KnowledgeCaseEvidence[] {
  return listCases().filter((c) => c.productIds?.includes(productId));
}

export function getRecipeBySlug(slug: string): KnowledgeRecipe | undefined {
  return getCleaningKnowledgeDb().recipes.find((r) => r.slug === slug);
}

export function getProductById(id: string): KnowledgeProduct | undefined {
  return getCleaningKnowledgeDb().products.find((p) => p.id === id);
}

export function getMaterialById(id: string) {
  return getCleaningKnowledgeDb().materials.find((m) => m.id === id);
}

export function getContaminantById(id: string) {
  return getCleaningKnowledgeDb().contaminants.find((c) => c.id === id);
}

export function getFactsForGuidePath(path: string): KnowledgeFact[] {
  return getCleaningKnowledgeDb().facts.filter((f) => f.guidePaths?.includes(path));
}

export function getRecipesForGuidePath(path: string): KnowledgeRecipe[] {
  return getCleaningKnowledgeDb().recipes.filter((r) => recipeMatchesGuidePath(r, path));
}

export function getRecipeWithEnrichedPaths(slug: string): KnowledgeRecipe | undefined {
  const r = getCleaningKnowledgeDb().recipes.find((x) => x.slug === slug);
  if (!r) return undefined;
  return { ...r, guidePaths: enrichedGuidePathsForRecipe(r) };
}

export function searchRecipes(query: string): KnowledgeRecipe[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const db = getCleaningKnowledgeDb();
  return db.recipes.filter((r) => {
    const product = db.products.find((p) => p.id === r.productId);
    const material = db.materials.find((m) => m.id === r.materialId);
    const contaminant = db.contaminants.find((c) => c.id === r.contaminantId);
    const hay = [
      r.slug,
      r.seoTitle,
      r.summary,
      r.field,
      product?.name,
      ...(product?.aliases ?? []),
      material?.name,
      contaminant?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function knowledgeStats() {
  const db = getCleaningKnowledgeDb();
  return {
    products: db.products.length,
    recipes: db.recipes.length,
    facts: db.facts.length,
    materials: db.materials.length,
    contaminants: db.contaminants.length,
    rules: db.rules.length,
    cases: db.cases?.length ?? 0,
  };
}

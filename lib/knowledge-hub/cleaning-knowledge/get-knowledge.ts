import { INITIAL_CLEANING_KNOWLEDGE } from "@/lib/knowledge-hub/cleaning-knowledge/initial-knowledge";
import { SOURCE_DOC_KNOWLEDGE } from "@/lib/knowledge-hub/cleaning-knowledge/build-from-source";
import type {
  CleaningKnowledgeDb,
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

export function listProducts(): KnowledgeProduct[] {
  return getCleaningKnowledgeDb().products;
}

export function listMaterials() {
  return getCleaningKnowledgeDb().materials;
}

export function listContaminants() {
  return getCleaningKnowledgeDb().contaminants;
}

export function listCases() {
  return getCleaningKnowledgeDb().cases ?? [];
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

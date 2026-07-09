import { INITIAL_CLEANING_KNOWLEDGE } from "@/lib/knowledge-hub/cleaning-knowledge/initial-knowledge";
import type {
  CleaningKnowledgeDb,
  KnowledgeFact,
  KnowledgeProduct,
  KnowledgeRecipe,
} from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { recipeMatchesGuidePath, enrichedGuidePathsForRecipe } from "@/lib/knowledge-hub/recipe-guide-linker";

let cache: CleaningKnowledgeDb | null = null;

/** 런타임 단일 소스. 추후 DB·JSON 배치 병합 시 이 함수만 확장 */
export function getCleaningKnowledgeDb(): CleaningKnowledgeDb {
  if (!cache) {
    cache = INITIAL_CLEANING_KNOWLEDGE;
  }
  return cache;
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
      material?.name,
      contaminant?.name,
      ...(product?.mainUse ?? []),
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
    version: db.version,
    updatedAt: db.updatedAt,
    products: db.products.length,
    facts: db.facts.length,
    recipes: db.recipes.length,
    qaCases: db.qaCases.length,
    rules: db.rules.length,
  };
}

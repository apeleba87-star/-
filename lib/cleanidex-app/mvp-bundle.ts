/**
 * Cleanidex Flutter MVP — content DTO contract & bundle builder.
 * Keep this shape stable; Flutter models mirror these fields.
 */

import {
  getCleaningKnowledgeDb,
  getContaminantById,
  getMaterialById,
  getProductById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";

export type AppMvpProduct = {
  id: string;
  brand: string;
  name: string;
  aliases: string[];
  phApprox: string | null;
  standardDilution: string | null;
  strongDilution: string | null;
  summary: string | null;
  warnings: string[];
  contaminantIds: string[];
  compatibleMaterialIds: string[];
  forbiddenMaterialIds: string[];
  materialsRaw: string[];
  contaminantsRaw: string[];
  salesUrl: string | null;
  /** Search haystack (lowercase) */
  searchText: string;
};

export type AppMvpContaminant = {
  id: string;
  name: string;
  type: string;
  notes: string | null;
  /** Product ids that list this contaminant */
  productIds: string[];
  /** Recipe slugs for this contaminant */
  recipeSlugs: string[];
  searchText: string;
};

export type AppMvpRecipe = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  productId: string;
  productName: string;
  brand: string;
  materialId: string;
  materialName: string;
  contaminantId: string;
  contaminantName: string;
  dilution: string;
  dwellTime: string | null;
  tools: string[];
  steps: string[];
  warnings: string[];
  searchText: string;
  webPath: string;
};

export type AppMvpBundle = {
  meta: {
    version: number;
    generatedAt: string;
    purpose: string;
    webBaseUrl: string;
  };
  products: AppMvpProduct[];
  contaminants: AppMvpContaminant[];
  recipes: AppMvpRecipe[];
  /** Home quick chips — contaminant ids */
  quickContaminantIds: string[];
};

function haystack(parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => Boolean(p && String(p).trim()))
    .join(" ")
    .toLowerCase();
}

const QUICK_CONTAMINANT_IDS = [
  "limescale",
  "mold",
  "grease",
  "soap-scum",
  "lime-deposit",
  "rust",
  "urine-scale",
  "construction-dust",
];

export function buildAppMvpBundle(opts?: { webBaseUrl?: string }): AppMvpBundle {
  const db = getCleaningKnowledgeDb();
  const webBaseUrl = (opts?.webBaseUrl ?? "https://cleanindex.kr").replace(/\/$/, "");

  const products: AppMvpProduct[] = db.products
    .filter((p) => p.status !== "discontinued" && p.status !== "draft")
    .map((p) => ({
      id: p.id,
      brand: p.brand,
      name: p.name,
      aliases: p.aliases ?? [],
      phApprox: p.phApprox ?? null,
      standardDilution: p.standardDilution?.trim() || null,
      strongDilution: p.strongDilution?.trim() || null,
      summary: p.summary?.trim() || null,
      warnings: p.warnings ?? [],
      contaminantIds: p.contaminantIds ?? [],
      compatibleMaterialIds: p.compatibleMaterialIds ?? [],
      forbiddenMaterialIds: p.forbiddenMaterialIds ?? [],
      materialsRaw: p.materialsRaw ?? [],
      contaminantsRaw: p.contaminantsRaw ?? [],
      salesUrl: p.salesUrl ?? null,
      searchText: haystack([
        p.brand,
        p.name,
        ...(p.aliases ?? []),
        p.standardDilution,
        ...(p.contaminantsRaw ?? []),
        ...(p.materialsRaw ?? []),
      ]),
    }));

  const recipes: AppMvpRecipe[] = db.recipes.map((r) => {
    const product = getProductById(r.productId);
    const material = getMaterialById(r.materialId);
    const contaminant = getContaminantById(r.contaminantId);
    return {
      id: r.id,
      slug: r.slug,
      title: r.seoTitle || r.summary.slice(0, 48),
      summary: r.summary,
      productId: r.productId,
      productName: product?.name ?? r.productId,
      brand: product?.brand ?? "",
      materialId: r.materialId,
      materialName: material?.name ?? r.materialId,
      contaminantId: r.contaminantId,
      contaminantName: contaminant?.name ?? r.contaminantId,
      dilution: r.dilution,
      dwellTime: r.dwellTime ?? null,
      tools: r.tools ?? [],
      steps: r.steps ?? [],
      warnings: r.warnings ?? [],
      searchText: haystack([
        r.seoTitle,
        r.summary,
        r.dilution,
        product?.name,
        product?.brand,
        contaminant?.name,
        material?.name,
        ...(r.tools ?? []),
      ]),
      webPath: `/cleaning/${r.slug}`,
    };
  });

  const productIdsByContaminant = new Map<string, Set<string>>();
  for (const p of products) {
    for (const cid of p.contaminantIds) {
      if (!productIdsByContaminant.has(cid)) productIdsByContaminant.set(cid, new Set());
      productIdsByContaminant.get(cid)!.add(p.id);
    }
  }
  const recipeSlugsByContaminant = new Map<string, string[]>();
  for (const r of recipes) {
    const list = recipeSlugsByContaminant.get(r.contaminantId) ?? [];
    list.push(r.slug);
    recipeSlugsByContaminant.set(r.contaminantId, list);
  }

  const contaminants: AppMvpContaminant[] = db.contaminants.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    notes: c.notes ?? null,
    productIds: [...(productIdsByContaminant.get(c.id) ?? [])],
    recipeSlugs: recipeSlugsByContaminant.get(c.id) ?? [],
    searchText: haystack([c.name, c.notes, c.type]),
  }));

  const quickContaminantIds = QUICK_CONTAMINANT_IDS.filter((id) =>
    contaminants.some((c) => c.id === id)
  );

  return {
    meta: {
      version: 1,
      generatedAt: new Date().toISOString(),
      purpose: "Cleanidex Flutter MVP offline content pack",
      webBaseUrl,
    },
    products,
    contaminants,
    recipes,
    quickContaminantIds,
  };
}

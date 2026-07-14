import {
  getContaminantById,
  getRecipeBySlug,
  listRecipes,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import { CONTAMINANT_TYPE_KO } from "@/lib/knowledge-hub/korean-labels";
import { SOURCE_SOLUTIONS_DB } from "@/lib/knowledge-hub/solutions/seed";
import {
  getDbContaminantMasters,
  getDbSolutionPages,
} from "@/lib/knowledge-hub/solutions/solution-store";
import {
  getPartLabel,
  getPlaceLabel,
  getSpaceLabel,
} from "@/lib/knowledge-hub/solutions/taxonomy";
import type {
  ContaminantMasterExt,
  MaterialContaminantMaster,
  SolutionDetailBody,
  SolutionPage,
  SolutionRecommendProduct,
  SolutionStarRating,
  SolutionsDb,
} from "@/lib/knowledge-hub/solutions/types";

let cache: SolutionsDb | null = null;

export function getSolutionsDb(): SolutionsDb {
  if (!cache) cache = SOURCE_SOLUTIONS_DB;
  return cache;
}

/** Seed + DB published pages (DB wins on same id; keep seed detail if DB omits it) */
export async function listMergedSolutionPages(): Promise<SolutionPage[]> {
  const seed = getSolutionsDb().pages.filter((p) => p.status === "published");
  const dbPages = await getDbSolutionPages();
  const map = new Map<string, SolutionPage>();
  for (const p of seed) map.set(p.id, p);
  for (const p of dbPages) {
    const prev = map.get(p.id);
    if (!prev) {
      map.set(p.id, p);
      continue;
    }
    map.set(p.id, {
      ...prev,
      ...p,
      detail: p.detail ?? prev.detail,
      productIds: p.productIds ?? prev.productIds,
      placeContext: p.placeContext ?? prev.placeContext,
      description: p.description ?? prev.description,
      materialId: p.materialId ?? prev.materialId,
      materialContaminantId: p.materialContaminantId ?? prev.materialContaminantId,
    });
  }
  return [...map.values()];
}

export function listSolutionPages(opts?: { publishedOnly?: boolean }): SolutionPage[] {
  const pages = getSolutionsDb().pages;
  if (opts?.publishedOnly === false) return pages;
  return pages.filter((p) => p.status === "published");
}

export async function getMergedSolutionPage(
  place: string,
  space: string,
  part: string,
  slug: string
): Promise<SolutionPage | undefined> {
  const pages = await listMergedSolutionPages();
  return pages.find(
    (p) => p.placeId === place && p.spaceId === space && p.partId === part && p.slug === slug
  );
}

export function getSolutionPath(page: SolutionPage): string {
  return `/solutions/${page.placeId}/${page.spaceId}/${page.partId}/${page.slug}`;
}

/** Catalog / hub card DTO — shared by /solutions and /pollution */
export type SolutionCardData = {
  id: string;
  placeId: string;
  spaceId: string;
  partId: string;
  placeLabel: string;
  spaceLabel: string;
  partLabel: string;
  title: string;
  path: string;
};

export function toSolutionCardData(page: SolutionPage): SolutionCardData {
  return {
    id: page.id,
    placeId: page.placeId,
    spaceId: page.spaceId,
    partId: page.partId,
    placeLabel: getPlaceLabel(page.placeId),
    spaceLabel: getSpaceLabel(page.spaceId, page.placeId),
    partLabel: getPartLabel(page.partId, page.spaceId),
    title: page.title,
    path: getSolutionPath(page),
  };
}

export function listSolutionCardData(opts?: { publishedOnly?: boolean }): SolutionCardData[] {
  return listSolutionPages(opts).map(toSolutionCardData);
}

export const SOLUTIONS_FINDER_SUBTITLE =
  "검색하거나, 장소 → 공간 → 부위 순으로 고르세요.";

export function getContaminantMaster(contaminantId: string): ContaminantMasterExt | undefined {
  return getSolutionsDb().contaminantMasters.find((m) => m.contaminantId === contaminantId);
}

export async function getMergedContaminantMaster(
  contaminantId: string
): Promise<ContaminantMasterExt | undefined> {
  const dbMasters = await getDbContaminantMasters();
  const fromDb = dbMasters.find((m) => m.contaminantId === contaminantId);
  if (fromDb) return fromDb;
  return getContaminantMaster(contaminantId);
}

export function getMaterialContaminant(id: string): MaterialContaminantMaster | undefined {
  return getSolutionsDb().materialContaminants.find((m) => m.id === id);
}

function isSiblingPage(page: SolutionPage, other: SolutionPage): boolean {
  return (
    other.id !== page.id &&
    other.placeId === page.placeId &&
    other.spaceId === page.spaceId &&
    other.partId === page.partId
  );
}

export async function listMergedSiblingSolutions(page: SolutionPage): Promise<SolutionPage[]> {
  const pages = await listMergedSolutionPages();
  return pages.filter((p) => isSiblingPage(page, p));
}

export function listSolutionsByContaminant(contaminantId: string): SolutionPage[] {
  return listSolutionPages().filter((p) => p.contaminantId === contaminantId);
}

export type SolutionViewRecommendation = {
  productId?: string;
  label: string;
  rating: SolutionStarRating;
  dilution?: string;
  href?: string;
};

/** Flattened, UI-ready content for the simplified detail layout */
export type SolutionViewContent = {
  summary: string;
  contaminantTypeLabel: string;
  difficulty?: SolutionStarRating;
  locations: string[];
  recommendations: SolutionViewRecommendation[];
  methodSteps: string[];
  cautions: string[];
  ifFails: string[];
};

export type AssembledSolution = {
  page: SolutionPage;
  path: string;
  placeLabel: string;
  spaceLabel: string;
  partLabel: string;
  contaminantName: string;
  siblings: SolutionPage[];
  content: SolutionViewContent;
};

function confidenceToStars(confidence?: string): SolutionStarRating {
  if (confidence === "high") return 5;
  if (confidence === "low") return 2;
  return 3;
}

function firstSentence(text: string): string {
  const t = text.trim();
  const m = t.match(/^(.{12,160}?[。.!?])(?:\s|$)/);
  return m?.[1] ?? t.slice(0, 120);
}

function buildRecommendations(
  detail: SolutionDetailBody | undefined,
  products: KnowledgeProduct[],
  productById: Map<string, KnowledgeProduct>
): SolutionViewRecommendation[] {
  if (detail?.recommendations?.length) {
    return detail.recommendations.map((r: SolutionRecommendProduct) => {
      const product = r.productId ? productById.get(r.productId) : undefined;
      const dilution =
        (r.dilution && r.dilution.trim()) ||
        product?.standardDilution?.trim() ||
        undefined;
      return {
        productId: r.productId,
        label: r.label || product?.name || r.productId || "",
        rating: r.rating,
        dilution,
        href: r.productId ? `/products/${r.productId}` : undefined,
      };
    });
  }
  return products.map((p) => ({
    productId: p.id,
    label: p.name,
    rating: confidenceToStars(p.confidence),
    dilution: p.standardDilution?.trim() || undefined,
    href: `/products/${p.id}`,
  }));
}

function buildMethodSteps(
  detail: SolutionDetailBody | undefined,
  recipeSlugs: string[]
): string[] {
  if (detail?.methodSteps?.length) return detail.methodSteps;
  for (const slug of recipeSlugs) {
    const recipe = getRecipeBySlug(slug);
    if (recipe?.steps?.length) return recipe.steps;
  }
  return [];
}

function buildCautions(
  detail: SolutionDetailBody | undefined,
  warnings: string[],
  recipeSlugs: string[]
): string[] {
  if (detail?.cautions?.length) return detail.cautions;
  const fromRecipe: string[] = [];
  for (const slug of recipeSlugs) {
    const recipe = getRecipeBySlug(slug);
    if (recipe?.warnings?.length) {
      fromRecipe.push(...recipe.warnings);
      break;
    }
  }
  const merged = [...warnings, ...fromRecipe];
  return [...new Set(merged)];
}

function buildIfFails(detail: SolutionDetailBody | undefined, siblings: SolutionPage[]): string[] {
  if (detail?.ifFails?.length) return detail.ifFails;
  return siblings.slice(0, 4).map((s) => s.title.replace(/^가정집\s+|상가\s+/u, ""));
}

function buildSolutionViewContent(args: {
  page: SolutionPage;
  contaminantName: string;
  contaminantType?: string;
  partLabel: string;
  master?: ContaminantMasterExt;
  products: KnowledgeProduct[];
  productById: Map<string, KnowledgeProduct>;
  recipeSlugs: string[];
  siblings: SolutionPage[];
  warnings: string[];
}): SolutionViewContent {
  const {
    page,
    contaminantName,
    contaminantType,
    partLabel,
    master,
    products,
    productById,
    recipeSlugs,
    siblings,
    warnings,
  } = args;
  const detail = page.detail;
  const typeKey = contaminantType as keyof typeof CONTAMINANT_TYPE_KO | undefined;
  const contaminantTypeLabel =
    (typeKey && CONTAMINANT_TYPE_KO[typeKey]) || "미분류";

  const summary =
    detail?.summary?.trim() ||
    (page.placeContext ? firstSentence(page.placeContext) : "") ||
    (master?.baseGuide ? firstSentence(master.baseGuide) : "") ||
    `${partLabel}에 생긴 ${contaminantName} 제거 안내입니다.`;

  const locations = detail?.locations?.length ? detail.locations : [partLabel];

  return {
    summary,
    contaminantTypeLabel,
    difficulty: detail?.difficulty,
    locations,
    recommendations: buildRecommendations(detail, products, productById),
    methodSteps: buildMethodSteps(detail, recipeSlugs),
    cautions: buildCautions(detail, warnings, recipeSlugs),
    ifFails: buildIfFails(detail, siblings),
  };
}

export async function assembleSolution(
  place: string,
  space: string,
  part: string,
  slug: string
): Promise<AssembledSolution | null> {
  const page = await getMergedSolutionPage(place, space, part, slug);
  if (!page) return null;

  const master = await getMergedContaminantMaster(page.contaminantId);
  const materialContam = page.materialContaminantId
    ? getMaterialContaminant(page.materialContaminantId)
    : undefined;
  const contaminant = getContaminantById(page.contaminantId);
  const materialId =
    page.materialId ??
    materialContam?.materialId ??
    getSolutionsDb().parts.find((p) => p.id === page.partId)?.defaultMaterialId;

  const productIds = page.productIds?.length
    ? page.productIds
    : (master?.defaultProductIds ?? []);
  const allProducts = await listMergedProducts();
  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const products = productIds
    .map((id) => productById.get(id))
    .filter((p): p is KnowledgeProduct => Boolean(p));

  const recipeSlugs = new Set<string>(materialContam?.recipeSlugs ?? []);
  for (const r of listRecipes()) {
    if (r.contaminantId !== page.contaminantId) continue;
    if (materialId && r.materialId !== materialId) continue;
    recipeSlugs.add(r.slug);
  }

  const warnings = [...(master?.warnings ?? []), ...(materialContam?.warnings ?? [])];
  const siblings = await listMergedSiblingSolutions(page);
  const recipeSlugList = [...recipeSlugs].slice(0, 8);
  const placeLabel = getPlaceLabel(page.placeId);
  const spaceLabel = getSpaceLabel(page.spaceId, page.placeId);
  const partLabel = getPartLabel(page.partId, page.spaceId);
  const contaminantName = contaminant?.name ?? page.contaminantId;

  return {
    page,
    path: getSolutionPath(page),
    placeLabel,
    spaceLabel,
    partLabel,
    contaminantName,
    siblings,
    content: buildSolutionViewContent({
      page,
      contaminantName,
      contaminantType: contaminant?.type,
      partLabel,
      master,
      products,
      productById,
      recipeSlugs: recipeSlugList,
      siblings,
      warnings,
    }),
  };
}

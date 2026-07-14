import { unstable_cache } from "next/cache";
import { createClient, createServiceSupabase } from "@/lib/supabase-server";
import type {
  ContaminantMasterExt,
  SolutionDetailBody,
  SolutionPage,
  SolutionPlaceId,
  SolutionSpaceId,
  SolutionPartId,
  SolutionRecommendProduct,
  SolutionStarRating,
  SolutionStatus,
} from "@/lib/knowledge-hub/solutions/types";

export const SOLUTION_MASTERS_CACHE_TAG = "cleaning-contaminant-masters";
export const SOLUTION_PAGES_CACHE_TAG = "cleaning-solution-pages";

const PAGE_SELECT =
  "id, place_id, space_id, part_id, contaminant_id, slug, material_id, title, description, place_context, product_ids, material_contaminant_id, status, detail";

function asStar(n: unknown): SolutionStarRating | undefined {
  const v = typeof n === "number" ? n : Number(n);
  if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5) return v;
  return undefined;
}

/** Validate / normalize detail JSON from DB or API */
export function normalizeSolutionDetail(raw: unknown): SolutionDetailBody | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const recommendations: SolutionRecommendProduct[] = [];
  if (Array.isArray(o.recommendations)) {
    for (const item of o.recommendations) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label.trim() : "";
      const rating = asStar(r.rating);
      if (!label || !rating) continue;
      recommendations.push({
        label,
        rating,
        productId: typeof r.productId === "string" && r.productId ? r.productId : undefined,
      });
    }
  }
  const difficulty = asStar(o.difficulty);
  const strList = (key: string) =>
    Array.isArray(o[key])
      ? (o[key] as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
      : undefined;

  const detail: SolutionDetailBody = {
    summary: typeof o.summary === "string" && o.summary.trim() ? o.summary.trim() : undefined,
    difficulty,
    locations: strList("locations"),
    recommendations: recommendations.length ? recommendations : undefined,
    methodSteps: strList("methodSteps"),
    cautions: strList("cautions"),
    ifFails: strList("ifFails"),
  };

  if (
    !detail.summary &&
    !detail.difficulty &&
    !detail.locations?.length &&
    !detail.recommendations?.length &&
    !detail.methodSteps?.length &&
    !detail.cautions?.length &&
    !detail.ifFails?.length
  ) {
    return undefined;
  }
  return detail;
}

function mapRowToPage(row: Record<string, unknown>): SolutionPage {
  return {
    id: row.id as string,
    placeId: row.place_id as SolutionPlaceId,
    spaceId: row.space_id as SolutionSpaceId,
    partId: row.part_id as SolutionPartId,
    contaminantId: row.contaminant_id as string,
    slug: row.slug as string,
    materialId: (row.material_id as string | null) ?? undefined,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    placeContext: (row.place_context as string | null) ?? undefined,
    productIds: (row.product_ids as string[] | null) ?? undefined,
    materialContaminantId: (row.material_contaminant_id as string | null) ?? undefined,
    detail: normalizeSolutionDetail(row.detail),
    status: row.status as SolutionStatus,
  };
}

async function loadContaminantMastersFromDb(): Promise<ContaminantMasterExt[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cleaning_contaminant_masters")
      .select("contaminant_id, product_ids, base_guide, warnings");
    if (error || !data) return [];
    return data.map((row) => ({
      contaminantId: row.contaminant_id as string,
      defaultProductIds: (row.product_ids as string[]) ?? [],
      baseGuide: (row.base_guide as string | null) ?? undefined,
      warnings: (row.warnings as string[]) ?? undefined,
    }));
  } catch {
    return [];
  }
}

async function loadSolutionPagesFromDb(): Promise<SolutionPage[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cleaning_solution_pages")
      .select(PAGE_SELECT)
      .eq("status", "published");
    if (error || !data) return [];
    return data.map((row) => mapRowToPage(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export function getDbContaminantMasters(): Promise<ContaminantMasterExt[]> {
  return unstable_cache(loadContaminantMastersFromDb, ["cleaning-contaminant-masters"], {
    revalidate: 3600,
    tags: [SOLUTION_MASTERS_CACHE_TAG],
  })();
}

export function getDbSolutionPages(): Promise<SolutionPage[]> {
  return unstable_cache(loadSolutionPagesFromDb, ["cleaning-solution-pages-pub"], {
    revalidate: 3600,
    tags: [SOLUTION_PAGES_CACHE_TAG],
  })();
}

export async function upsertContaminantMaster(
  contaminantId: string,
  productIds: string[],
  baseGuide: string | null,
  warnings: string[],
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceSupabase();
  const { error } = await supabase.from("cleaning_contaminant_masters").upsert(
    {
      contaminant_id: contaminantId,
      product_ids: productIds,
      base_guide: baseGuide?.trim() || null,
      warnings,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contaminant_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertSolutionPage(
  page: SolutionPage,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceSupabase();
  const { error } = await supabase.from("cleaning_solution_pages").upsert(
    {
      id: page.id,
      place_id: page.placeId,
      space_id: page.spaceId,
      part_id: page.partId,
      contaminant_id: page.contaminantId,
      slug: page.slug,
      material_id: page.materialId ?? null,
      title: page.title,
      description: page.description ?? null,
      place_context: page.placeContext ?? null,
      product_ids: page.productIds ?? null,
      material_contaminant_id: page.materialContaminantId ?? null,
      detail: page.detail ?? null,
      status: page.status,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: list all DB pages including draft */
export async function listAllDbSolutionPages(): Promise<SolutionPage[]> {
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase.from("cleaning_solution_pages").select(PAGE_SELECT);
    if (error || !data) return [];
    return data.map((row) => mapRowToPage(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

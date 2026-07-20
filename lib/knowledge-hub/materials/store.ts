import { unstable_cache } from "next/cache";
import { createServiceSupabase } from "@/lib/supabase-server";
import type { MaterialGuideRecord, MaterialGuideStatus } from "@/lib/knowledge-hub/materials/types";

export const MATERIAL_GUIDES_CACHE_TAG = "cleaning-material-guides";

const SELECT = "material_id, principle, donts, ok_hints, care, status";

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

function mapRow(row: Record<string, unknown>): MaterialGuideRecord {
  const status = row.status as MaterialGuideStatus;
  return {
    materialId: row.material_id as string,
    principle: typeof row.principle === "string" ? row.principle : "",
    donts: asStringList(row.donts),
    okHints: asStringList(row.ok_hints),
    care: asStringList(row.care),
    status: status === "published" || status === "draft" || status === "archived" ? status : "draft",
  };
}

async function loadPublishedFromDb(): Promise<MaterialGuideRecord[]> {
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from("cleaning_material_guides")
      .select(SELECT)
      .eq("status", "published");
    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export function getDbMaterialGuidesPublished(): Promise<MaterialGuideRecord[]> {
  return unstable_cache(loadPublishedFromDb, ["cleaning-material-guides-pub"], {
    revalidate: 3600,
    tags: [MATERIAL_GUIDES_CACHE_TAG],
  })();
}

export async function listAllDbMaterialGuides(): Promise<MaterialGuideRecord[]> {
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase.from("cleaning_material_guides").select(SELECT);
    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function upsertMaterialGuide(
  guide: MaterialGuideRecord,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceSupabase();
  const { error } = await supabase.from("cleaning_material_guides").upsert(
    {
      material_id: guide.materialId,
      principle: guide.principle,
      donts: guide.donts,
      ok_hints: guide.okHints,
      care: guide.care,
      status: guide.status,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "material_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Soft-delete override → public falls back to seed */
export async function archiveMaterialGuide(
  materialId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = (await listAllDbMaterialGuides()).find((g) => g.materialId === materialId);
  return upsertMaterialGuide(
    {
      materialId,
      principle: existing?.principle ?? "",
      donts: existing?.donts ?? [],
      okHints: existing?.okHints ?? [],
      care: existing?.care ?? [],
      status: "archived",
    },
    userId
  );
}

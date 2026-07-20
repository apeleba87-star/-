import { unstable_cache } from "next/cache";
import { createServiceSupabase } from "@/lib/supabase-server";
import type { PlaceJob, PlaceJobPollutionLink, PlaceJobStatus } from "@/lib/knowledge-hub/place-jobs/types";

export const PLACE_JOBS_CACHE_TAG = "cleaning-place-jobs";

const SELECT =
  "id, place_id, slug, title, summary, prepare, steps, motions, checklist, frequency, cautions, pollution_links, related_service_path, status, sort_order";

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

function asLinks(v: unknown): PlaceJobPollutionLink[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: PlaceJobPollutionLink[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const href = typeof o.href === "string" ? o.href.trim() : "";
    if (label && href) out.push({ label, href });
  }
  return out.length ? out : undefined;
}

function mapRow(row: Record<string, unknown>): PlaceJob {
  const status = row.status as PlaceJobStatus;
  return {
    id: row.id as string,
    placeId: row.place_id as string,
    slug: row.slug as string,
    title: row.title as string,
    summary: (row.summary as string | null) ?? undefined,
    prepare: asStringList(row.prepare),
    steps: asStringList(row.steps),
    motions: asStringList(row.motions),
    checklist: asStringList(row.checklist),
    frequency: (row.frequency as string | null) ?? undefined,
    cautions: asStringList(row.cautions),
    pollutionLinks: asLinks(row.pollution_links),
    relatedServicePath: (row.related_service_path as string | null) ?? undefined,
    status: status === "published" || status === "draft" || status === "archived" ? status : "draft",
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

async function loadPublishedFromDb(): Promise<PlaceJob[]> {
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from("cleaning_place_jobs")
      .select(SELECT)
      .eq("status", "published");
    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

async function loadArchivedIds(): Promise<string[]> {
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from("cleaning_place_jobs")
      .select("id")
      .eq("status", "archived");
    if (error || !data) return [];
    return data.map((r) => r.id as string);
  } catch {
    return [];
  }
}

export function getDbPlaceJobsPublished(): Promise<PlaceJob[]> {
  return unstable_cache(loadPublishedFromDb, ["cleaning-place-jobs-pub"], {
    revalidate: 3600,
    tags: [PLACE_JOBS_CACHE_TAG],
  })();
}

export function getArchivedPlaceJobIds(): Promise<string[]> {
  return unstable_cache(loadArchivedIds, ["cleaning-place-jobs-archived"], {
    revalidate: 3600,
    tags: [PLACE_JOBS_CACHE_TAG],
  })();
}

export async function listAllDbPlaceJobs(): Promise<PlaceJob[]> {
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase.from("cleaning_place_jobs").select(SELECT);
    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function upsertPlaceJob(
  job: PlaceJob,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceSupabase();
  const { error } = await supabase.from("cleaning_place_jobs").upsert(
    {
      id: job.id,
      place_id: job.placeId,
      slug: job.slug,
      title: job.title,
      summary: job.summary ?? null,
      prepare: job.prepare,
      steps: job.steps,
      motions: job.motions,
      checklist: job.checklist,
      frequency: job.frequency ?? null,
      cautions: job.cautions,
      pollution_links: job.pollutionLinks ?? null,
      related_service_path: job.relatedServicePath ?? null,
      status: job.status,
      sort_order: job.sortOrder,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function archivePlaceJob(
  job: PlaceJob,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return upsertPlaceJob({ ...job, status: "archived" }, userId);
}

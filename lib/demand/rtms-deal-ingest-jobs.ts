import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDistrictTargets,
  DEMAND_RTMS_DEAL_SOURCE_GROUPS,
  monthKeysBackFromPreviousKstMonth,
  runDemandRtmsDealIngestUnit,
  type DemandRtmsDealSourceGroup,
} from "@/lib/demand/rtms-deals-ingest";

type RtmsDealIngestJobRow = {
  id: number;
  batch_key: string;
  city_id: string;
  city_label: string;
  district_slug: string;
  district_label: string;
  region_key: string;
  lawd_cd: string;
  target_yyyymm: string;
  source_group: string;
  status: "pending" | "running" | "success" | "failed";
  attempts: number;
  rows_upserted: number;
  calls: number;
  last_error: string | null;
};

type JobInsert = Omit<
  RtmsDealIngestJobRow,
  "id" | "status" | "attempts" | "rows_upserted" | "calls" | "last_error"
>;

export type RtmsDealIngestJobStats = {
  ok: true;
  batchKey: string | null;
  total: number;
  pending: number;
  running: number;
  success: number;
  failed: number;
};

export type RtmsDealJobPlanOptions = {
  batchKey?: string;
  monthsBack?: number;
  cityId?: string;
  districtSlugs?: string[];
  sourceGroups?: DemandRtmsDealSourceGroup[];
};

const JOB_INSERT_CHUNK_SIZE = 500;
const DEFAULT_MAX_JOBS = 5;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_STALE_MINUTES = 15;
const DEFAULT_MAX_RUNTIME_MS = 120_000;

function isSourceGroup(value: string): value is DemandRtmsDealSourceGroup {
  return (DEMAND_RTMS_DEAL_SOURCE_GROUPS as string[]).includes(value);
}

export function currentRtmsDealBatchKey(now = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `rtms-deals-${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function upsertJobChunk(supabase: SupabaseClient, rows: JobInsert[]): Promise<number> {
  if (!rows.length) return 0;
  const { error } = await supabase
    .from("demand_rtms_deal_ingest_jobs")
    .upsert(rows, {
      onConflict: "batch_key,region_key,target_yyyymm,source_group",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function createDemandRtmsDealIngestJobs(
  supabase: SupabaseClient,
  options: RtmsDealJobPlanOptions = {}
): Promise<{ ok: true; batchKey: string; jobs: number; months: string[]; districts: number; sourceGroups: number } | { ok: false; error: string }> {
  try {
    const batchKey = options.batchKey?.trim() || currentRtmsDealBatchKey();
    const months = monthKeysBackFromPreviousKstMonth(Math.min(Math.max(Math.round(options.monthsBack ?? 2), 1), 24));
    const targets = buildDistrictTargets(options.cityId, options.districtSlugs);
    const sourceGroups = options.sourceGroups?.length ? options.sourceGroups : DEMAND_RTMS_DEAL_SOURCE_GROUPS;
    let jobs = 0;
    let chunk: JobInsert[] = [];

    for (const target of targets) {
      for (const targetYyyymm of months) {
        for (const sourceGroup of sourceGroups) {
          chunk.push({
            batch_key: batchKey,
            city_id: target.cityId,
            city_label: target.cityLabel,
            district_slug: target.districtSlug,
            district_label: target.districtLabel,
            region_key: target.regionKey,
            lawd_cd: target.lawdCd,
            target_yyyymm: targetYyyymm,
            source_group: sourceGroup,
          });
          if (chunk.length >= JOB_INSERT_CHUNK_SIZE) {
            jobs += await upsertJobChunk(supabase, chunk);
            chunk = [];
          }
        }
      }
    }

    jobs += await upsertJobChunk(supabase, chunk);
    return { ok: true, batchKey, jobs, months, districts: targets.length, sourceGroups: sourceGroups.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getDemandRtmsDealIngestJobStats(
  supabase: SupabaseClient,
  batchKey?: string
): Promise<RtmsDealIngestJobStats | { ok: false; error: string }> {
  try {
    let resolvedBatchKey = batchKey?.trim() || null;
    if (!resolvedBatchKey) {
      const { data, error } = await supabase
        .from("demand_rtms_deal_ingest_jobs")
        .select("batch_key")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      resolvedBatchKey = data?.batch_key ?? null;
    }

    if (!resolvedBatchKey) {
      return { ok: true, batchKey: null, total: 0, pending: 0, running: 0, success: 0, failed: 0 };
    }

    const statuses = ["pending", "running", "success", "failed"] as const;
    const counts = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await supabase
          .from("demand_rtms_deal_ingest_jobs")
          .select("*", { count: "exact", head: true })
          .eq("batch_key", resolvedBatchKey)
          .eq("status", status);
        if (error) throw new Error(error.message);
        return [status, count ?? 0] as const;
      })
    );
    const byStatus = Object.fromEntries(counts) as Record<(typeof statuses)[number], number>;
    return {
      ok: true,
      batchKey: resolvedBatchKey,
      total: byStatus.pending + byStatus.running + byStatus.success + byStatus.failed,
      pending: byStatus.pending,
      running: byStatus.running,
      success: byStatus.success,
      failed: byStatus.failed,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function retryFailedDemandRtmsDealIngestJobs(
  supabase: SupabaseClient,
  batchKey?: string
): Promise<{ ok: true; reset: number } | { ok: false; error: string }> {
  try {
    let query = supabase
      .from("demand_rtms_deal_ingest_jobs")
      .update({ status: "pending", attempts: 0, locked_at: null, last_error: null, updated_at: new Date().toISOString() })
      .eq("status", "failed")
      .select("id");
    if (batchKey?.trim()) query = query.eq("batch_key", batchKey.trim());
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true, reset: data?.length ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function processDemandRtmsDealIngestJobs(
  supabase: SupabaseClient,
  options: { maxJobs?: number; staleMinutes?: number; maxAttempts?: number; maxRuntimeMs?: number } = {}
): Promise<{ ok: true; claimed: number; processed: number; succeeded: number; failed: number } | { ok: false; error: string }> {
  const maxJobs = Math.min(Math.max(Math.round(options.maxJobs ?? DEFAULT_MAX_JOBS), 1), 25);
  const staleMinutes = Math.min(Math.max(Math.round(options.staleMinutes ?? DEFAULT_STALE_MINUTES), 1), 120);
  const maxAttempts = Math.min(Math.max(Math.round(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS), 1), 20);
  const maxRuntimeMs = Math.min(Math.max(Math.round(options.maxRuntimeMs ?? DEFAULT_MAX_RUNTIME_MS), 10_000), 240_000);
  const startedAt = Date.now();

  try {
    const { data, error } = await supabase.rpc("claim_demand_rtms_deal_ingest_jobs", {
      p_limit: maxJobs,
      p_stale_minutes: staleMinutes,
      p_max_attempts: maxAttempts,
    });
    if (error) throw new Error(error.message);

    const jobs = (data ?? []) as RtmsDealIngestJobRow[];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      if (Date.now() - startedAt > maxRuntimeMs) break;
      processed += 1;
      if (!isSourceGroup(job.source_group)) {
        await supabase
          .from("demand_rtms_deal_ingest_jobs")
          .update({
            status: "failed",
            last_error: `Unknown source group: ${job.source_group}`,
            locked_at: null,
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        failed += 1;
        continue;
      }

      const result = await runDemandRtmsDealIngestUnit(supabase, {
        cityId: job.city_id,
        cityLabel: job.city_label,
        districtSlug: job.district_slug,
        districtLabel: job.district_label,
        regionKey: job.region_key,
        lawdCd: job.lawd_cd,
        targetYyyymm: job.target_yyyymm,
        sourceGroup: job.source_group,
      });

      const now = new Date().toISOString();
      if (result.ok) {
        const { error: updateError } = await supabase
          .from("demand_rtms_deal_ingest_jobs")
          .update({
            status: "success",
            rows_upserted: result.rows,
            calls: result.calls,
            last_error: null,
            locked_at: null,
            finished_at: now,
            updated_at: now,
          })
          .eq("id", job.id);
        if (updateError) throw new Error(updateError.message);
        succeeded += 1;
      } else {
        const nextStatus = job.attempts >= maxAttempts ? "failed" : "pending";
        const { error: updateError } = await supabase
          .from("demand_rtms_deal_ingest_jobs")
          .update({
            status: nextStatus,
            last_error: result.error,
            locked_at: null,
            finished_at: now,
            updated_at: now,
          })
          .eq("id", job.id);
        if (updateError) throw new Error(updateError.message);
        failed += 1;
      }
    }

    return { ok: true, claimed: jobs.length, processed, succeeded, failed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

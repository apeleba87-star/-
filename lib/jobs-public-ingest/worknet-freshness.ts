import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_OPEN_DATA_SOURCE_WORKNET_WANTED } from "@/lib/jobs-public-ingest/source-slugs";

/** 12시간 cron 기준 — 이보다 오래된 raw면 API 목록에서 빠진 것으로 간주 (service_role 전용) */
export const WORKNET_RAW_FRESH_MAX_AGE_MS = 26 * 60 * 60 * 1000;

/** 공개 목록 — raw 테이블(RLS) 대신 public_job_openings.last_synced_at */
export const PUBLIC_JOB_SYNC_FRESH_MAX_AGE_MS = 48 * 60 * 60 * 1000;

const RAW_BATCH = 100;

export function publicJobSyncFreshCutoffIso(
  now = Date.now(),
  maxAgeMs = PUBLIC_JOB_SYNC_FRESH_MAX_AGE_MS
): string {
  return new Date(now - maxAgeMs).toISOString();
}

export function isPublicJobSyncFresh(
  job: { last_synced_at?: string | null },
  maxAgeMs = PUBLIC_JOB_SYNC_FRESH_MAX_AGE_MS
): boolean {
  if (!job.last_synced_at) return false;
  const t = new Date(job.last_synced_at).getTime();
  return Number.isFinite(t) && t >= Date.now() - maxAgeMs;
}

export function filterPublicJobsBySyncFresh<
  T extends { last_synced_at: string },
>(jobs: T[], maxAgeMs = PUBLIC_JOB_SYNC_FRESH_MAX_AGE_MS): T[] {
  return jobs.filter((j) => isPublicJobSyncFresh(j, maxAgeMs));
}

function rawFreshCutoffIso(now = Date.now(), maxAgeMs = WORKNET_RAW_FRESH_MAX_AGE_MS): string {
  return new Date(now - maxAgeMs).toISOString();
}

/** 최근 수집 raw에 있는 공고만 (고용24 목록 이탈·마감 잔존 제거) */
export async function filterJobsWithFreshWorknetRaw<
  T extends { wanted_auth_no: string },
>(supabase: SupabaseClient, jobs: T[], maxAgeMs = WORKNET_RAW_FRESH_MAX_AGE_MS): Promise<T[]> {
  if (jobs.length === 0) return jobs;

  const cutoff = rawFreshCutoffIso(Date.now(), maxAgeMs);
  const freshIds = new Set<string>();

  for (let i = 0; i < jobs.length; i += RAW_BATCH) {
    const batch = jobs.slice(i, i + RAW_BATCH).map((j) => j.wanted_auth_no.trim());
    if (batch.length === 0) continue;

    const { data } = await supabase
      .from("job_open_data_raw")
      .select("source_record_id")
      .eq("source_slug", JOB_OPEN_DATA_SOURCE_WORKNET_WANTED)
      .in("source_record_id", batch)
      .gte("last_fetched_at", cutoff);

    for (const row of data ?? []) {
      if (row.source_record_id) freshIds.add(row.source_record_id);
    }
  }

  return jobs.filter((j) => freshIds.has(j.wanted_auth_no.trim()));
}

export async function isWorknetJobRawFresh(
  supabase: SupabaseClient,
  wantedAuthNo: string,
  maxAgeMs = WORKNET_RAW_FRESH_MAX_AGE_MS
): Promise<boolean> {
  const cutoff = rawFreshCutoffIso(Date.now(), maxAgeMs);
  const { data } = await supabase
    .from("job_open_data_raw")
    .select("source_record_id")
    .eq("source_slug", JOB_OPEN_DATA_SOURCE_WORKNET_WANTED)
    .eq("source_record_id", wantedAuthNo.trim())
    .gte("last_fetched_at", cutoff)
    .maybeSingle();
  return Boolean(data?.source_record_id);
}

/** 동기화 직후 — 이번 수집에 없던 공고 is_open=false */
export async function closeWorknetOpeningsMissingFreshRaw(
  supabase: SupabaseClient,
  ingestStartedAtIso: string
): Promise<{ closed: number; error?: string }> {
  const { data: openRows, error: loadErr } = await supabase
    .from("public_job_openings")
    .select("id, source_record_id")
    .eq("source_slug", JOB_OPEN_DATA_SOURCE_WORKNET_WANTED)
    .eq("is_open", true);

  if (loadErr) return { closed: 0, error: loadErr.message };
  if (!openRows?.length) return { closed: 0 };

  const { data: freshRaw, error: rawErr } = await supabase
    .from("job_open_data_raw")
    .select("source_record_id")
    .eq("source_slug", JOB_OPEN_DATA_SOURCE_WORKNET_WANTED)
    .gte("last_fetched_at", ingestStartedAtIso);

  if (rawErr) return { closed: 0, error: rawErr.message };

  const freshSet = new Set((freshRaw ?? []).map((r) => r.source_record_id));
  const staleIds = openRows
    .filter((r) => !freshSet.has(r.source_record_id))
    .map((r) => r.id);

  if (staleIds.length === 0) return { closed: 0 };

  let closed = 0;
  for (let i = 0; i < staleIds.length; i += RAW_BATCH) {
    const batch = staleIds.slice(i, i + RAW_BATCH);
    const { error } = await supabase
      .from("public_job_openings")
      .update({ is_open: false })
      .in("id", batch);
    if (error) return { closed, error: error.message };
    closed += batch.length;
  }

  return { closed };
}

/** last_synced_at만 오래된 공고 일괄 마감 (백업) */
export async function closeWorknetOpeningsStaleSynced(
  supabase: SupabaseClient,
  maxAgeMs = 48 * 60 * 60 * 1000
): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  await supabase
    .from("public_job_openings")
    .update({ is_open: false })
    .eq("source_slug", JOB_OPEN_DATA_SOURCE_WORKNET_WANTED)
    .eq("is_open", true)
    .lt("last_synced_at", cutoff);
}

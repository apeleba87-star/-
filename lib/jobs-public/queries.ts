import type { SupabaseClient } from "@supabase/supabase-js";
import { regionMatchesScope } from "@/lib/jobs-public-ingest/worknet/region-parse";
import {
  filterOpenPublicJobs,
  isPublicJobStillOpen,
  openClosingOrFilter,
} from "@/lib/jobs-public/filter-open-jobs";
import {
  filterPublicJobsBySyncFresh,
  isPublicJobSyncFresh,
  publicJobSyncFreshCutoffIso,
} from "@/lib/jobs-public-ingest/worknet-freshness";
import type { JobPublicRegionPreference } from "./region-preference-shared";

export type PublicJobOpeningListItem = {
  id: string;
  wanted_auth_no: string;
  title: string;
  company: string | null;
  preset_label: string | null;
  pay_display: string;
  pay_monthly_normalized: number | null;
  sal_tp_cd: string | null;
  pay_min_won: number | null;
  pay_max_won: number | null;
  region_text: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  closing_at: string | null;
  holiday_label: string | null;
  career_label: string | null;
  external_url: string;
  last_synced_at: string;
};

export type JobSpotlightSnapshot = {
  scope_key: string;
  local_top_opening_id: string | null;
  local_top_title: string | null;
  local_top_pay_display: string | null;
  local_top_preset_label: string | null;
  local_top_closing_label: string | null;
  pay_top_opening_id: string | null;
  pay_top_title: string | null;
  pay_top_pay_display: string | null;
  pay_top_region_label: string | null;
  pay_delta_display: string | null;
  opening_count_local: number;
  computed_at: string;
};

const LIST_SELECT =
  "id, wanted_auth_no, title, company, preset_label, pay_display, pay_monthly_normalized, sal_tp_cd, pay_min_won, pay_max_won, region_text, region_sido, region_sigungu, closing_at, holiday_label, career_label, external_url, last_synced_at";

/** 배치 조회 상한 — 고용24 동기화 규모 내 전체 열린 공고 */
export const PUBLIC_JOB_LIST_BATCH_SIZE = 500;
export const PUBLIC_JOB_LIST_MAX_ROWS = 10_000;

export async function fetchSpotlightSnapshot(
  supabase: SupabaseClient,
  scopeKey: string
): Promise<JobSpotlightSnapshot | null> {
  const { data } = await supabase
    .from("job_spotlight_snapshots")
    .select(
      "scope_key, local_top_opening_id, local_top_title, local_top_pay_display, local_top_preset_label, local_top_closing_label, pay_top_opening_id, pay_top_title, pay_top_pay_display, pay_top_region_label, pay_delta_display, opening_count_local, computed_at"
    )
    .eq("scope_key", scopeKey)
    .maybeSingle();
  return (data as JobSpotlightSnapshot | null) ?? null;
}

function publicJobListQuery(
  supabase: SupabaseClient,
  opts: { orderByPay?: boolean }
) {
  let q = supabase
    .from("public_job_openings")
    .select(LIST_SELECT)
    .eq("is_open", true)
    .or(openClosingOrFilter())
    .gte("last_synced_at", publicJobSyncFreshCutoffIso());
  if (opts.orderByPay) {
    q = q.order("pay_monthly_normalized", { ascending: false, nullsFirst: true });
  } else {
    q = q.order("last_synced_at", { ascending: false });
  }
  return q;
}

function finalizePublicJobListRows(
  rows: PublicJobOpeningListItem[]
): PublicJobOpeningListItem[] {
  const openRows = filterOpenPublicJobs(rows);
  return filterPublicJobsBySyncFresh(openRows);
}

export async function fetchPublicJobList(
  supabase: SupabaseClient,
  opts: { limit?: number; orderByPay?: boolean; fetchAll?: boolean } = {}
): Promise<PublicJobOpeningListItem[]> {
  if (opts.fetchAll) {
    const merged: PublicJobOpeningListItem[] = [];
    let offset = 0;
    while (merged.length < PUBLIC_JOB_LIST_MAX_ROWS) {
      const take = Math.min(
        PUBLIC_JOB_LIST_BATCH_SIZE,
        PUBLIC_JOB_LIST_MAX_ROWS - merged.length
      );
      const { data } = await publicJobListQuery(supabase, opts).range(
        offset,
        offset + take - 1
      );
      const batch = finalizePublicJobListRows((data ?? []) as PublicJobOpeningListItem[]);
      merged.push(...batch);
      if (!data?.length || data.length < take) break;
      offset += take;
    }
    return merged;
  }

  const limit = opts.limit ?? 30;
  const { data } = await publicJobListQuery(supabase, opts).limit(limit);
  return finalizePublicJobListRows((data ?? []) as PublicJobOpeningListItem[]);
}

export function filterLocalJobs(
  rows: PublicJobOpeningListItem[],
  pref: JobPublicRegionPreference
): PublicJobOpeningListItem[] {
  return rows.filter((r) =>
    regionMatchesScope(
      { region_sido: r.region_sido, region_sigungu: r.region_sigungu },
      { sido: pref.sido, sigungu: pref.sigungu }
    )
  );
}

export async function fetchPublicJobByAuthNo(
  supabase: SupabaseClient,
  wantedAuthNo: string
) {
  const { data } = await supabase
    .from("public_job_openings")
    .select("*")
    .eq("wanted_auth_no", wantedAuthNo.trim())
    .eq("is_open", true)
    .or(openClosingOrFilter())
    .maybeSingle();
  if (!data || !isPublicJobStillOpen(data as { closing_at: string | null })) return null;
  if (!isPublicJobSyncFresh(data as { last_synced_at: string })) return null;
  return data;
}

export function formatSyncedAt(iso: string | null | undefined): string {
  if (!iso) return "갱신 시각 확인 중";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "갱신 시각 확인 중";
  const hours = Math.floor((Date.now() - t) / 3600000);
  if (hours < 1) return "1시간 이내 반영";
  if (hours < 24) return `${hours}시간 전 반영`;
  return "12시간마다 갱신";
}

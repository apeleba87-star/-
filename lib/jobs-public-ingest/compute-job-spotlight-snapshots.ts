import type { SupabaseClient } from "@supabase/supabase-js";
import { filterOpenPublicJobs, openClosingOrFilter } from "@/lib/jobs-public/filter-open-jobs";
import {
  closeWorknetOpeningsMissingFreshRaw,
  closeWorknetOpeningsStaleSynced,
  filterJobsWithFreshWorknetRaw,
} from "@/lib/jobs-public-ingest/worknet-freshness";
import { formatDeltaMan } from "@/lib/jobs-public-ingest/worknet/pay-normalize";
import { closingLabel } from "@/lib/jobs-public-ingest/worknet/normalize-row";
import {
  DEFAULT_PUBLIC_JOB_REGION,
  NATIONAL_PUBLIC_JOB_SIDO,
  parseWorkRegion,
  regionMatchesScope,
  spotlightScopeKey,
} from "@/lib/jobs-public-ingest/worknet/region-parse";

type OpeningRow = {
  id: string;
  wanted_auth_no: string;
  title: string;
  pay_display: string;
  pay_monthly_normalized: number | null;
  preset_label: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  region_text: string | null;
  closing_at: string | null;
};

function pickTopPay(rows: OpeningRow[]): OpeningRow | null {
  const sorted = [...rows].sort(
    (a, b) => (b.pay_monthly_normalized ?? 0) - (a.pay_monthly_normalized ?? 0)
  );
  return sorted[0] ?? null;
}

function pickTopLocal(rows: OpeningRow[]): OpeningRow | null {
  return pickTopPay(rows);
}

async function loadOpenRows(supabase: SupabaseClient): Promise<OpeningRow[]> {
  const { data, error } = await supabase
    .from("public_job_openings")
    .select(
      "id, wanted_auth_no, title, pay_display, pay_monthly_normalized, preset_label, region_sido, region_sigungu, region_text, closing_at"
    )
    .eq("is_open", true)
    .or(openClosingOrFilter())
    .order("pay_monthly_normalized", { ascending: false, nullsFirst: false })
    .limit(2000);
  if (error || !data) return [];
  const openRows = filterOpenPublicJobs(data as OpeningRow[]);
  return filterJobsWithFreshWorknetRaw(supabase, openRows);
}

function buildSnapshot(
  scope: { sido: string; sigungu?: string | null },
  all: OpeningRow[],
  nationalTop: OpeningRow | null
) {
  const localRows = all.filter((r) =>
    regionMatchesScope(
      { region_sido: r.region_sido, region_sigungu: r.region_sigungu },
      { sido: scope.sido, sigungu: scope.sigungu }
    )
  );
  const localTop = pickTopLocal(localRows);
  const payTopInScope = pickTopPay(localRows);
  const payTop = payTopInScope ?? nationalTop;
  const localPay = localTop?.pay_monthly_normalized ?? 0;
  const nationalPay = nationalTop?.pay_monthly_normalized ?? 0;
  const delta =
    localTop && nationalTop && payTopInScope
      ? Math.max(0, nationalPay - localPay)
      : 0;

  const localRegion = localTop
    ? parseWorkRegion(localTop.region_text ?? "").regionLabel
    : scope.sigungu
      ? `${scope.sido} ${scope.sigungu}`
      : scope.sido;

  return {
    scope_key: spotlightScopeKey(scope),
    region_sido: scope.sido,
    region_sigungu: scope.sigungu ?? null,
    local_top_opening_id: localTop?.id ?? null,
    local_top_title: localTop?.title ?? null,
    local_top_pay_display: localTop?.pay_display ?? null,
    local_top_preset_label: localTop?.preset_label ?? null,
    local_top_closing_label: localTop
      ? closingLabel(localTop.closing_at ? new Date(localTop.closing_at) : null)
      : null,
    pay_top_opening_id: payTop?.id ?? null,
    pay_top_title: payTop?.title ?? null,
    pay_top_pay_display: payTop?.pay_display ?? null,
    pay_top_region_label: payTop ? parseWorkRegion(payTop.region_text ?? "").regionLabel : null,
    pay_delta_won: delta,
    pay_delta_display:
      delta > 0 && localTop && payTopInScope && nationalTop?.id !== localTop.id
        ? `전국 최고보다 ${formatDeltaMan(delta)} 낮음`
        : payTopInScope
          ? null
          : nationalTop
            ? "선택 지역 공고 없음 · 전국 최고 표시"
            : null,
    opening_count_local: localRows.length,
    computed_at: new Date().toISOString(),
  };
}

export async function computeJobSpotlightSnapshots(
  supabase: SupabaseClient
): Promise<{ ok: boolean; scopes: number; error?: string }> {
  const all = await loadOpenRows(supabase);
  const nationalTop = pickTopPay(all);
  const scopes: ReturnType<typeof buildSnapshot>[] = [];

  scopes.push(
    buildSnapshot({ sido: NATIONAL_PUBLIC_JOB_SIDO, sigungu: null }, all, nationalTop)
  );
  scopes.push(buildSnapshot(DEFAULT_PUBLIC_JOB_REGION, all, nationalTop));

  const sigunguSet = new Set<string>();
  for (const r of all) {
    if (r.region_sido === "서울" && r.region_sigungu) {
      sigunguSet.add(r.region_sigungu);
    }
  }
  for (const g of [...sigunguSet].slice(0, 30)) {
    scopes.push(buildSnapshot({ sido: "서울", sigungu: g }, all, nationalTop));
  }

  const { error } = await supabase.from("job_spotlight_snapshots").upsert(scopes, {
    onConflict: "scope_key",
  });
  if (error) return { ok: false, scopes: 0, error: error.message };
  return { ok: true, scopes: scopes.length };
}

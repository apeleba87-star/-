import { unstable_cache } from "next/cache";
import {
  DEMAND_REGIONS,
  demandRegionSelectionKey,
  type DemandRegionSelection,
} from "@/lib/demand/regions";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { formatJobPayForMode } from "@/lib/jobs-public/pay-display-mode";
import {
  countPublicJobsInScope,
  fetchTopPayJobInScope,
  type PublicJobOpeningListItem,
} from "@/lib/jobs-public/queries";
import { NATIONAL_PUBLIC_JOB_SIDO } from "@/lib/jobs-public-ingest/worknet/region-parse";
import { preferenceFromScope } from "@/lib/jobs-public/region-preference-shared";
import type {
  JobsPublicHubScopeTeaser,
  JobsPublicHubTeaser,
} from "@/lib/region-hub/jobs-public-teaser";
import { createClient } from "@/lib/supabase-server";

const REVALIDATE_SEC = 300;

type SnapshotRow = {
  scope_key: string;
  opening_count_local: number;
  pay_top_pay_display: string | null;
};

function topPayFromJob(job: PublicJobOpeningListItem | null): string | null {
  if (!job) return null;
  const pay = formatJobPayForMode(job, "monthly");
  if (!pay || pay === PUBLIC_JOBS_COPY.payNegotiable) return null;
  return pay;
}

function findCityBySido(sido: string) {
  return DEMAND_REGIONS.find(
    (c) => c.label === sido || c.fullLabel === sido || c.fullLabel.startsWith(sido)
  );
}

function snapshotToSelectionEntries(
  row: SnapshotRow
): Array<[string, JobsPublicHubScopeTeaser]> {
  const teaser: JobsPublicHubScopeTeaser = {
    jobCount: row.opening_count_local,
    topPayDisplay: row.pay_top_pay_display?.trim() || null,
  };
  const entries: Array<[string, JobsPublicHubScopeTeaser]> = [];

  if (row.scope_key === "national:kr") {
    entries.push([demandRegionSelectionKey({ scope: "national" }), teaser]);
    return entries;
  }
  if (row.scope_key.startsWith("sigungu:")) {
    const rest = row.scope_key.slice("sigungu:".length);
    const pipe = rest.indexOf("|");
    if (pipe < 0) return entries;
    const sido = rest.slice(0, pipe);
    const sigungu = rest.slice(pipe + 1);
    const city = findCityBySido(sido);
    const district = city?.districts.find(
      (d) => d.gu === sigungu || sigungu.includes(d.gu) || d.gu.includes(sigungu)
    );
    if (city && district) {
      const sel: DemandRegionSelection = {
        scope: "district",
        cityId: city.id,
        guSlug: district.slug,
      };
      entries.push([demandRegionSelectionKey(sel), teaser]);
    }
    return entries;
  }
  if (row.scope_key.startsWith("sido:")) {
    const sido = row.scope_key.slice("sido:".length);
    const city = findCityBySido(sido);
    if (city) {
      entries.push([demandRegionSelectionKey({ scope: "city", cityId: city.id }), teaser]);
    }
  }
  return entries;
}

function buildTeaserMapFromSnapshots(rows: SnapshotRow[]): Record<string, JobsPublicHubScopeTeaser> {
  const map: Record<string, JobsPublicHubScopeTeaser> = {};
  for (const row of rows) {
    for (const [key, teaser] of snapshotToSelectionEntries(row)) {
      map[key] = teaser;
    }
  }
  return map;
}

async function fetchJobsPublicHubTeaser(): Promise<JobsPublicHubTeaser> {
  const supabase = createClient();
  const nationalPref = preferenceFromScope({ sido: NATIONAL_PUBLIC_JOB_SIDO, sigungu: null });
  const [nationalCount, nationalTopJob, snapshotsRes] = await Promise.all([
    countPublicJobsInScope(supabase, nationalPref),
    fetchTopPayJobInScope(supabase, nationalPref),
    supabase
      .from("job_spotlight_snapshots")
      .select("scope_key, opening_count_local, pay_top_pay_display"),
  ]);

  const bySelectionKey = buildTeaserMapFromSnapshots(
    (snapshotsRes.data ?? []) as SnapshotRow[]
  );
  const nationalKey = demandRegionSelectionKey({ scope: "national" });
  bySelectionKey[nationalKey] = {
    jobCount: nationalCount,
    topPayDisplay: topPayFromJob(nationalTopJob),
  };

  return {
    nationalCount,
    nationalTopPay: topPayFromJob(nationalTopJob),
    bySelectionKey,
  };
}

export function getCachedJobsPublicHubTeaser() {
  return unstable_cache(
    () => fetchJobsPublicHubTeaser(),
    ["jobs-public-hub-teaser-v2"],
    { revalidate: REVALIDATE_SEC, tags: ["jobs-public"] }
  )();
}

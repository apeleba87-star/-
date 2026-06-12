import { unstable_cache } from "next/cache";
import { demandRegionSelectionKey, DEMAND_REGIONS, type DemandRegionSelection } from "@/lib/demand/regions";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { formatJobPayForMode } from "@/lib/jobs-public/pay-display-mode";
import { jobPublicScopeFromDemandSelection } from "@/lib/jobs-public/job-region-scope";
import { preferenceFromScope } from "@/lib/jobs-public/region-preference-shared";
import { fetchPublicJobList, filterLocalJobs, type PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import { sortPublicJobList } from "@/lib/jobs-public/public-job-sort";
import { NATIONAL_PUBLIC_JOB_SIDO } from "@/lib/jobs-public-ingest/worknet/region-parse";
import type { JobsPublicHubScopeTeaser, JobsPublicHubTeaser } from "@/lib/region-hub/jobs-public-teaser";
import { createClient } from "@/lib/supabase-server";

const REVALIDATE_SEC = 300;

function topPayFromJobs(jobs: PublicJobOpeningListItem[]): string | null {
  const top = sortPublicJobList(jobs, "pay")[0];
  if (!top) return null;
  const pay = formatJobPayForMode(top, "monthly");
  if (!pay || pay === PUBLIC_JOBS_COPY.payNegotiable) return null;
  return pay;
}

function scopeTeaserFromJobs(
  jobs: PublicJobOpeningListItem[],
  sel: DemandRegionSelection
): JobsPublicHubScopeTeaser {
  const pref = preferenceFromScope(jobPublicScopeFromDemandSelection(sel));
  const filtered = filterLocalJobs(jobs, pref);
  return {
    jobCount: filtered.length,
    topPayDisplay: topPayFromJobs(filtered),
  };
}

function buildTeaserMap(jobs: PublicJobOpeningListItem[]): Record<string, JobsPublicHubScopeTeaser> {
  const map: Record<string, JobsPublicHubScopeTeaser> = {};
  const nationalSel: DemandRegionSelection = { scope: "national" };
  map[demandRegionSelectionKey(nationalSel)] = scopeTeaserFromJobs(jobs, nationalSel);

  for (const city of DEMAND_REGIONS) {
    const citySel: DemandRegionSelection = { scope: "city", cityId: city.id };
    map[demandRegionSelectionKey(citySel)] = scopeTeaserFromJobs(jobs, citySel);

    for (const district of city.districts) {
      const districtSel: DemandRegionSelection = {
        scope: "district",
        cityId: city.id,
        guSlug: district.slug,
      };
      map[demandRegionSelectionKey(districtSel)] = scopeTeaserFromJobs(jobs, districtSel);
    }
  }

  return map;
}

async function fetchJobsPublicHubTeaser(): Promise<JobsPublicHubTeaser> {
  const supabase = createClient();
  const jobs = await fetchPublicJobList(supabase, { fetchAll: true });
  const nationalPref = preferenceFromScope({ sido: NATIONAL_PUBLIC_JOB_SIDO, sigungu: null });
  const nationalJobs = filterLocalJobs(jobs, nationalPref);

  return {
    nationalCount: nationalJobs.length,
    nationalTopPay: topPayFromJobs(nationalJobs),
    bySelectionKey: buildTeaserMap(jobs),
  };
}

export function getCachedJobsPublicHubTeaser() {
  return unstable_cache(
    () => fetchJobsPublicHubTeaser(),
    ["jobs-public-hub-teaser-v1"],
    { revalidate: REVALIDATE_SEC, tags: ["jobs-public"] }
  )();
}

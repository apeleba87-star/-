import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { PublicJobSort } from "@/lib/jobs-public/public-job-sort";
import {
  countPublicJobsInScope,
  fetchNationalFallbackJobs,
  fetchPublicJobsPage,
  fetchRelatedPublicJobs,
  fetchTopPayJobInScope,
  type PublicJobOpeningListItem,
} from "@/lib/jobs-public/queries";
import {
  NATIONAL_PUBLIC_JOB_SIDO,
  type JobPublicRegionPreference,
} from "@/lib/jobs-public/region-preference-shared";
import { preferenceFromScope } from "@/lib/jobs-public/region-preference-shared";
import { createClient } from "@/lib/supabase-server";

export const PUBLIC_JOBS_CACHE_REVALIDATE_SEC = 300;

export type PublicJobListBundle = {
  jobs: PublicJobOpeningListItem[];
  totalCount: number;
  syncedAt: string | null;
};

export type PublicJobScopeMeta = {
  localCount: number;
  localPay: PublicJobOpeningListItem | null;
  nationalPay: PublicJobOpeningListItem | null;
};

export type PublicJobScopeTeaser = {
  jobCount: number;
  topPayDisplay: string | null;
};

async function loadScopeCount(pref: JobPublicRegionPreference): Promise<number> {
  const supabase = createClient();
  return countPublicJobsInScope(supabase, pref);
}

async function loadListBundle(
  pref: JobPublicRegionPreference,
  sort: PublicJobSort,
  page: number
): Promise<PublicJobListBundle> {
  const supabase = createClient();
  const [jobs, totalCount] = await Promise.all([
    fetchPublicJobsPage(supabase, pref, sort, page),
    countPublicJobsInScope(supabase, pref),
  ]);
  return {
    jobs,
    totalCount,
    syncedAt: jobs[0]?.last_synced_at ?? null,
  };
}

async function loadScopeMeta(
  pref: JobPublicRegionPreference,
  nationalScope: boolean
): Promise<PublicJobScopeMeta> {
  const supabase = createClient();
  const nationalPref = preferenceFromScope({ sido: NATIONAL_PUBLIC_JOB_SIDO, sigungu: null });
  const [localCount, localPay, nationalPay] = await Promise.all([
    countPublicJobsInScope(supabase, pref),
    fetchTopPayJobInScope(supabase, pref),
    fetchTopPayJobInScope(supabase, nationalPref),
  ]);
  return {
    localCount,
    localPay: nationalScope ? nationalPay : localPay,
    nationalPay,
  };
}

function cachedScopeCount(scopeKey: string, pref: JobPublicRegionPreference) {
  return unstable_cache(
    () => loadScopeCount(pref),
    ["jobs-public-count", scopeKey],
    { revalidate: PUBLIC_JOBS_CACHE_REVALIDATE_SEC, tags: ["jobs-public"] }
  )();
}

function cachedListBundle(
  scopeKey: string,
  pref: JobPublicRegionPreference,
  sort: PublicJobSort,
  page: number
) {
  return unstable_cache(
    () => loadListBundle(pref, sort, page),
    ["jobs-public-list", scopeKey, sort, String(page)],
    { revalidate: PUBLIC_JOBS_CACHE_REVALIDATE_SEC, tags: ["jobs-public"] }
  )();
}

function cachedScopeMeta(scopeKey: string, pref: JobPublicRegionPreference, nationalScope: boolean) {
  return unstable_cache(
    () => loadScopeMeta(pref, nationalScope),
    ["jobs-public-meta", scopeKey, nationalScope ? "national" : "local"],
    { revalidate: PUBLIC_JOBS_CACHE_REVALIDATE_SEC, tags: ["jobs-public"] }
  )();
}

/** 동일 요청(metadata + page) 중복 조회 방지 */
export const getPublicJobScopeMeta = cache(
  (pref: JobPublicRegionPreference, nationalScope: boolean) =>
    cachedScopeMeta(pref.scopeKey, pref, nationalScope)
);

export const getPublicJobListBundle = cache(
  (pref: JobPublicRegionPreference, sort: PublicJobSort, page: number) =>
    cachedListBundle(pref.scopeKey, pref, sort, page)
);

export const getPublicJobScopeCount = cache((pref: JobPublicRegionPreference) =>
  cachedScopeCount(pref.scopeKey, pref)
);

export function getCachedNationalFallbackJobs() {
  return unstable_cache(
    async () => {
      const supabase = createClient();
      return fetchNationalFallbackJobs(supabase, 8);
    },
    ["jobs-public-fallback-national"],
    { revalidate: PUBLIC_JOBS_CACHE_REVALIDATE_SEC, tags: ["jobs-public"] }
  )();
}

export function getCachedRelatedPublicJobs(
  pref: JobPublicRegionPreference,
  excludeId: string,
  limit: number
) {
  return unstable_cache(
    async () => {
      const supabase = createClient();
      return fetchRelatedPublicJobs(supabase, pref, excludeId, limit);
    },
    ["jobs-public-related", pref.scopeKey, excludeId, String(limit)],
    { revalidate: PUBLIC_JOBS_CACHE_REVALIDATE_SEC, tags: ["jobs-public"] }
  )();
}

export function getCachedRegionalPayInsightJobs(pref: JobPublicRegionPreference) {
  return unstable_cache(
    async () => {
      const supabase = createClient();
      const { fetchRegionalJobsForPayInsight, fetchTopPayJobInScope } = await import(
        "@/lib/jobs-public/queries"
      );
      const nationalPref = preferenceFromScope({ sido: NATIONAL_PUBLIC_JOB_SIDO, sigungu: null });
      const [regionalJobs, nationalTop] = await Promise.all([
        fetchRegionalJobsForPayInsight(supabase, pref),
        fetchTopPayJobInScope(supabase, nationalPref),
      ]);
      return { regionalJobs, nationalTop };
    },
    ["jobs-public-pay-insight", pref.scopeKey],
    { revalidate: PUBLIC_JOBS_CACHE_REVALIDATE_SEC, tags: ["jobs-public"] }
  )();
}

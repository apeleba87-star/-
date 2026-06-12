import { Suspense } from "react";
import type { Metadata } from "next";
import PublicJobsFeedSection from "@/components/jobs/public/PublicJobsFeedSection";
import { PublicJobPayModeProvider } from "@/components/jobs/public/PublicJobPayModeProvider";
import PublicJobRegionWithShare from "@/components/jobs/public/PublicJobRegionWithShare";
import PublicJobRadarAdsSection from "@/components/jobs/public/PublicJobRadarAdsSection";
import PublicJobsRegionHubBridges from "@/components/region-hub/PublicJobsRegionHubBridges";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { jobPublicRegionKeysFromDraft } from "@/lib/jobs-public/radar-ad-region";
import { jobPublicDraftFromScope } from "@/lib/jobs-public/job-region-scope";
import {
  buildPublicJobsShareMetadata,
  buildPublicJobsShareSearch,
  jobPublicDraftFromSearchParams,
  parseJobPublicShareRegionFromSearchParams,
} from "@/lib/jobs-public/share-metadata";
import {
  getJobPublicRegionPreference,
  isNationalPublicJobScope,
} from "@/lib/jobs-public/region-preference";
import { sortPublicJobList } from "@/lib/jobs-public/public-job-sort";
import {
  fetchPublicJobList,
  filterLocalJobs,
  formatSyncedAt,
} from "@/lib/jobs-public/queries";
import { getCachedJobWageHubTeaserRaw } from "@/lib/report/job-wage-hub-teaser-cache";
import { toJobWageHubTeaserForTier } from "@/lib/report/job-wage-hub-teaser";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const supabase = createClient();
  const pref =
    parseJobPublicShareRegionFromSearchParams(params) ??
    (await getJobPublicRegionPreference());
  const nationalScope = isNationalPublicJobScope(pref);
  const allJobs = await fetchPublicJobList(supabase, { fetchAll: true });
  const scopedJobs = filterLocalJobs(allJobs, pref);
  const localPay = nationalScope
    ? sortPublicJobList(allJobs, "pay")[0] ?? null
    : sortPublicJobList(scopedJobs, "pay")[0] ?? null;
  const nationalPay = sortPublicJobList(allJobs, "pay")[0] ?? null;

  const sharePath = buildPublicJobsShareSearch(params);
  const path = sharePath ? `/jobs/public?${sharePath}` : "/jobs/public";

  return buildPublicJobsShareMetadata({
    pref,
    localPay,
    nationalPay,
    localCount: scopedJobs.length,
    path,
    ogQueryParams: params,
  });
}

const FALLBACK_LIMIT = 8;

function SortChipsFallback() {
  return (
    <div className="mt-6 h-12 animate-pulse rounded-xl bg-slate-100" aria-hidden />
  );
}

export default async function PublicJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = createClient();
  const rawJobWageTeaser = await getCachedJobWageHubTeaserRaw();
  const jobWageTeaser = toJobWageHubTeaserForTier(rawJobWageTeaser, "guest");
  const pref =
    parseJobPublicShareRegionFromSearchParams(params) ??
    (await getJobPublicRegionPreference());
  const shareDraft =
    jobPublicDraftFromSearchParams(params) ??
    jobPublicDraftFromScope({ sido: pref.sido, sigungu: pref.sigungu }) ?? {
      scope: "city" as const,
      cityId: "seoul",
    };
  const nationalScope = isNationalPublicJobScope(pref);
  const allJobs = await fetchPublicJobList(supabase, { fetchAll: true });

  const scopedJobs = filterLocalJobs(allJobs, pref);
  const localCount = scopedJobs.length;
  const nationalPay = sortPublicJobList(allJobs, "pay")[0] ?? null;
  const localPay = nationalScope ? nationalPay : sortPublicJobList(scopedJobs, "pay")[0] ?? null;
  const fallbackJobs =
    !nationalScope && localCount === 0
      ? sortPublicJobList(allJobs, "pay").slice(0, FALLBACK_LIMIT)
      : [];

  const syncedAt = allJobs[0]?.last_synced_at ?? null;
  const radarRegionKeys = jobPublicRegionKeysFromDraft(shareDraft);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-16 sm:py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {PUBLIC_JOBS_COPY.pageTitle}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-slate-700 sm:mt-3 sm:text-lg">
          {PUBLIC_JOBS_COPY.pageLead}
        </p>
        <div className="mt-4 sm:mt-5">
          <PublicJobRegionWithShare
            currentSido={pref.sido}
            currentSigungu={pref.sigungu}
            jobCount={localCount}
          />
          <p className="mt-2 text-sm text-slate-500">
            {PUBLIC_JOBS_COPY.syncedPrefix} · {formatSyncedAt(syncedAt)}
          </p>
        </div>
      </header>

      <PublicJobRadarAdsSection
        nationalScope={nationalScope}
        regionKeys={radarRegionKeys}
        className="mt-5"
      />

      <PublicJobsRegionHubBridges shareDraft={shareDraft} jobWageTeaser={jobWageTeaser} />

      <PublicJobPayModeProvider>
        <Suspense fallback={<SortChipsFallback />}>
          <PublicJobsFeedSection
            jobs={scopedJobs}
            fallbackJobs={fallbackJobs}
            jobCount={localCount}
          />
        </Suspense>
      </PublicJobPayModeProvider>
    </main>
  );
}

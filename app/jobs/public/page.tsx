import { Suspense } from "react";
import type { Metadata } from "next";
import PublicJobsFeedSection from "@/components/jobs/public/PublicJobsFeedSection";
import { PublicJobPayModeProvider } from "@/components/jobs/public/PublicJobPayModeProvider";
import PublicJobRegionWithShare from "@/components/jobs/public/PublicJobRegionWithShare";
import PublicJobRadarAdsSection from "@/components/jobs/public/PublicJobRadarAdsSection";
import PublicJobsRegionHubBridges from "@/components/region-hub/PublicJobsRegionHubBridges";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import {
  getCachedNationalFallbackJobs,
  getPublicJobListBundle,
  getPublicJobScopeMeta,
} from "@/lib/jobs-public/list-cache";
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
import {
  clampPublicJobPage,
  parsePublicJobPage,
} from "@/lib/jobs-public/public-job-pagination";
import { parsePublicJobSort } from "@/lib/jobs-public/public-job-sort";
import { formatSyncedAt } from "@/lib/jobs-public/queries";
import { getCachedJobWageHubTeaserRaw } from "@/lib/report/job-wage-hub-teaser-cache";
import { toJobWageHubTeaserForTier } from "@/lib/report/job-wage-hub-teaser";

export const revalidate = 300;

async function resolveRegionPref(
  params: Record<string, string | string[] | undefined>
) {
  return (
    parseJobPublicShareRegionFromSearchParams(params) ??
    (await getJobPublicRegionPreference())
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const pref = await resolveRegionPref(params);
  const nationalScope = isNationalPublicJobScope(pref);
  const meta = await getPublicJobScopeMeta(pref, nationalScope);

  const sharePath = buildPublicJobsShareSearch(params);
  const path = sharePath ? `/jobs/public?${sharePath}` : "/jobs/public";

  return buildPublicJobsShareMetadata({
    pref,
    localPay: meta.localPay,
    nationalPay: meta.nationalPay,
    localCount: meta.localCount,
    path,
    ogQueryParams: params,
  });
}

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
  const [rawJobWageTeaser, pref] = await Promise.all([
    getCachedJobWageHubTeaserRaw(),
    resolveRegionPref(params),
  ]);
  const jobWageTeaser = toJobWageHubTeaserForTier(rawJobWageTeaser, "guest");
  const shareDraft =
    jobPublicDraftFromSearchParams(params) ??
    jobPublicDraftFromScope({ sido: pref.sido, sigungu: pref.sigungu }) ?? {
      scope: "city" as const,
      cityId: "seoul",
    };
  const nationalScope = isNationalPublicJobScope(pref);
  const sort = parsePublicJobSort(typeof params.sort === "string" ? params.sort : undefined);

  const meta = await getPublicJobScopeMeta(pref, nationalScope);
  const page = clampPublicJobPage(
    parsePublicJobPage(typeof params.page === "string" ? params.page : undefined),
    meta.localCount
  );
  const bundle = await getPublicJobListBundle(pref, sort, page);

  const fallbackJobs =
    !nationalScope && bundle.totalCount === 0
      ? await getCachedNationalFallbackJobs()
      : [];

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
            jobCount={bundle.totalCount}
          />
          <p className="mt-2 text-sm text-slate-500">
            {PUBLIC_JOBS_COPY.syncedPrefix} · {formatSyncedAt(bundle.syncedAt)}
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
            jobs={bundle.jobs}
            fallbackJobs={fallbackJobs}
            jobCount={bundle.totalCount}
            page={page}
            totalCount={bundle.totalCount}
            sort={sort}
          />
        </Suspense>
      </PublicJobPayModeProvider>
    </main>
  );
}

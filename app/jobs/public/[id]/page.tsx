import Link from "next/link";
import { notFound } from "next/navigation";
import PublicJobAdSlot from "@/components/jobs/public/PublicJobAdSlot";
import PublicJobDetailChecklist from "@/components/jobs/public/PublicJobDetailChecklist";
import PublicJobDetailHero from "@/components/jobs/public/PublicJobDetailHero";
import PublicJobDetailShareButton from "@/components/jobs/public/PublicJobDetailShareButton";
import PublicJobDetailRelatedList from "@/components/jobs/public/PublicJobDetailRelatedList";
import PublicJobRadarNationalBanner from "@/components/jobs/public/PublicJobRadarNationalBanner";
import PublicJobRadarRegionalBanner from "@/components/jobs/public/PublicJobRadarRegionalBanner";
import PublicJobWorknetApplyBar from "@/components/jobs/public/PublicJobWorknetApplyBar";
import PublicJobDetailRegionHubBridges from "@/components/region-hub/PublicJobDetailRegionHubBridges";
import {
  getActiveJobsPublicDetailRelatedAd,
  getActiveJobsPublicDetailSummaryAd,
} from "@/lib/ads";
import {
  buildJobDetailApplyGuide,
  buildJobDetailFacts,
  buildJobDetailPayInsight,
  buildJobDetailRegionListHref,
} from "@/lib/jobs-public/detail-page-context";
import { isPublicJobStillOpen, openClosingOrFilter } from "@/lib/jobs-public/filter-open-jobs";
import { isPublicJobSyncFresh } from "@/lib/jobs-public-ingest/worknet-freshness";
import { parseWorkRegion } from "@/lib/jobs-public-ingest/worknet/region-parse";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { buildPageMetadata } from "@/lib/seo";
import { buildPublicJobDetailShareMessage } from "@/lib/jobs-public/share-metadata";
import {
  fetchPublicJobByAuthNo,
  fetchPublicJobList,
  formatSyncedAt,
  type PublicJobOpeningListItem,
} from "@/lib/jobs-public/queries";
import { jobPublicRegionKeysFromJob } from "@/lib/jobs-public/radar-ad-region";
import { sortPublicJobList } from "@/lib/jobs-public/public-job-sort";
import { jobPublicDraftFromScope } from "@/lib/jobs-public/job-region-scope";
import { getCachedJobWageHubTeaserRaw } from "@/lib/report/job-wage-hub-teaser-cache";
import { toJobWageHubTeaserForTier } from "@/lib/report/job-wage-hub-teaser";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

type JobRow = PublicJobOpeningListItem & {
  sal_tp_nm?: string | null;
  industry_name?: string | null;
};

async function loadOpening(id: string): Promise<JobRow | null> {
  const supabase = createClient();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid) {
    const { data } = await supabase
      .from("public_job_openings")
      .select("*")
      .eq("id", id)
      .eq("is_open", true)
      .or(openClosingOrFilter())
      .maybeSingle();
    if (!data || !isPublicJobStillOpen(data as { closing_at: string | null })) return null;
    if (!isPublicJobSyncFresh(data as { last_synced_at: string })) return null;
    return data as JobRow;
  }
  return fetchPublicJobByAuthNo(supabase, id) as Promise<JobRow | null>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const row = await loadOpening(id);
  if (!row) return { title: "채용 공고" };

  const region = parseWorkRegion(row.region_text ?? "", {
    title: row.title,
    company: row.company,
  }).regionLabel;
  const payDisplay = row.pay_display || PUBLIC_JOBS_COPY.payNegotiable;
  const { title, text, url } = buildPublicJobDetailShareMessage({
    jobId: row.id,
    title: row.title,
    payDisplay,
    regionLabel: region,
    company: row.company,
  });

  return buildPageMetadata({
    title: `${title} | 클린아이덱스`,
    description: text,
    path: new URL(url).pathname,
  });
}

export default async function PublicJobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = await loadOpening(id);
  if (!job) notFound();

  const [summaryAd, relatedAd, allJobs, rawJobWageTeaser] = await Promise.all([
    getActiveJobsPublicDetailSummaryAd(),
    getActiveJobsPublicDetailRelatedAd(),
    fetchPublicJobList(createClient(), { fetchAll: true }),
    getCachedJobWageHubTeaserRaw(),
  ]);
  const jobWageTeaser = toJobWageHubTeaserForTier(rawJobWageTeaser, "guest");

  const jobSido = job.region_sido;
  const jobSigungu = job.region_sigungu;
  const sameRegionJobs = allJobs.filter((j) => {
    if (j.id === job.id) return false;
    if (jobSido && j.region_sido !== jobSido) return false;
    if (jobSigungu && j.region_sigungu !== jobSigungu) return false;
    return true;
  });
  const relatedJobs = sortPublicJobList(sameRegionJobs, "pay").slice(0, 4);

  const region = parseWorkRegion(job.region_text ?? "", {
    title: job.title,
    company: job.company,
  }).regionLabel;
  const externalUrl = job.external_url?.trim();
  const payMin = job.pay_min_won != null ? Number(job.pay_min_won) : null;
  const payMax = job.pay_max_won != null ? Number(job.pay_max_won) : null;
  const hasPayRange = payMin != null && payMax != null && payMax - payMin >= 100_000;
  const preset = job.preset_label ?? "청소·용역";
  const payDisplay = job.pay_display || PUBLIC_JOBS_COPY.payNegotiable;

  const payInsight = buildJobDetailPayInsight(job, sameRegionJobs, allJobs);
  const applyGuide = buildJobDetailApplyGuide(
    { pay_min_won: payMin, pay_max_won: payMax },
    { hasPayRange }
  );
  const facts = buildJobDetailFacts({
    regionLabel: region,
    company: job.company,
    industry_name: job.industry_name,
    closing_at: job.closing_at,
    holiday_label: job.holiday_label,
    career_label: job.career_label,
  });
  const regionListHref = buildJobDetailRegionListHref(jobSido, jobSigungu);
  const regionalCount = sameRegionJobs.length + 1;
  const radarRegionKeys = jobPublicRegionKeysFromJob(job);
  const shareDraft =
    jobSido != null
      ? jobPublicDraftFromScope({ sido: jobSido, sigungu: jobSigungu })
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 pb-20 sm:py-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={regionListHref ?? "/jobs/public"}
          className="inline-flex min-h-[36px] items-center text-base font-medium text-blue-800 underline"
        >
          ← 목록
        </Link>
        <PublicJobDetailShareButton
          jobId={job.id}
          title={job.title}
          payDisplay={payDisplay}
          regionLabel={region}
          company={job.company}
        />
      </div>

      <PublicJobDetailHero
        preset={preset}
        title={job.title}
        payDisplay={payDisplay}
        salTpNm={job.sal_tp_nm}
        payBadges={payInsight?.payBadges ?? []}
        facts={facts}
        syncedLabel={formatSyncedAt(job.last_synced_at)}
      />

      <PublicJobDetailChecklist items={applyGuide} />

      <PublicJobDetailRegionHubBridges
        regionLabel={region}
        shareDraft={shareDraft}
        jobWageTeaser={jobWageTeaser}
      />

      {radarRegionKeys.length > 0 ? (
        <PublicJobRadarRegionalBanner regionKeys={radarRegionKeys} className="mt-6" />
      ) : null}

      <PublicJobAdSlot slot={summaryAd} className="mt-6" />

      {externalUrl ? <PublicJobWorknetApplyBar href={externalUrl} /> : null}

      <PublicJobRadarNationalBanner className="mt-6" />

      {relatedJobs.length > 0 ? (
        <>
          <PublicJobAdSlot slot={relatedAd} className="mt-8" />
          <PublicJobDetailRelatedList
            jobs={relatedJobs}
            regionLabel={region}
            regionListHref={regionListHref}
            regionalCount={regionalCount}
          />
        </>
      ) : null}

      <p className="mt-8 text-center text-xs text-slate-400">{PUBLIC_JOBS_COPY.sourceNote}</p>
    </main>
  );
}

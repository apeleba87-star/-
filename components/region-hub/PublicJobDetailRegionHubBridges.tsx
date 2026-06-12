import RegionHubBridgeCard from "@/components/region-hub/RegionHubBridgeCard";
import {
  REGION_HUB_DEMAND_CTA,
  REGION_HUB_WAGE_CTA,
  regionHubDemandDetail,
  regionHubDemandHeadline,
  regionHubWageFromJobsDetail,
  regionHubWageFromJobsHeadline,
} from "@/lib/region-hub/copy";
import { demandHubHrefFromDraft, jobWageReportHref } from "@/lib/region-hub/paths";
import type { JobPublicRegionDraft } from "@/lib/jobs-public/job-region-scope";
import {
  jobWageProvinceFromTeaser,
  type JobWageHubTeaser,
} from "@/lib/report/job-wage-hub-teaser";
import { demandSelectionFromJobPublicDraft } from "@/lib/region-hub/selection-bridge";
import { demandSelectionToJobWageProvince } from "@/lib/demand/job-wage-province-from-selection";

type Props = {
  regionLabel: string;
  shareDraft: JobPublicRegionDraft | null;
  jobWageTeaser: JobWageHubTeaser | null;
};

export default function PublicJobDetailRegionHubBridges({
  regionLabel,
  shareDraft,
  jobWageTeaser,
}: Props) {
  if (!shareDraft) return null;

  const demandHref = demandHubHrefFromDraft(shareDraft);
  const selection = demandSelectionFromJobPublicDraft(shareDraft);
  const province = selection ? demandSelectionToJobWageProvince(selection) : null;
  const wageHref = jobWageTeaser
    ? jobWageReportHref(jobWageTeaser.reportDate, province)
    : "/job-market-report";
  const wageRow =
    jobWageTeaser && province ? jobWageProvinceFromTeaser(jobWageTeaser, province) : null;
  const hasWagePosts = wageRow != null && wageRow.jobPostCount > 0;

  return (
    <section className="mt-6 space-y-3" aria-label="이 동네 더 알아보기">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">이 동네, 한 번 더 볼까요?</p>

      <RegionHubBridgeCard
        tone="emerald"
        kicker="입주"
        headline={regionHubDemandHeadline(regionLabel)}
        detail={regionHubDemandDetail()}
        href={demandHref}
        cta={REGION_HUB_DEMAND_CTA}
        ariaLabel={`${regionLabel} 입주 수요 보기`}
      />

      {jobWageTeaser ? (
        <RegionHubBridgeCard
          tone="teal"
          kicker="오늘 시세"
          headline={regionHubWageFromJobsHeadline(regionLabel)}
          detail={regionHubWageFromJobsDetail(
            jobWageTeaser.dominantCategory,
            jobWageTeaser.excerpt,
            hasWagePosts
          )}
          href={wageHref}
          cta={REGION_HUB_WAGE_CTA}
          ariaLabel={`${regionLabel} 당일 일당 시세`}
          stat={
            wageRow && wageRow.avgDailyWon != null ? (
              <>
                <p className="text-xs font-semibold text-teal-800">시·도 평균 일당</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-teal-900">
                  {wageRow.avgDailyWon.toLocaleString("ko-KR")}원
                </p>
              </>
            ) : null
          }
        />
      ) : null}
    </section>
  );
}

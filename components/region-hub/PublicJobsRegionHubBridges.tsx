import RegionHubBridgeCard from "@/components/region-hub/RegionHubBridgeCard";
import {
  REGION_HUB_DEMAND_CTA,
  REGION_HUB_WAGE_CTA,
  regionHubDemandJobsPageHeadline,
  regionHubDemandSlimDetail,
  regionHubWageJobsPageHeadline,
} from "@/lib/region-hub/copy";
import type { JobPublicRegionDraft } from "@/lib/jobs-public/job-region-scope";
import type { JobWageHubTeaser } from "@/lib/report/job-wage-hub-teaser";
import { demandHubHrefFromDraft, jobWageReportHref } from "@/lib/region-hub/paths";
import { demandSelectionFromJobPublicDraft } from "@/lib/region-hub/selection-bridge";
import { demandSelectionToJobWageProvince } from "@/lib/demand/job-wage-province-from-selection";
type Props = {
  shareDraft: JobPublicRegionDraft;
  jobWageTeaser: JobWageHubTeaser | null;
};

export default function PublicJobsRegionHubBridges({
  shareDraft,
  jobWageTeaser,
}: Props) {
  const demandHref = demandHubHrefFromDraft(shareDraft);
  const selection = demandSelectionFromJobPublicDraft(shareDraft);
  const province = selection ? demandSelectionToJobWageProvince(selection) : null;

  const wageHref = jobWageTeaser
    ? jobWageReportHref(jobWageTeaser.reportDate, province)
    : "/job-market-report";

  return (
    <div className="mt-4 space-y-2">
      <RegionHubBridgeCard
        tone="emerald"
        kicker="입주"
        headline={regionHubDemandJobsPageHeadline()}
        detail={regionHubDemandSlimDetail()}
        href={demandHref}
        cta={REGION_HUB_DEMAND_CTA}
        ariaLabel="입주·이사 수요 보기"
        compact
      />

      {jobWageTeaser ? (
        <RegionHubBridgeCard
          tone="teal"
          kicker="일당"
          headline={regionHubWageJobsPageHeadline()}
          detail="당일 일당 시세"
          href={wageHref}
          cta={REGION_HUB_WAGE_CTA}
          ariaLabel="당일 일당 시세 보기"
          compact
        />
      ) : null}
    </div>
  );
}

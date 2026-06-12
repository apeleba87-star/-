import RegionHubBridgeCard from "@/components/region-hub/RegionHubBridgeCard";
import {
  REGION_HUB_JOBS_CTA,
  regionHubJobsFromReportDetail,
  regionHubJobsSlimDetail,
  regionHubJobsSlimHook,
} from "@/lib/region-hub/copy";
import { jobsPublicTeaserForSelection, type JobsPublicHubTeaser } from "@/lib/region-hub/jobs-public-teaser";
import { jobsPublicHrefFromSelection } from "@/lib/region-hub/paths";
import { demandSelectionFromProvinceLabel } from "@/lib/region-hub/selection-bridge";

type Props = {
  jobsTeaser: JobsPublicHubTeaser;
  highlightProvince?: string | null;
};

/** 일당 리포트 지도 아래 — 채용 공고 슬림 진입 */
export default function JobWageReportJobsBridge({ jobsTeaser, highlightProvince }: Props) {
  const selection = highlightProvince ? demandSelectionFromProvinceLabel(highlightProvince) : null;

  if (selection && selection.scope !== "national") {
    const jobsScope = jobsPublicTeaserForSelection(jobsTeaser, selection);
    return (
      <RegionHubBridgeCard
        tone="indigo"
        kicker="채용"
        headline={regionHubJobsSlimHook()}
        detail={regionHubJobsFromReportDetail(jobsScope.jobCount)}
        href={jobsPublicHrefFromSelection(selection)}
        cta={REGION_HUB_JOBS_CTA}
        ariaLabel={`${highlightProvince} 채용 공고 보기`}
        compact
      />
    );
  }

  return (
    <RegionHubBridgeCard
      tone="indigo"
      kicker="채용"
      headline={regionHubJobsSlimHook()}
      detail={regionHubJobsSlimDetail(jobsTeaser.nationalCount)}
      href="/jobs/public?scope=national"
      cta={REGION_HUB_JOBS_CTA}
      ariaLabel="전국 채용 공고 보기"
      compact
    />
  );
}

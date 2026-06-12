import RegionHubBridgeCard from "@/components/region-hub/RegionHubBridgeCard";
import { jobPublicScopeFromDemandSelection } from "@/lib/jobs-public/job-region-scope";
import { getCachedJobsPublicHubTeaser } from "@/lib/region-hub/jobs-public-teaser-cache";
import { getPublicJobScopeCount } from "@/lib/jobs-public/list-cache";
import { preferenceFromScope } from "@/lib/jobs-public/region-preference-shared";
import {
  REGION_HUB_JOBS_CTA,
  regionHubJobsFromReportDetail,
  regionHubJobsSlimDetail,
  regionHubJobsSlimHook,
} from "@/lib/region-hub/copy";
import { jobsPublicHrefFromSelection } from "@/lib/region-hub/paths";
import { demandSelectionFromProvinceLabel } from "@/lib/region-hub/selection-bridge";

type Props = {
  highlightProvince?: string | null;
};

/** 일당 리포트 지도 아래 — 채용 공고 슬림 진입 */
export default async function JobWageReportJobsBridge({ highlightProvince }: Props) {
  const selection = highlightProvince ? demandSelectionFromProvinceLabel(highlightProvince) : null;
  const teaser = await getCachedJobsPublicHubTeaser();

  if (selection && selection.scope !== "national") {
    const pref = preferenceFromScope(jobPublicScopeFromDemandSelection(selection));
    const jobCount = await getPublicJobScopeCount(pref);
    return (
      <RegionHubBridgeCard
        tone="indigo"
        kicker="채용"
        headline={regionHubJobsSlimHook()}
        detail={regionHubJobsFromReportDetail(jobCount)}
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
      detail={regionHubJobsSlimDetail(teaser.nationalCount)}
      href="/jobs/public?scope=national"
      cta={REGION_HUB_JOBS_CTA}
      ariaLabel="전국 채용 공고 보기"
      compact
    />
  );
}

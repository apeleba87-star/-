import RegionHubBridgeCard from "@/components/region-hub/RegionHubBridgeCard";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import {
  REGION_HUB_JOBS_CTA,
  regionHubJobsCompactDetail,
  regionHubJobsCompactHeadline,
} from "@/lib/region-hub/copy";
import type { JobsPublicHubTeaser } from "@/lib/region-hub/jobs-public-teaser";
import { jobsPublicTeaserForSelection } from "@/lib/region-hub/jobs-public-teaser";
import { jobsPublicHrefFromSelection } from "@/lib/region-hub/paths";

type Props = {
  teaser: JobsPublicHubTeaser;
  selection: DemandRegionSelection;
  regionLabel: string;
  className?: string;
};

export default function DemandHubJobsPublicBridge({
  teaser,
  selection,
  regionLabel,
  className,
}: Props) {
  const scope = jobsPublicTeaserForSelection(teaser, selection);
  const href = jobsPublicHrefFromSelection(selection);
  const hasPosts = scope.jobCount > 0;

  return (
    <div className={className}>
      <RegionHubBridgeCard
        tone="indigo"
        kicker="채용"
        headline={regionHubJobsCompactHeadline()}
        detail={regionHubJobsCompactDetail(scope.jobCount, hasPosts)}
        href={href}
        cta={REGION_HUB_JOBS_CTA}
        ariaLabel={`${regionLabel} 채용 공고 보기`}
        compact
      />
    </div>
  );
}

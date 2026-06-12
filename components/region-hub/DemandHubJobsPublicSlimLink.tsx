import RegionHubBridgeCard from "@/components/region-hub/RegionHubBridgeCard";
import {
  REGION_HUB_JOBS_CTA,
  regionHubJobsSlimDetail,
  regionHubJobsSlimHook,
} from "@/lib/region-hub/copy";
import type { JobsPublicHubTeaser } from "@/lib/region-hub/jobs-public-teaser";

type Props = {
  teaser: JobsPublicHubTeaser;
};

export default function DemandHubJobsPublicSlimLink({ teaser }: Props) {
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

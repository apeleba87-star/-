import DemandHubWorkspace from "@/components/demand/DemandHubWorkspace";
import { getActiveDemandHubAds } from "@/lib/ads";
import { createClient } from "@/lib/supabase-server";
import { stripDemandHubBootstrapForClient } from "@/lib/demand/demand-data-redact";
import { getCachedDemandHubBootstrap } from "@/lib/demand/demand-cache";
import type { DemandUsageAccess } from "@/lib/demand/usage-limits";
import { getLatestMarketingReportDate } from "@/lib/report/latest-report-dates";
import { getCachedJobWageHubTeaserRaw } from "@/lib/report/job-wage-hub-teaser-cache";
import { toJobWageHubTeaserForTier } from "@/lib/report/job-wage-hub-teaser";

type Props = {
  initialAccess: DemandUsageAccess;
  tier: "guest" | "member" | "admin";
};

/** 허브 데이터 — Suspense 안에서 로드해 셸·피커를 먼저 표시 */
export default async function DemandHubBootstrapLoader({ initialAccess, tier }: Props) {
  const supabase = createClient();
  const [rawBootstrap, hubAds, marketingReportDate, rawJobWageTeaser] = await Promise.all([
    getCachedDemandHubBootstrap(),
    getActiveDemandHubAds(),
    getLatestMarketingReportDate(supabase),
    getCachedJobWageHubTeaserRaw(),
  ]);
  const bootstrap = stripDemandHubBootstrapForClient(rawBootstrap, tier);
  const jobWageTeaser = toJobWageHubTeaserForTier(rawJobWageTeaser, tier);

  return (
    <DemandHubWorkspace
      rtmsOverrides={bootstrap.rtmsSnapshot.byRegionKey}
      rtmsBaseMonthLabel={bootstrap.rtmsSnapshot.baseMonthLabel}
      rtmsSeries={bootstrap.rtmsSeries}
      keywordStore={bootstrap.keywordStore}
      scoreContext={bootstrap.scoreContext}
      dailyPulse={bootstrap.dailyPulse}
      initialAccess={initialAccess}
      hubAds={hubAds}
      jobWageTeaser={jobWageTeaser}
      marketingReportDate={marketingReportDate}
    />
  );
}

import DemandShell from "@/components/demand/DemandShell";
import DemandHubWorkspace from "@/components/demand/DemandHubWorkspace";
import { DEMAND_HUB_HERO } from "@/lib/demand/copy";
import { getCachedDemandHubBootstrap } from "@/lib/demand/demand-cache";

/** 입주레이더 허브 — `/` 및 legacy 경로 공통 */
export default async function DemandHubPageView() {
  const bootstrap = await getCachedDemandHubBootstrap();

  return (
    <DemandShell
      title={DEMAND_HUB_HERO.title}
      heroTagline={DEMAND_HUB_HERO.title}
      subtitle={DEMAND_HUB_HERO.subtitle}
      variant="minimal"
      searchVariant={false}
    >
      <DemandHubWorkspace
        rtmsOverrides={bootstrap.rtmsSnapshot.byRegionKey}
        rtmsBaseMonthLabel={bootstrap.rtmsSnapshot.baseMonthLabel}
        rtmsSeries={bootstrap.rtmsSeries}
        keywordStore={bootstrap.keywordStore}
        scoreContext={bootstrap.scoreContext}
        dailyPulse={bootstrap.dailyPulse}
      />
    </DemandShell>
  );
}

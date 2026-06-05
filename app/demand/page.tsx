import DemandShell from "@/components/demand/DemandShell";
import DemandHubWorkspace from "@/components/demand/DemandHubWorkspace";
import { DEMAND_HUB_HERO } from "@/lib/demand/copy";
import { getCachedDemandHubBootstrap } from "@/lib/demand/demand-cache";

export const revalidate = 3600;

export const metadata = {
  title: "입주수요 · 지역 탐색 | 클린아이덱스",
  description: `${DEMAND_HUB_HERO.subtitle}`,
};

export default async function DemandHubPage() {
  const bootstrap = await getCachedDemandHubBootstrap();

  return (
    <DemandShell
      title={DEMAND_HUB_HERO.title}
      heroTagline={DEMAND_HUB_HERO.title}
      subtitle={DEMAND_HUB_HERO.subtitle}
      variant="minimal"
      metaVariant="hub"
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

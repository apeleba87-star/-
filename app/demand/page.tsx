import DemandShell from "@/components/demand/DemandShell";
import DemandHubWorkspace from "@/components/demand/DemandHubWorkspace";
import { DEMAND_HUB_HERO } from "@/lib/demand/copy";
import { getDemandKeywordStore } from "@/lib/demand/keyword-query";
import { getDemandRtmsDistrictSnapshot, getDemandRtmsMonthlySeries } from "@/lib/demand/rtms-query";
import { buildDemandScoreContext } from "@/lib/demand/seoul-demand-ranking";

export const metadata = {
  title: "입주수요 · 지역 탐색 | 클린아이덱스",
  description: `${DEMAND_HUB_HERO.subtitle}`,
};

export default async function DemandHubPage() {
  const [rtmsSnapshot, rtmsSeries, keywordStore] = await Promise.all([
    getDemandRtmsDistrictSnapshot(),
    getDemandRtmsMonthlySeries(),
    getDemandKeywordStore(),
  ]);
  const scoreContext = buildDemandScoreContext(keywordStore, rtmsSnapshot.baseYyyymm);

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
        rtmsOverrides={rtmsSnapshot.bySlug}
        rtmsBaseMonthLabel={rtmsSnapshot.baseMonthLabel}
        rtmsSeries={rtmsSeries}
        keywordStore={keywordStore}
        scoreContext={scoreContext}
      />
    </DemandShell>
  );
}

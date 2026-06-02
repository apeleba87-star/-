import DemandShell from "@/components/demand/DemandShell";
import DemandHubWorkspace from "@/components/demand/DemandHubWorkspace";
import { DEMAND_HUB_HERO } from "@/lib/demand/copy";
import { getDemandKeywordHubData } from "@/lib/demand/keyword-query";
import { getDemandRtmsDistrictSnapshot, getDemandRtmsMonthlySeries } from "@/lib/demand/rtms-query";

export const metadata = {
  title: "입주수요 · 지역 탐색 | 클린아이덱스",
  description: `${DEMAND_HUB_HERO.subtitle} ${DEMAND_HUB_HERO.title}`,
};

export default async function DemandHubPage() {
  const [rtmsSnapshot, rtmsSeries, keywordHub] = await Promise.all([
    getDemandRtmsDistrictSnapshot(),
    getDemandRtmsMonthlySeries(),
    getDemandKeywordHubData(),
  ]);

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
        keywordHub={keywordHub}
      />
    </DemandShell>
  );
}

import DemandShell from "@/components/demand/DemandShell";
import DemandHubWorkspace from "@/components/demand/DemandHubWorkspace";
import { getActiveDemandHubAds } from "@/lib/ads";
import { isDemandAdmin } from "@/lib/demand/access";
import { stripDemandHubBootstrapForClient } from "@/lib/demand/demand-data-redact";
import { getDemandUsageAccess } from "@/lib/demand/demand-usage-access";
import { DEMAND_HUB_HERO } from "@/lib/demand/copy";
import { getCachedDemandHubBootstrap } from "@/lib/demand/demand-cache";

/** 입주레이더 허브 — `/` 및 legacy 경로 공통 */
export default async function DemandHubPageView() {
  const isAdmin = await isDemandAdmin();
  const [access, rawBootstrap, hubAds] = await Promise.all([
    getDemandUsageAccess(isAdmin),
    getCachedDemandHubBootstrap(),
    getActiveDemandHubAds(),
  ]);
  const tier = access.tier === "admin" ? "admin" : access.tier;
  const bootstrap = stripDemandHubBootstrapForClient(rawBootstrap, tier);

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
        initialAccess={access}
        hubAds={hubAds}
      />
    </DemandShell>
  );
}

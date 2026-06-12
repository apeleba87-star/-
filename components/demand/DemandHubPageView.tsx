import { Suspense } from "react";
import DemandShell from "@/components/demand/DemandShell";
import DemandHubBootstrapLoader from "@/components/demand/DemandHubBootstrapLoader";
import { isDemandAdmin } from "@/lib/demand/access";
import { getDemandUsageAccess } from "@/lib/demand/demand-usage-access";
import { DEMAND_HUB_HERO } from "@/lib/demand/copy";

function HubBootstrapFallback() {
  return (
    <p className="py-8 text-center text-sm text-slate-500" role="status">
      입주레이더 불러오는 중…
    </p>
  );
}

/** 입주레이더 허브 — `/` 및 legacy 경로 공통 */
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DemandHubPageView(_props: Props = {}) {
  const isAdmin = await isDemandAdmin();
  const access = await getDemandUsageAccess(isAdmin);
  const tier = access.tier === "admin" ? "admin" : access.tier;

  return (
    <DemandShell
      title={DEMAND_HUB_HERO.title}
      heroTagline={DEMAND_HUB_HERO.title}
      subtitle={DEMAND_HUB_HERO.subtitle}
      variant="minimal"
      searchVariant={false}
    >
      <Suspense fallback={<HubBootstrapFallback />}>
        <DemandHubBootstrapLoader initialAccess={access} tier={tier} />
      </Suspense>
    </DemandShell>
  );
}

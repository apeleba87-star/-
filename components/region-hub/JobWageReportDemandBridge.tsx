import RegionHubBridgeCard from "@/components/region-hub/RegionHubBridgeCard";
import {
  REGION_HUB_DEMAND_CTA,
  regionHubDemandFromReportHeadline,
  regionHubDemandJobsPageHeadline,
  regionHubDemandSlimDetail,
} from "@/lib/region-hub/copy";
import { demandHubHrefFromSelection } from "@/lib/region-hub/paths";
import { demandSelectionFromProvinceLabel } from "@/lib/region-hub/selection-bridge";

type Props = {
  highlightProvince?: string | null;
};

/** 일당 리포트 — 입주레이더 슬림 진입 */
export default function JobWageReportDemandBridge({ highlightProvince }: Props) {
  const selection = highlightProvince ? demandSelectionFromProvinceLabel(highlightProvince) : null;

  if (selection && selection.scope !== "national") {
    return (
      <RegionHubBridgeCard
        tone="emerald"
        kicker="입주"
        headline={regionHubDemandFromReportHeadline(highlightProvince!)}
        detail={regionHubDemandSlimDetail()}
        href={demandHubHrefFromSelection(selection)}
        cta={REGION_HUB_DEMAND_CTA}
        ariaLabel={`${highlightProvince} 입주 수요 보기`}
        compact
      />
    );
  }

  return (
    <RegionHubBridgeCard
      tone="emerald"
      kicker="입주"
      headline={regionHubDemandJobsPageHeadline()}
      detail={regionHubDemandSlimDetail()}
      href="/"
      cta={REGION_HUB_DEMAND_CTA}
      ariaLabel="전국 입주·이사 수요 보기"
      compact
    />
  );
}

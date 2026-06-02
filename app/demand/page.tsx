import DemandShell from "@/components/demand/DemandShell";
import DemandHubWorkspace from "@/components/demand/DemandHubWorkspace";
import { getDemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";

export const metadata = {
  title: "입주수요 · 지역 탐색 | 클린아이덱스",
  description: "이번 달 영업할 구를 고르고, 거래·검색 지표로 비교하세요.",
};

export default async function DemandHubPage() {
  const keywordMetrics = await getDemandNationalKeywordMetrics();

  return (
    <DemandShell
      title="지역 탐색"
      heroTagline="이번 달, 어느 구부터 볼까?"
      variant="minimal"
      hideNav
      metaVariant="hub"
    >
      <DemandHubWorkspace keywordMetrics={keywordMetrics} />
    </DemandShell>
  );
}

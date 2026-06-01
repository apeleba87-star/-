import Link from "next/link";
import DemandShell from "@/components/demand/DemandShell";
import DemandRegionTable from "@/components/demand/DemandRegionTable";
import { getDemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";

export const metadata = {
  title: "입주수요 · 지역 비교 | 클린아이덱스",
  description: "지역을 최대 5곳까지 추가해 포장이사·입주청소 검색량과 지수, 전월세·매매 거래를 비교하세요.",
};

export default async function DemandHubPage() {
  const keywordMetrics = await getDemandNationalKeywordMetrics();

  return (
    <DemandShell title="지역 비교" variant="minimal" hideNav>
      <DemandRegionTable keywordMetrics={keywordMetrics} />

      <p className="mt-8 text-center text-xs text-slate-400">
        <Link href="/demand/top" className="hover:text-teal-700">
          TOP10
        </Link>
        {" · "}
        <Link href="/demand/hits" className="hover:text-teal-700">
          적중 기록
        </Link>
      </p>
    </DemandShell>
  );
}

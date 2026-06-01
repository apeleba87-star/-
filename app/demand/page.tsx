import Link from "next/link";
import { Suspense } from "react";
import DemandShell from "@/components/demand/DemandShell";
import DemandRegionTable from "@/components/demand/DemandRegionTable";
import DemandHubTabs from "@/components/demand/DemandHubTabs";

export const metadata = {
  title: "입주수요 · 지역별 현황 | 클린아이덱스",
  description: "지역을 최대 5곳까지 추가해 포장이사·입주청소 검색지수와 전월세·매매 거래 건수를 비교하세요.",
};

function TabsFallback() {
  return null;
}

export default function DemandHubPage() {
  return (
    <DemandShell title="입주수요" subtitle={undefined} metaVariant="hub" searchVariant={false}>
      <DemandRegionTable />

      <details className="mt-10 rounded-xl border border-slate-200 bg-slate-50/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-600">
          오늘 브리핑 · 월간 탐험
        </summary>
        <div className="border-t border-slate-200 px-2 pb-4 pt-2">
          <Suspense fallback={<TabsFallback />}>
            <DemandHubTabs />
          </Suspense>
        </div>
      </details>

      <p className="mt-4 text-center text-xs text-slate-400">
        <Link href="/demand/top" className="hover:text-teal-700">
          TOP10
        </Link>
        {" · "}
        <Link href="/demand/movers" className="hover:text-teal-700">
          급상승
        </Link>
        {" · "}
        <Link href="/demand/hits" className="hover:text-teal-700">
          적중
        </Link>
      </p>
    </DemandShell>
  );
}

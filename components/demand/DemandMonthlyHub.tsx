import Link from "next/link";
import { DemandReveal } from "@/components/demand/DemandReveal";
import DemandRankRow from "@/components/demand/DemandRankRow";
import DemandMoverRow from "@/components/demand/DemandMoverRow";
import DemandWatchlist from "@/components/demand/DemandWatchlist";
import { DEMAND_MOVERS, DEMAND_TOP10 } from "@/lib/demand/dummy-data";

export default function DemandMonthlyHub() {
  return (
    <div className="space-y-4">
      <DemandReveal label="TOP10" hint="10개 구 · 이름만 보이고 상세는 클릭">
        <ul className="space-y-2">
          {DEMAND_TOP10.map((d) => (
            <li key={d.slug}>
              <DemandRankRow district={d} />
            </li>
          ))}
        </ul>
        <Link href="/demand/top" className="mt-2 inline-block text-xs font-semibold text-slate-500 hover:text-teal-700">
          목록 페이지 →
        </Link>
      </DemandReveal>

      <DemandReveal label="급상승" hint={`${DEMAND_MOVERS.length}개`}>
        <ul className="space-y-2">
          {DEMAND_MOVERS.slice(0, 5).map((d) => (
            <li key={d.slug}>
              <DemandMoverRow district={d} />
            </li>
          ))}
        </ul>
        <Link href="/demand/movers" className="mt-2 inline-block text-xs font-semibold text-slate-500 hover:text-teal-700">
          전체 →
        </Link>
      </DemandReveal>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/demand/region" className="font-semibold text-slate-600 hover:text-teal-800">
          지역 목록
        </Link>
        <Link
          href="/demand/compare?gu1=gangseo-gu&gu2=yangcheon-gu&gu3=mapo-gu"
          className="font-semibold text-slate-600 hover:text-teal-800"
        >
          3구 비교
        </Link>
        <Link href="/demand/hits" className="font-semibold text-slate-600 hover:text-teal-800">
          적중
        </Link>
      </div>

      <DemandReveal label="내 영업 구역" hint="저장 · 비교">
        <DemandWatchlist />
      </DemandReveal>
    </div>
  );
}

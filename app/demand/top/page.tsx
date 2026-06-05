import DemandShell from "@/components/demand/DemandShell";
import DemandHeatBadge from "@/components/demand/DemandHeatBadge";
import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import { formatDemandScoreBasis } from "@/lib/demand/district-demand-score";
import { getDemandKeywordStore } from "@/lib/demand/keyword-query";
import { getDemandRtmsDistrictSnapshot } from "@/lib/demand/rtms-query";
import {
  buildDemandScoreContext,
  buildSeoulDemandRanking,
} from "@/lib/demand/seoul-demand-ranking";
import Link from "next/link";

export const metadata = {
  title: "서울 지역수요점수 순위 | 클린아이덱스",
};

export default async function DemandTopPage() {
  const [rtmsSnapshot, keywordStore] = await Promise.all([
    getDemandRtmsDistrictSnapshot(),
    getDemandKeywordStore(),
  ]);
  const scoreContext = buildDemandScoreContext(keywordStore, rtmsSnapshot.baseYyyymm);
  const ranking = buildSeoulDemandRanking(scoreContext, rtmsSnapshot.bySlug);
  const basis = formatDemandScoreBasis({
    searchYyyymm: scoreContext.national.searchYyyymm,
    rtmsYyyymm: scoreContext.rtmsYyyymm,
    mixedMonths: Boolean(
      scoreContext.national.searchYyyymm &&
        scoreContext.rtmsYyyymm &&
        scoreContext.national.searchYyyymm !== scoreContext.rtmsYyyymm
    ),
  });

  return (
    <DemandShell
      title="서울 25구 · 지역수요점수"
      subtitle={`${DEMAND_METRIC_LABELS.demandScore} · ${basis}`}
    >
      <ol className="space-y-2">
        {ranking.map((row) => (
          <li key={row.slug}>
            <Link
              href={`/demand/region/${row.slug}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-teal-200"
            >
              <span className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-bold tabular-nums text-slate-400">
                  {row.rank}
                </span>
                <span className="font-semibold text-slate-900">{row.gu}</span>
              </span>
              <DemandHeatBadge band={row.score.band} score={row.score.score} />
            </Link>
          </li>
        ))}
      </ol>
    </DemandShell>
  );
}

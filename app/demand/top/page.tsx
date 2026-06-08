import DemandShell from "@/components/demand/DemandShell";
import DemandHeatBadge from "@/components/demand/DemandHeatBadge";
import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import { getCachedDemandHubBootstrap } from "@/lib/demand/demand-cache";
import { formatDemandScoreBasis } from "@/lib/demand/district-demand-score";
import {
  buildDemandScoreContext,
  buildSeoulDemandRanking,
} from "@/lib/demand/seoul-demand-ranking";
import Link from "next/link";

export const metadata = {
  title: "서울 입주 예상 점수 순위 | 클린아이덱스",
};

export const revalidate = 3600;

export default async function DemandTopPage() {
  const bootstrap = await getCachedDemandHubBootstrap();
  const { rtmsSnapshot, rtmsSeries, keywordStore, scoreContext } = bootstrap;
  const ranking = buildSeoulDemandRanking(scoreContext);
  const basis = formatDemandScoreBasis(ranking[0]?.score.basis ?? {
    targetYyyymm: scoreContext.targetYyyymm,
    signalYyyymm: scoreContext.signalYyyymm,
    searchYyyymm: scoreContext.signalYyyymm,
    rtmsYyyymm: scoreContext.signalYyyymm,
    mixedMonths: false,
  });

  return (
    <DemandShell
      title="서울 25구 · 입주 예상 점수"
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
              <DemandHeatBadge band={row.score.band} score={row.score.score} heat={row.score.heat} />
            </Link>
          </li>
        ))}
      </ol>
    </DemandShell>
  );
}

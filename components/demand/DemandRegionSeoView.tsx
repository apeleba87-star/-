import Link from "next/link";
import DemandHeatBadge from "@/components/demand/DemandHeatBadge";
import {
  DEMAND_METRIC_LABELS,
  DEMAND_SEARCH_NATIONAL_BADGE,
  DEMAND_SCORE_ABOUT,
  DEMAND_SCORE_CARD_SUB,
  DEMAND_SEARCH_SECTION_LABEL,
  DEMAND_TRADE_SECTION_LABEL,
  formatMomPercent,
  formatSearchIndexPercent,
} from "@/lib/demand/copy";
import { DEMAND_HEAT_BAND_LABELS } from "@/lib/demand/copy";
import { formatDemandScoreSimpleSummary } from "@/lib/demand/district-demand-score";
import { demandRtmsSeriesKeyForRow, buildDemandMetricChartSeries } from "@/lib/demand/scope-data";
import type { RegionSeoPageData } from "@/lib/demand/region-seo-data";
import { demandRegionSeoPath } from "@/lib/demand/region-seo-path";
import { cn } from "@/lib/utils";

const AD_FIT_CLASS: Record<string, string> = {
  very_high: "bg-teal-50 text-teal-900 ring-teal-200",
  high: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  mid: "bg-amber-50 text-amber-900 ring-amber-200",
  low: "bg-slate-100 text-slate-700 ring-slate-200",
};

function MetricCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white px-4 py-3", className)}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  );
}

export default function DemandRegionSeoView({ data }: { data: RegionSeoPageData }) {
  const { row, pathLabel, adFit, insightLine, neighbors, rtmsSeries } = data;
  const rtmsKey = demandRtmsSeriesKeyForRow(row);
  const jeonseChart = buildDemandMetricChartSeries(row, "jeonse", "12m", { rtmsSeries });
  const recentTrade = jeonseChart.points.slice(-6);

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">입주레이더</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {pathLabel} 입주청소·입주 수요
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">{formatDemandScoreSimpleSummary(row.demandScore)}</p>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">{insightLine}</p>
      </header>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {DEMAND_METRIC_LABELS.demandScore}
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-white px-4 py-4">
          <DemandHeatBadge
            band={row.demandScore.band}
            score={row.demandScore.score}
            heat={row.demandScore.heat}
            prominent
          />
          <p className="min-w-0 flex-1 text-xs text-slate-600">{DEMAND_SCORE_CARD_SUB}</p>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {DEMAND_TRADE_SECTION_LABEL}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label={DEMAND_METRIC_LABELS.jeonse}
            value={`${row.jeonseCount.toLocaleString("ko-KR")}건`}
            sub={`전월 대비 ${formatMomPercent(row.jeonseMom)}`}
          />
          <MetricCard
            label={DEMAND_METRIC_LABELS.sale}
            value={`${row.saleCount.toLocaleString("ko-KR")}건`}
            sub={`전월 대비 ${formatMomPercent(row.saleMom)}`}
          />
        </div>
        {recentTrade.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <p className="text-[11px] font-medium text-slate-500">전월세 거래 흐름 (최근 {recentTrade.length}개월)</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {recentTrade.map((p) => (
                <li
                  key={p.period}
                  className="rounded-md bg-white px-2 py-1 text-xs tabular-nums text-slate-700 ring-1 ring-slate-200"
                >
                  {p.period} · {p.value}건
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-slate-400">{jeonseChart.subtitle}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {DEMAND_SEARCH_SECTION_LABEL}
          </p>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            {DEMAND_SEARCH_NATIONAL_BADGE}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard
            label={DEMAND_METRIC_LABELS.packingVolume}
            value={
              row.packing.searchVolumeMonth != null
                ? row.packing.searchVolumeBelowTen
                  ? "10건 미만"
                  : `${Math.round(row.packing.searchVolumeMonth / 1000) / 10}만`
                : "—"
            }
          />
          <MetricCard
            label={DEMAND_METRIC_LABELS.packingIndex}
            value={formatSearchIndexPercent(row.packing.indexMomPercent)}
            sub="전월 대비"
          />
          <MetricCard
            label={DEMAND_METRIC_LABELS.moveInVolume}
            value={
              row.moveInClean.searchVolumeMonth != null
                ? row.moveInClean.searchVolumeBelowTen
                  ? "10건 미만"
                  : `${Math.round(row.moveInClean.searchVolumeMonth / 1000) / 10}만`
                : "—"
            }
          />
          <MetricCard
            label={DEMAND_METRIC_LABELS.moveInIndex}
            value={formatSearchIndexPercent(row.moveInClean.indexMomPercent)}
            sub="전월 대비"
          />
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          입주청소 광고 적합도
        </p>
        <div className={cn("rounded-xl px-4 py-3 ring-1", AD_FIT_CLASS[adFit.band])}>
          <p className="text-lg font-bold">{adFit.label}</p>
          <p className="mt-1 text-sm leading-relaxed opacity-90">{adFit.reason}</p>
        </div>
      </section>

      {neighbors.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">주변 지역 비교</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {neighbors.map((n) => (
              <li key={n.guSlug}>
                <Link
                  href={demandRegionSeoPath(n.cityId, n.guSlug)}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{n.gu}</span>
                  <span className="text-sm tabular-nums text-slate-600">
                    {Math.round(n.score)} · {DEMAND_HEAT_BAND_LABELS[n.band]?.label ?? n.band}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-slate-700">이 지역 입주·청소 업체 광고</p>
        <p className="mt-1 text-xs text-slate-500">광고 문의 · 영업 우선 지역 노출 (준비 중)</p>
        <Link
          href="/estimate"
          className="mt-3 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          견적·문의
        </Link>
      </section>

      <footer className="space-y-2 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500">
        <p>{DEMAND_SCORE_ABOUT}</p>
        <p>
          거래=국토부 RTMS 아파트 실거래, 검색=전국 이사·입주청소 관련 키워드. 영업·광고 참고용이며 매출을
          보장하지 않습니다.
        </p>
        <Link href="/" className="font-semibold text-teal-700 hover:underline">
          입주레이더에서 비교·그래프 보기 →
        </Link>
      </footer>
    </article>
  );
}

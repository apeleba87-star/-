import Link from "next/link";

import DemandHeatBadge from "@/components/demand/DemandHeatBadge";
import {
  DEMAND_HEAT_BAND_LABELS,
  DEMAND_METRIC_LABELS,
  formatMomPercent,
  formatSearchIndexPercent,
} from "@/lib/demand/copy";
import { formatDemandScoreSimpleSummary } from "@/lib/demand/district-demand-score";
import { buildDemandMetricChartSeries, demandRtmsSeriesKeyForRow } from "@/lib/demand/scope-data";
import type { RegionSeoPageData } from "@/lib/demand/region-seo-data";
import { moveRegionPath, moveRegionAliasForDistrict } from "@/lib/demand/move-region-path";
import { cn } from "@/lib/utils";

function metricLabel(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "데이터 준비 중";
  return `${Math.round(value).toLocaleString("ko-KR")}${suffix}`;
}

function volumeLabel(value: number | null | undefined, belowTen?: boolean): string {
  if (belowTen) return "10회 미만";
  if (value == null || !Number.isFinite(value)) return "데이터 준비 중";
  if (value >= 10_000) return `${Math.round(value / 1000) / 10}만 회`;
  return `${Math.round(value).toLocaleString("ko-KR")}회`;
}

function MetricCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{sub}</p>
    </div>
  );
}

function moveDecisionText(data: RegionSeoPageData): string {
  const { row, pathLabel } = data;
  const bandLabel = DEMAND_HEAT_BAND_LABELS[row.demandScore.band]?.label ?? "보통";
  if (row.demandScore.score >= 70) {
    return `${pathLabel}은 입주·이사 수요 신호가 강한 편입니다. 실거주 후보로 본다면 매물 가격뿐 아니라 전세 거래와 입주청소 수요가 같이 움직이는지 확인할 만합니다.`;
  }
  if (row.demandScore.score >= 45) {
    return `${pathLabel}은 일부 지표가 살아 있지만 지역별 편차가 있을 수 있습니다. 예산, 출퇴근, 주변 생활권을 함께 놓고 비교하는 접근이 좋습니다.`;
  }
  return `${pathLabel}은 현재 데이터상 입주 수요 신호가 강하지 않습니다. 급하게 판단하기보다 주변 지역과 가격·거래 흐름을 같이 비교해 보세요.`;
}

function checklist(pathLabel: string): string[] {
  return [
    `${pathLabel} 최근 매매 거래와 전세 거래가 함께 늘어나는지 확인하세요.`,
    "입주 전에는 관리비, 주차, 학군, 출퇴근 시간을 실제 동선 기준으로 점검하세요.",
    "이사 일정이 정해졌다면 입주청소는 최소 1~2주 전에 후보 업체를 비교하는 편이 안전합니다.",
    "검색량이 높은 지역은 청소·이사 업체 예약이 빨리 차는 경우가 있어 주말 일정은 먼저 확인하세요.",
  ];
}

export default function MoveRegionSeoView({ data }: { data: RegionSeoPageData }) {
  const { row, pathLabel, neighbors, rtmsSeries } = data;
  const rtmsKey = demandRtmsSeriesKeyForRow(row);
  const jeonseChart = buildDemandMetricChartSeries(row, "jeonse", "12m", { rtmsSeries });
  const saleChart = buildDemandMetricChartSeries(row, "sale", "12m", { rtmsSeries });
  const recentJeonse = jeonseChart.points.slice(-6);
  const recentSale = saleChart.points.slice(-6);

  return (
    <article className="space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/60 px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Move Signal</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {pathLabel} 이사 후보 분석
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          RTMS 실거래 흐름과 입주청소·이사 검색 신호를 바탕으로 {pathLabel}을 이사 후보 지역으로 볼 때
          확인할 지표를 정리했습니다.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <DemandHeatBadge
            band={row.demandScore.band}
            score={row.demandScore.score}
            heat={row.demandScore.heat}
            prominent
          />
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {formatDemandScoreSimpleSummary(row.demandScore)}
          </span>
        </div>
      </header>

      <section className="rounded-2xl border border-teal-100 bg-teal-50/60 px-5 py-5">
        <h2 className="text-lg font-extrabold text-slate-950">이 지역, 지금 이사 후보로 볼 만할까?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{moveDecisionText(data)}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-950">최근 실거래 흐름</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            title={DEMAND_METRIC_LABELS.jeonse}
            value={metricLabel(row.jeonseCount, "건")}
            sub={`전월 대비 ${formatMomPercent(row.jeonseMom)} · 전세 이동 수요 참고`}
          />
          <MetricCard
            title={DEMAND_METRIC_LABELS.sale}
            value={metricLabel(row.saleCount, "건")}
            sub={`전월 대비 ${formatMomPercent(row.saleMom)} · 매매 손바뀜 참고`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[{ title: "전세 거래 6개월", points: recentJeonse }, { title: "매매 거래 6개월", points: recentSale }].map((group) => (
            <div key={group.title} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold text-slate-500">{group.title}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.points.map((point) => (
                  <li key={`${group.title}-${point.period}`} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">
                    {point.period} · {point.value}건
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-950">입주·이사 수요 신호</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="입주청소 검색량"
            value={volumeLabel(row.moveInClean.searchVolumeMonth, row.moveInClean.searchVolumeBelowTen)}
            sub={`전월 대비 ${formatSearchIndexPercent(row.moveInClean.indexMomPercent)}`}
          />
          <MetricCard
            title="이사 검색량"
            value={volumeLabel(row.packing.searchVolumeMonth, row.packing.searchVolumeBelowTen)}
            sub={`전월 대비 ${formatSearchIndexPercent(row.packing.indexMomPercent)}`}
          />
          <MetricCard
            title="입주 수요 점수"
            value={`${Math.round(row.demandScore.score)}점`}
            sub={DEMAND_HEAT_BAND_LABELS[row.demandScore.band]?.label ?? row.demandScore.band}
          />
          <MetricCard
            title="데이터 기준"
            value={row.demandScore.basis.targetYyyymm ?? "최근"}
            sub="RTMS·검색량 자동 갱신"
          />
        </div>
      </section>

      {neighbors.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-slate-950">주변 지역과 비교</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {neighbors.map((neighbor) => {
              const alias = moveRegionAliasForDistrict(neighbor.cityId, neighbor.guSlug);
              return (
                <li key={neighbor.guSlug}>
                  <Link
                    href={alias ? moveRegionPath(alias.regionSlug) : "#"}
                    className={cn("flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50", !alias && "pointer-events-none")}
                  >
                    <span className="font-semibold text-slate-900">{neighbor.gu}</span>
                    <span className="text-sm tabular-nums text-slate-600">
                      {Math.round(neighbor.score)}점 · {DEMAND_HEAT_BAND_LABELS[neighbor.band]?.label ?? neighbor.band}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-950">입주 전 체크리스트</h2>
        <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          {checklist(pathLabel).map((item) => (
            <li key={item} className="text-sm leading-relaxed text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-700 to-teal-900 px-5 py-6 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">Move-in Cleaning</p>
        <h2 className="mt-2 text-2xl font-black">이 지역 입주청소 업체 보기</h2>
        <p className="mt-2 text-sm leading-relaxed text-teal-50">
          입주 일정이 가까워졌다면 청소 가능 일정과 견적을 먼저 확인하세요. 지역별 업체 연결 기능은 준비 중이며,
          현재는 견적 문의로 연결됩니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/estimate" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-teal-800">
            입주청소 견적 준비하기
          </Link>
          <Link href="/" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/30">
            입주레이더 더 보기
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
        <p>
          본 페이지는 국토부 RTMS 아파트 실거래 데이터와 입주청소·이사 검색 신호를 활용한 참고 자료입니다.
          특정 지역의 가격 상승이나 청소업체 매출을 보장하지 않습니다.
        </p>
      </footer>
    </article>
  );
}


import {
  DEMAND_NATIONAL_INTEREST_BASELINE,
  formatSearchVolumeMonth,
} from "@/lib/demand/copy";
import type { DemandHeatBand } from "@/lib/demand/district-demand-score";
import { formatDemandScoreBasis } from "@/lib/demand/district-demand-score";
import type { DemandKeywordChartPoint, DemandKeywordStore } from "@/lib/demand/keyword-hub-data";
import { resolveDemandKeywordBundle } from "@/lib/demand/keyword-resolve";
import { getDemandNationalKeywordMetrics } from "@/lib/demand/keyword-metrics";
import type { DemandRtmsSeriesStore } from "@/lib/demand/rtms-types";
import {
  buildSeoulDemandRanking,
  demandScoreForNational,
  type DemandScoreContext,
} from "@/lib/demand/seoul-demand-ranking";
import { getKstTodayString } from "@/lib/jobs/kst-date";

export type DailyPulseAlertTone = "info" | "warning" | "success" | "danger";

export type DailyPulseAlert = {
  tone: DailyPulseAlertTone;
  message: string;
};

export type DailyPulseTopDistrict = {
  slug: string;
  gu: string;
  rank: number;
  score: number;
  band: DemandHeatBand;
  regionalComposite: number | null;
  jeonseCount: number;
  saleCount: number;
};

export type DailyPulseSparkSeries = {
  label: string;
  points: DemandKeywordChartPoint[];
  tone: "packing" | "moveIn";
};

export type DailyPulseData = {
  updatedDateLabel: string;
  nationalComposite: number;
  nationalChangePct: number;
  basisLabel: string;
  interpretation: string;
  packingIndexDod: number | null;
  moveInIndexDod: number | null;
  packingRollingVolume: number | null;
  moveInRollingVolume: number | null;
  packingRollingBelowTen: boolean;
  moveInRollingBelowTen: boolean;
  rollingSnapshotLabel: string | null;
  indexSparklines: DailyPulseSparkSeries[];
  rollingSparklines: DailyPulseSparkSeries[];
  alerts: DailyPulseAlert[];
  topDistricts: DailyPulseTopDistrict[];
  keywordLive: boolean;
};

const SPARKLINE_DAYS = 7;

const ALERT_DOD_THRESHOLD = 10;
const ALERT_WEEK_TREND_THRESHOLD = 15;
const ALERT_ROLLING_WOW_THRESHOLD = 5;

function sliceLastDays(points: DemandKeywordChartPoint[], days: number): DemandKeywordChartPoint[] {
  return points.slice(-days);
}

function weekChangePct(points: DemandKeywordChartPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first <= 0) return null;
  return Math.round(((last - first) / first) * 1000) / 10;
}

function consecutiveDownDays(points: DemandKeywordChartPoint[]): number {
  if (points.length < 2) return 0;
  let streak = 0;
  for (let i = points.length - 1; i > 0; i -= 1) {
    if (points[i].value < points[i - 1].value) streak += 1;
    else break;
  }
  return streak;
}

function buildAlerts(params: {
  packingDod: number | null;
  moveInDod: number | null;
  packingIndexSeries: DemandKeywordChartPoint[];
  moveInIndexSeries: DemandKeywordChartPoint[];
  packingRollingSeries: DemandKeywordChartPoint[];
  moveInRollingSeries: DemandKeywordChartPoint[];
}): DailyPulseAlert[] {
  const alerts: DailyPulseAlert[] = [];

  if (params.moveInDod != null && params.moveInDod <= -ALERT_DOD_THRESHOLD) {
    alerts.push({
      tone: "warning",
      message: `입주청소 검색지수 전일 ${params.moveInDod}% — 급락 구간`,
    });
  }
  if (params.packingDod != null && params.packingDod >= ALERT_DOD_THRESHOLD) {
    alerts.push({
      tone: "success",
      message: `이사 검색지수 전일 +${params.packingDod}% — 관심 상승`,
    });
  }

  const moveInStreak = consecutiveDownDays(params.moveInIndexSeries);
  const moveInWeek = weekChangePct(params.moveInIndexSeries);
  if (moveInStreak >= 3 && moveInWeek != null && moveInWeek <= -ALERT_WEEK_TREND_THRESHOLD) {
    alerts.push({
      tone: "warning",
      message: `입주청소 검색지수 — ${moveInStreak}일 연속 하락 (최근 ${SPARKLINE_DAYS}일 ${moveInWeek}%)`,
    });
  }

  const packingRollWeek = weekChangePct(params.packingRollingSeries);
  if (packingRollWeek != null && Math.abs(packingRollWeek) >= ALERT_ROLLING_WOW_THRESHOLD) {
    const sign = packingRollWeek > 0 ? "+" : "";
    alerts.push({
      tone: packingRollWeek > 0 ? "info" : "warning",
      message: `롤링 30일 포장 검색량 — ${SPARKLINE_DAYS}일 전 대비 ${sign}${packingRollWeek}%`,
    });
  }

  return alerts.slice(0, 4);
}

function buildInterpretation(
  composite: number,
  changePct: number,
  moveInWeek: number | null,
  packingDod: number | null
): string {
  const vsBase = composite - DEMAND_NATIONAL_INTEREST_BASELINE;
  const high = vsBase >= 8;
  const low = vsBase <= -8;
  const moveInWeak = moveInWeek != null && moveInWeek <= -10;

  if (high && moveInWeak) {
    return "전국 관심(composite)은 1년 중앙값보다 높지만, 최근 입주청소 검색지수는 하락세입니다. 전국 캠페인은 유지하되 구 영업은 월간 점수표와 함께 보세요.";
  }
  if (high) {
    return "전국 이사·입주 관심이 1년 중앙값보다 높습니다. 이번 달 입주·청소 수요 참고에 유리한 국면입니다.";
  }
  if (low) {
    return "전국 관심이 1년 중앙값보다 낮습니다. 구 단위 RTMS·수요점수로 상대적으로 강한 곳을 골라 보세요.";
  }
  if (packingDod != null && packingDod >= 5) {
    return "전국 composite는 보통 수준이나, 이사 검색지수가 최근 반등했습니다. 단기 캠페인 타이밍을 검토해 볼 수 있습니다.";
  }
  if (changePct >= 0) {
    return "전국 관심은 중립~다소 양호합니다. 아래 7일 추이와 알림을 함께 확인하세요.";
  }
  return "전국 관심이 다소 약합니다. TOP 구 목록과 허브 비교표로 상대적으로 강한 구를 찾아보세요.";
}

function rollingSnapshotLabel(ymd: string | null | undefined): string | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return null;
  return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일 수집`;
}

export async function buildDailyPulseData(
  keywordStore: DemandKeywordStore | null | undefined,
  scoreContext: DemandScoreContext,
  rtmsSeries: DemandRtmsSeriesStore
): Promise<DailyPulseData> {
  const fallback = await getDemandNationalKeywordMetrics();
  const bundle = resolveDemandKeywordBundle(
    keywordStore ?? { byRegion: {} },
    { scope: "national" },
    fallback
  );

  const nationalScore = demandScoreForNational(scoreContext);
  const composite = nationalScore.score;
  const changePct = nationalScore.national.changePct ?? 0;
  const basisLabel = formatDemandScoreBasis(nationalScore.basis);

  const packingIndexSeries = sliceLastDays(bundle.dailySeries.packing, SPARKLINE_DAYS);
  const moveInIndexSeries = sliceLastDays(bundle.dailySeries.move_in_clean, SPARKLINE_DAYS);
  const packingRollingSeries = sliceLastDays(
    bundle.rollingVolumeDailySeries?.packing ?? [],
    SPARKLINE_DAYS
  );
  const moveInRollingSeries = sliceLastDays(
    bundle.rollingVolumeDailySeries?.move_in_clean ?? [],
    SPARKLINE_DAYS
  );

  const ranking = buildSeoulDemandRanking(scoreContext).slice(0, 5);
  const signalYm = scoreContext.signalYyyymm;

  const topDistricts: DailyPulseTopDistrict[] = ranking.map((row) => {
    const rtmsKey = `district:seoul:${row.slug}`;
    const pt = signalYm
      ? (rtmsSeries[rtmsKey] ?? []).find((p) => p.yyyymm === signalYm)
      : null;
    return {
      slug: row.slug,
      gu: row.gu,
      rank: row.rank,
      score: row.score.score,
      band: row.score.band,
      regionalComposite: row.score.v2?.regional.compositeIndex ?? null,
      jeonseCount: pt?.jeonseCount ?? 0,
      saleCount: pt?.saleCount ?? 0,
    };
  });

  const moveInWeek = weekChangePct(moveInIndexSeries);

  const today = getKstTodayString();
  const [ty, tm, td] = today.split("-");

  return {
    updatedDateLabel: `${Number(ty)}년 ${Number(tm)}월 ${Number(td)}일 KST`,
    nationalComposite: composite,
    nationalChangePct: changePct,
    basisLabel,
    interpretation: buildInterpretation(composite, changePct, moveInWeek, bundle.packing.indexDodPercent),
    packingIndexDod: bundle.source.datalab === "live" ? bundle.packing.indexDodPercent : null,
    moveInIndexDod: bundle.source.datalab === "live" ? bundle.moveInClean.indexDodPercent : null,
    packingRollingVolume: bundle.packing.searchVolumeBelowTen
      ? null
      : bundle.packing.searchVolumeMonth,
    moveInRollingVolume: bundle.moveInClean.searchVolumeBelowTen
      ? null
      : bundle.moveInClean.searchVolumeMonth,
    packingRollingBelowTen: bundle.packing.searchVolumeBelowTen,
    moveInRollingBelowTen: bundle.moveInClean.searchVolumeBelowTen,
    rollingSnapshotLabel: rollingSnapshotLabel(bundle.searchVolumeRollingSnapshotDate),
    indexSparklines: [
      { label: "이사 검색지수", points: packingIndexSeries, tone: "packing" },
      { label: "입주청소 검색지수", points: moveInIndexSeries, tone: "moveIn" },
    ],
    rollingSparklines: [
      { label: "포장 롤링 30일", points: packingRollingSeries, tone: "packing" },
      { label: "입주청소 롤링 30일", points: moveInRollingSeries, tone: "moveIn" },
    ],
    alerts: buildAlerts({
      packingDod: bundle.packing.indexDodPercent,
      moveInDod: bundle.moveInClean.indexDodPercent,
      packingIndexSeries,
      moveInIndexSeries,
      packingRollingSeries,
      moveInRollingSeries,
    }),
    topDistricts,
    keywordLive: bundle.source.datalab === "live" || bundle.source.volume === "live",
  };
}

export function formatDailyRollingVolumePair(
  packing: number | null,
  moveIn: number | null,
  packingBelowTen: boolean,
  moveInBelowTen: boolean
): string {
  const p = packingBelowTen ? "<10" : packing != null ? formatSearchVolumeMonth(packing) : "—";
  const m = moveInBelowTen ? "<10" : moveIn != null ? formatSearchVolumeMonth(moveIn) : "—";
  return `${p} / ${m}`;
}

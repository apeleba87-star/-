import type { DemandSignal } from "@/lib/demand/types";
import type { DemandHeatBand } from "@/lib/demand/district-demand-score";

/** 표·근거 카드 공통 지표명 (열 순서와 동일) */
export const DEMAND_VOLUME_VS_INDEX_NOTE =
  "검색량 카드·30일 차트는 검색광고 최근 30일 롤링(건수), 1년 검색량은 월별 스냅샷입니다. 검색지수는 데이터랩 상대값·전일 대비 %로 별도 지표입니다.";

/** 검색량 30일 차트 — 지수 곡선 배분 안내 */
export const DEMAND_VOLUME_30D_INDEX_SHAPE_NOTE =
  "30일 검색량만 검색지수 곡선으로 일별 배분합니다. 월 합계는 콘솔 건수이며 지수 숫자와 같지 않습니다.";

export const DEMAND_VOLUME_30D_FLAT_NOTE =
  "30일 검색량 — 지수 데이터가 부족해 일별 균등 배분했습니다.";

export const DEMAND_VOLUME_1Y_SOURCE_NOTE =
  "1년 검색량은 콘솔 월별 스냅샷만 사용합니다(검색지수 미사용).";

export const DEMAND_SEARCH_METRICS_ABOUT = [
  "검색량은 네이버 검색광고 기준 건수(최근 30일·월별)입니다.",
  "검색지수는 데이터랩 상대 추이(전일 대비 %)이며 검색량과 별개입니다.",
  "구를 선택해도 검색은 전국 기준, 거래 건수만 해당 구 RTMS입니다.",
] as const;

export const DEMAND_TRADE_SECTION_LABEL = "거래";
export const DEMAND_SEARCH_SECTION_LABEL = "검색";
export const DEMAND_SEARCH_NATIONAL_BADGE = "검색=전국";
export const DEMAND_SEARCH_VOLUME_UNCOLLECTED = "미수집";
export const DEMAND_SEARCH_INDEX_CARD_SUB = "전일 대비";

export const DEMAND_DUMMY_DATA_BADGE = "더미";

export const DEMAND_METRIC_LABELS = {
  sale: "주택매매",
  jeonse: "전월세 거래",
  packingInterest: "포장이사 관십지수",
  packingVolume: "이사 관련 검색량",
  packingIndex: "이사 관련 검색지수",
  moveInVolume: "입주청소 관련 검색량",
  moveInIndex: "입주청소 관련 검색지수",
  /** @deprecated 열 분리 전 라벨 */
  packing: "이사 관련 검색량",
  moveInClean: "입주청소 관련 검색량",
  demandScore: "입주 예상 점수",
  /** @deprecated demandScore */
  composite: "입주 예상 점수",
} as const;

/** @deprecated DEMAND_METRIC_LABELS.packingVolume / moveInVolume 과 동일 */
export const DEMAND_BASKET_DISPLAY_LABELS = {
  packing: DEMAND_METRIC_LABELS.packingVolume,
  moveIn: DEMAND_METRIC_LABELS.moveInVolume,
} as const;

export const DEMAND_SCORE_CARD_SUB = "이번 달 입주 참고";

/** 사용자용 — 산식·가중치 미노출 */
export const DEMAND_SCORE_ABOUT =
  "지난달 확정된 해당 구 아파트 거래와 전국 이사·입주청소 검색 흐름을 함께 반영해, 이번 달 입주·청소 수요 참고 순위를 보여줍니다. 뜨거움·보통 등 라벨은 해당 지역 입주 예상 점수 그래프(최근 24개월)에서의 상대 위치입니다.";

/** @deprecated UI 미노출 — 내부 산식 문서용 */
export const DEMAND_SCORE_METHOD_NOTE =
  "신호월 RTMS·전국 검색을 정규화·결합(세부 가중치는 서비스 내부 기준).";

export const DEMAND_HAND_FREE_SUPPLEMENTARY_NOTE =
  "보조 — 앞 2달 손없는날 검색 MoM (이사 계획 선행 신호, 입주 예상 점수·전국 관심도에 미포함)";

export const DEMAND_NATIONAL_INTEREST_LABEL = "전국 이사 관심 지수";

export const DEMAND_NATIONAL_INTEREST_CURRENT_BADGE = "현재 기준";

/** 100 = 전월 대비 변화 없음을 뜻하는 기준선 */
export const DEMAND_NATIONAL_INTEREST_BASELINE = 100;

export function formatDemandYyyymmLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  return `${Number(y)}년 ${Number(m)}월`;
}

export function formatNationalInterestBaselineCaption(
  changePct: number,
  searchYyyymm: string | null
): string {
  const sign = changePct > 0 ? "+" : "";
  const vsBase = `기준 ${DEMAND_NATIONAL_INTEREST_BASELINE} 대비 ${sign}${changePct}`;
  if (searchYyyymm) {
    return `${vsBase} · 검색 ${formatDemandYyyymmLabel(searchYyyymm)} 확정`;
  }
  return `${vsBase} · 기준월 확인 중`;
}

/** 「입주 온도 안내」 펼침용 */
export const DEMAND_PACKING_INTEREST_CARD_SUB = "검색 규모·변화를 모은 참고 지표";

export const DEMAND_PACKING_INTEREST_ABOUT =
  "포장이사 관심지수는 해당 지역 포장이사 검색 규모와 변화를 함께 본 참고 점수입니다. 실제 검색 건수가 아니며, 입주 온도와 별도로 계산됩니다.";

export const DEMAND_COMPOSITE_CARD_SUB = DEMAND_SCORE_CARD_SUB;
export const DEMAND_COMPOSITE_ABOUT = DEMAND_SCORE_ABOUT;
export const DEMAND_COMPOSITE_METHOD_NOTE = DEMAND_SCORE_METHOD_NOTE;

/** @deprecated DEMAND_METRIC_LABELS 사용 */
export const DEMAND_NATIONAL_KEYWORD_LABELS = {
  packing: DEMAND_METRIC_LABELS.packing,
  moveInClean: DEMAND_METRIC_LABELS.moveInClean,
} as const;

export const DEMAND_DISCLAIMER =
  "국토부 RTMS·네이버 검색 데이터 기준 참고용입니다. 실제 입주·청소 건수를 보장하지 않으며, 검색·거래 기준월이 다를 수 있습니다.";

export const DEMAND_PHASE0_BADGE = "UI 미리보기 · 더미 데이터";

export const DEMAND_HUB_HERO = {
  title: "이번 달, 입주가 많은 지역을 찾아보세요",
  subtitle:
    "국토부 거래와 검색엔진의 신호로 각 지역 입주·이사 우선순위를 비교합니다.",
  regionHint: "시·도와 시·군·구를 선택해 비교할 지역을 추가하세요.",
} as const;

export const DEMAND_HUB_SEARCH_PLACEHOLDER = "구 이름 검색 (예: 강남, 강서, 양천)";

export const DEMAND_HUB_SEARCH_HINT =
  "구를 검색하면 비교 목록에 바로 추가됩니다. 최대 3곳까지 나란히 볼 수 있습니다.";

export const DEMAND_HUB_TOP_DISTRICTS_LABEL = "이번 달 수요 상위 구";

export const DEMAND_PULSE_CADENCE_MONTHLY = "월간";
export const DEMAND_PULSE_CADENCE_DAILY = "일간";

function formatRollingCollectedLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  if (!m || !d) return ymd;
  return `${Number(m)}/${Number(d)}`;
}

/** 검색량 카드 부제 — 범위·시점만 */
export function formatSearchVolumeCardSub(params: {
  isDistrict: boolean;
  displaySource?: "rolling_30d" | "monthly_archive";
  rollingSnapshotDate?: string | null;
  monthPeriodLabel: string | null;
  live: boolean;
}): string {
  if (!params.live) {
    return DEMAND_SEARCH_VOLUME_UNCOLLECTED;
  }
  if (params.displaySource === "rolling_30d" && params.rollingSnapshotDate) {
    const collected = formatRollingCollectedLabel(params.rollingSnapshotDate);
    const base = `최근 30일 · ${collected} 수집`;
    return params.isDistrict ? `전국 · ${base}` : base;
  }
  if (!params.monthPeriodLabel) {
    return DEMAND_SEARCH_VOLUME_UNCOLLECTED;
  }
  const month = formatChartMonthPeriodLabel(params.monthPeriodLabel);
  return params.isDistrict ? `전국 · ${month}` : month;
}

export const DEMAND_HEAT_BAND_LABELS: Record<
  DemandHeatBand,
  { label: string; emoji: string; className: string; description: string }
> = {
  very_hot: {
    label: "매우 뜨거움",
    emoji: "🔥",
    className: "bg-orange-50 text-orange-900 ring-orange-200/80",
    description: "이 지역 입주 예상 점수 그래프에서 최근 24개월 대비 매우 높은 구간입니다.",
  },
  hot: {
    label: "뜨거움",
    emoji: "🟠",
    className: "bg-amber-50 text-amber-900 ring-amber-200/80",
    description: "이 지역 그래프 기준 평소보다 높은 편입니다.",
  },
  rising: {
    label: "상승 중",
    emoji: "🟡",
    className: "bg-yellow-50 text-yellow-900 ring-yellow-200/80",
    description: "이 지역 그래프에서 중간 이상 구간입니다.",
  },
  normal: {
    label: "보통",
    emoji: "⚪",
    className: "bg-slate-50 text-slate-700 ring-slate-200/80",
    description: "이 지역 그래프에서 평균적인 수준입니다.",
  },
  weak: {
    label: "약세",
    emoji: "🔵",
    className: "bg-sky-50 text-sky-900 ring-sky-200/80",
    description: "이 지역 그래프에서 최근 대비 낮은 구간입니다.",
  },
};

/** @deprecated DEMAND_HEAT_BAND_LABELS */
export const OUTLOOK_LABELS = DEMAND_HEAT_BAND_LABELS as unknown as Record<
  string,
  { label: string; emoji: string; className: string; description: string }
>;

export const SIGNAL_LABELS: Record<
  DemandSignal,
  { label: string; emoji: string; className: string }
> = {
  strong: {
    label: "신호 강함",
    emoji: "🟢",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  },
  neutral: {
    label: "관망",
    emoji: "🟡",
    className: "bg-amber-50 text-amber-900 ring-amber-200/80",
  },
  weak: {
    label: "신호 약함",
    emoji: "🔴",
    className: "bg-rose-50 text-rose-800 ring-rose-200/80",
  },
};

export function formatMomPercent(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
}

/** 검색지수(전일·전월 대비) — 0에 가까우면 「변화 없음」 */
export function formatSearchIndexPercent(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  if (Math.abs(rounded) < 0.05) return "변화 없음";
  const sign = rounded > 0 ? "+" : "";
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${sign}${body}%`;
}

export function formatChartMonthPeriodLabel(period: string): string {
  const kr = period.match(/^(\d{4})년\s*(\d{1,2})월$/);
  if (kr) return period;
  const legacy = period.match(/^(\d{2})\.(\d{1,2})$/);
  if (legacy) return `${2000 + Number(legacy[1])}년 ${Number(legacy[2])}월`;
  return period;
}

/** YYYY-MM-DD → 「2026년 4월 15일」 */
export function ymdToChartDayPeriodLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;
}

/** 30일 차트 라벨 — legacy YY.M.D · ISO · 이미 한글 형식 */
export function formatChartDayPeriodLabel(period: string): string {
  const kr = period.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/);
  if (kr) return period;
  const iso = period.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return ymdToChartDayPeriodLabel(period);
  const legacy = period.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})$/);
  if (legacy) {
    return `${2000 + Number(legacy[1])}년 ${Number(legacy[2])}월 ${Number(legacy[3])}일`;
  }
  return period;
}

/** 선형 차트 축·툴팁용 */
export function formatChartMetricValue(
  value: number,
  kind: "trade" | "index" | "indexDelta" | "volume" | "demandScore" | "packingInterest"
): string {
  switch (kind) {
    case "trade":
      return `${Math.round(value).toLocaleString("ko-KR")}건`;
    case "volume":
      return value >= 10_000
        ? `${(value / 10_000).toFixed(1).replace(/\.0$/, "")}만`
        : value.toLocaleString("ko-KR");
    case "indexDelta":
      return formatSearchIndexPercent(value);
    case "index":
      return Math.round(value).toLocaleString("ko-KR");
    case "demandScore":
    case "packingInterest":
      return String(Math.round(value * 10) / 10);
  }
}

export function formatTradeCount(n: number): string {
  return `${n.toLocaleString("ko-KR")}건`;
}

/** 검색광고 API 월간 조회 추정치 */
export function formatSearchVolumeMonth(n: number): string {
  if (n >= 10_000) {
    const man = n / 10_000;
    return man >= 10 ? `${Math.round(man)}만` : `${man.toFixed(1).replace(/\.0$/, "")}만`;
  }
  return n.toLocaleString("ko-KR");
}

export function formatRankChange(prev: number, current: number): string {
  if (prev === current) return "순위 유지";
  const delta = prev - current;
  if (delta > 0) return `${prev}위 → ${current}위 (↑${delta})`;
  return `${prev}위 → ${current}위 (↓${Math.abs(delta)})`;
}

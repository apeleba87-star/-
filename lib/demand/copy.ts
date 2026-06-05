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
  "이사 관련 검색량 — 포장이사·이사업체 등 이사 Basket 키워드 최근 30일 롤링 합(건수, 매일 수집)입니다.",
  "이사 관련 검색지수 — 같은 키워드 묶음의 상대 추이(전일 대비 %, 데이터랩)입니다.",
  "입주청소 관련 검색량·검색지수 — 입주청소·입주청소업체 등 입주청소 Basket도 동일합니다.",
  DEMAND_VOLUME_30D_INDEX_SHAPE_NOTE,
  DEMAND_VOLUME_1Y_SOURCE_NOTE,
  "구 화면의 검색 수치는 전국 기준입니다. 지역수요점수의 거래 부분은 선택한 구 RTMS입니다.",
  DEMAND_VOLUME_VS_INDEX_NOTE,
] as const;

export const DEMAND_TRADE_SECTION_LABEL = "거래";
export const DEMAND_SEARCH_SECTION_LABEL = "검색";
export const DEMAND_SEARCH_NATIONAL_BADGE = "검색=전국";
export const DEMAND_SEARCH_VOLUME_UNCOLLECTED = "미수집";
export const DEMAND_SEARCH_INDEX_CARD_SUB = "전일 대비";

export const DEMAND_RTMS_HERO_NOTE =
  "점수는 이 구 거래 + 전국 이사 검색입니다.";

export const DEMAND_SCOPE_SIMPLE_HINT = "카드를 누르면 30일·1년 추이를 봅니다.";

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
  demandScore: "지역수요점수",
  /** @deprecated demandScore */
  composite: "지역수요점수",
} as const;

/** @deprecated DEMAND_METRIC_LABELS.packingVolume / moveInVolume 과 동일 */
export const DEMAND_BASKET_DISPLAY_LABELS = {
  packing: DEMAND_METRIC_LABELS.packingVolume,
  moveIn: DEMAND_METRIC_LABELS.moveInVolume,
} as const;

export const DEMAND_SCORE_CARD_SUB = "전국 관심 × 이 구 거래 참고";

export const DEMAND_SCORE_ABOUT =
  "전국 이사·입주청소 검색 변화(이사 관심)와 해당 구 전월세·매매 거래 변화를 곱한 참고 점수입니다. 구별 키워드 검색은 점수에 넣지 않고 DB에만 축적합니다. 손없는날 키워드는 지수에 넣지 않고 보조 참고로만 표시합니다. 정확한 입주 건수 예측이 아니라 이번 달 영업·광고 우선순위용입니다.";

export const DEMAND_SCORE_METHOD_NOTE =
  "전국 관심도 = 100 + (포장 Basket MoM×4/7 + 입주 Basket MoM×3/7). 손없는날(앞 2달 키워드)은 보조 지표로만 표시·지수 미반영. 구 RTMS 지수 = 100 + (전월세 MoM×70% + 매매 MoM×30%). 최종 = (관심도 × RTMS) ÷ 100.";

export const DEMAND_HAND_FREE_SUPPLEMENTARY_NOTE =
  "보조 — 앞 2달 손없는날 검색 MoM (이사 계획 선행 신호, 지역수요점수·전국 관심도에 미포함)";

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
  "국토부 RTMS·네이버 검색광고·DataLab 기준입니다. 지역수요점수는 전국 이사 관심×구 RTMS 참고값이며 영업 우선순위용입니다(건수 예측 아님). 검색·RTMS 기준월이 다를 수 있습니다.";

export const DEMAND_PHASE0_BADGE = "UI 미리보기 · 더미 데이터";

export const DEMAND_HUB_HERO = {
  title: "이번 달, 어디 구에 입주청소 영업을 집중할까?",
  subtitle: "전국 이사 관련 검색 × 구 RTMS로 지역수요점수를 비교합니다.",
  regionHint: "비교할 지역을 추가하거나 아래 서울 순위를 확인하세요.",
} as const;

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
    description: "전국 시장과 구 거래 신호가 함께 강합니다.",
  },
  hot: {
    label: "뜨거움",
    emoji: "🟠",
    className: "bg-amber-50 text-amber-900 ring-amber-200/80",
    description: "이번 달 영업·광고 우선 검토 구간입니다.",
  },
  rising: {
    label: "상승 중",
    emoji: "🟡",
    className: "bg-yellow-50 text-yellow-900 ring-yellow-200/80",
    description: "평균보다 다소 강한 신호입니다.",
  },
  normal: {
    label: "보통",
    emoji: "⚪",
    className: "bg-slate-50 text-slate-700 ring-slate-200/80",
    description: "특별히 강하지 않습니다. 표·차트를 함께 보세요.",
  },
  weak: {
    label: "약세",
    emoji: "🔵",
    className: "bg-sky-50 text-sky-900 ring-sky-200/80",
    description: "전국 대비 상대적으로 약합니다.",
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

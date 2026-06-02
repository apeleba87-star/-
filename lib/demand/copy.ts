import type { DemandSignal } from "@/lib/demand/types";

/** 표·근거 카드 공통 지표명 (열 순서와 동일) */
export const DEMAND_METRIC_LABELS = {
  sale: "주택매매 지수",
  jeonse: "전월세 거래지수",
  packingVolume: "포장이사 검색량",
  packingIndex: "포장이사 검색지수",
  moveInVolume: "입주청소 검색량",
  moveInIndex: "입주청소 검색지수",
  /** @deprecated 열 분리 전 라벨 */
  packing: "포장이사 검색량",
  moveInClean: "입주청소 검색량",
  composite: "입주 온도",
} as const;

/** 종합 지표 카드 부가 설명 */
export const DEMAND_COMPOSITE_CARD_SUB = "거래·검색 신호 종합 (더미)";

/** @deprecated DEMAND_METRIC_LABELS 사용 */
export const DEMAND_NATIONAL_KEYWORD_LABELS = {
  packing: DEMAND_METRIC_LABELS.packing,
  moveInClean: DEMAND_METRIC_LABELS.moveInClean,
} as const;

export const DEMAND_DISCLAIMER =
  "국토부 실거래·네이버 데이터랩 검색지수(전국·상대값) 기준입니다. 검색지수는 실제 검색 건수가 아닙니다. 신고·집계 지연(통상 1~2개월)이 있을 수 있습니다. 참고용입니다.";

export const DEMAND_PHASE0_BADGE = "UI 미리보기 · 더미 데이터";

export const DEMAND_HUB_HERO = {
  title: "입주수요는 어디서 시작될까?",
  subtitle: "실거래·검색 데이터로 지역별 입주 흐름을 비교합니다.",
  regionHint: "비교할 지역을 추가해 보세요.",
} as const;

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

/** 검색지수(전일·전월 대비) — 소수 첫째 자리, 예: +1.2% */
export function formatSearchIndexPercent(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${sign}${body}%`;
}

/** 선형 차트 축·툴팁용 */
export function formatChartMetricValue(
  value: number,
  kind: "trade" | "index" | "indexDelta" | "volume" | "composite"
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
    case "composite":
      return String(Math.round(value));
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

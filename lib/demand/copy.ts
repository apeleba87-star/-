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
  composite: "입주수요지수",
} as const;

/** @deprecated DEMAND_METRIC_LABELS 사용 */
export const DEMAND_NATIONAL_KEYWORD_LABELS = {
  packing: DEMAND_METRIC_LABELS.packing,
  moveInClean: DEMAND_METRIC_LABELS.moveInClean,
} as const;

export const DEMAND_DISCLAIMER =
  "국토부 실거래·네이버 데이터랩 검색지수(전국·상대값) 기준입니다. 검색지수는 실제 검색 건수가 아닙니다. 신고·집계 지연(통상 1~2개월)이 있을 수 있습니다. 참고용입니다.";

export const DEMAND_PHASE0_BADGE = "UI 미리보기 · 더미 데이터";

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

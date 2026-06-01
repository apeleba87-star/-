import type { DemandSignal } from "@/lib/demand/types";

/** 네이버 데이터랩 — 전국 키워드 상대 지수 (실제 검색 건수 아님) */
export const DEMAND_NATIONAL_KEYWORD_LABELS = {
  packing: "포장이사 검색지수",
  moveInClean: "입주청소 검색지수",
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

export function formatRankChange(prev: number, current: number): string {
  if (prev === current) return "순위 유지";
  const delta = prev - current;
  if (delta > 0) return `${prev}위 → ${current}위 (↑${delta})`;
  return `${prev}위 → ${current}위 (↓${Math.abs(delta)})`;
}

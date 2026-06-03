/**
 * 입주수요 허브 — 포장이사 검색량·검색지수 원본 카드/열 (개발·검증용).
 * 운영 공개 전 `NEXT_PUBLIC_DEMAND_SHOW_PACKING_SEARCH_BREAKDOWN=0` 또는 미설정+production.
 */
export function demandShowPackingSearchBreakdown(): boolean {
  const raw = process.env.NEXT_PUBLIC_DEMAND_SHOW_PACKING_SEARCH_BREAKDOWN?.trim();
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return process.env.NODE_ENV !== "production";
}

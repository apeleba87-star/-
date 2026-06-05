/**
 * 구별 키워드 검색광고 월별 — DB 축적 전용.
 * 허브·점수에는 구별 행을 쓰지 않음. 화면 Basket은 전국(또는 시) fallback.
 * 지역수요점수 = 전국 이사 관심 × 구 RTMS.
 */
export const DEMAND_DISTRICT_SEARCH_USED_IN_HUB = false;

export function demandDistrictSearchExcludedFromHub(scope: "national" | "city" | "district"): boolean {
  return scope === "district" && !DEMAND_DISTRICT_SEARCH_USED_IN_HUB;
}

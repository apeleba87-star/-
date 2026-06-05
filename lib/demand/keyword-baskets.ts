import type { DemandKeywordKey } from "@/lib/demand/keyword-keys";

/** Basket MVP — 검색광고 월별 스냅샷 대상 (띄어쓰기 없음) */
export const DEMAND_PACKING_BASKET_PHRASES = [
  "포장이사",
  "이사업체",
  "포장이사견적",
  "이삿집센터",
] as const;

export const DEMAND_MOVE_IN_BASKET_PHRASES = [
  "입주청소",
  "입주청소업체",
  "이사청소",
  "입주청소비용",
] as const;

/** 계획·선행 — 1~12월 손없는날 키워드 12개 합산 (전국) */
export const DEMAND_HAND_FREE_BASKET_PHRASES = [
  "1월손없는날",
  "2월손없는날",
  "3월손없는날",
  "4월손없는날",
  "5월손없는날",
  "6월손없는날",
  "7월손없는날",
  "8월손없는날",
  "9월손없는날",
  "10월손없는날",
  "11월손없는날",
  "12월손없는날",
] as const;

export type DemandBasketId = "packing" | "move_in" | "hand_free";

export const DEMAND_BASKET_PHRASES: Record<DemandBasketId, readonly string[]> = {
  packing: DEMAND_PACKING_BASKET_PHRASES,
  move_in: DEMAND_MOVE_IN_BASKET_PHRASES,
  hand_free: DEMAND_HAND_FREE_BASKET_PHRASES,
};

/** 1월손없는날 … 12월손없는날 (띄어쓰기 없음) */
export function isHandFreeMonthPhrase(phrase: string): boolean {
  const compact = phrase.trim().replace(/\s+/g, "");
  return /^([1-9]|1[0-2])월손없는날$/.test(compact);
}

export function demandBasketKeywordKey(basketId: DemandBasketId): DemandKeywordKey {
  if (basketId === "packing") return "packing";
  /** move_in · hand_free — DB keyword_key; hand_free는 phrase로 Basket 분리 */
  return "move_in_clean";
}

export function demandPhraseBasketId(phrase: string): DemandBasketId | null {
  const compact = phrase.trim().replace(/\s+/g, "");
  if ((DEMAND_PACKING_BASKET_PHRASES as readonly string[]).includes(compact)) return "packing";
  if ((DEMAND_MOVE_IN_BASKET_PHRASES as readonly string[]).includes(compact)) return "move_in";
  if (
    (DEMAND_HAND_FREE_BASKET_PHRASES as readonly string[]).includes(compact) ||
    isHandFreeMonthPhrase(compact)
  ) {
    return "hand_free";
  }
  return null;
}

/** 검색광고 ingest — 전국 Basket phrase 목록 */
export function listNationalBasketIngestPhrases(): Array<{
  basketId: DemandBasketId;
  keywordKey: DemandKeywordKey;
  phrase: string;
}> {
  const out: Array<{ basketId: DemandBasketId; keywordKey: DemandKeywordKey; phrase: string }> = [];
  for (const basketId of ["packing", "move_in", "hand_free"] as const) {
    for (const phrase of DEMAND_BASKET_PHRASES[basketId]) {
      out.push({
        basketId,
        keywordKey: demandBasketKeywordKey(basketId),
        phrase,
      });
    }
  }
  return out;
}

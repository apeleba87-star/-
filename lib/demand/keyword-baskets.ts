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

export type DemandBasketId = "packing" | "move_in";

export const DEMAND_BASKET_PHRASES: Record<DemandBasketId, readonly string[]> = {
  packing: DEMAND_PACKING_BASKET_PHRASES,
  move_in: DEMAND_MOVE_IN_BASKET_PHRASES,
};

export function demandBasketKeywordKey(basketId: DemandBasketId): DemandKeywordKey {
  return basketId === "packing" ? "packing" : "move_in_clean";
}

export function demandPhraseBasketId(phrase: string): DemandBasketId | null {
  const compact = phrase.trim().replace(/\s+/g, "");
  if ((DEMAND_PACKING_BASKET_PHRASES as readonly string[]).includes(compact)) return "packing";
  if ((DEMAND_MOVE_IN_BASKET_PHRASES as readonly string[]).includes(compact)) return "move_in";
  return null;
}

/** 검색광고 ingest — 전국 Basket phrase 목록 */
export function listNationalBasketIngestPhrases(): Array<{
  basketId: DemandBasketId;
  keywordKey: DemandKeywordKey;
  phrase: string;
}> {
  const out: Array<{ basketId: DemandBasketId; keywordKey: DemandKeywordKey; phrase: string }> = [];
  for (const basketId of ["packing", "move_in"] as const) {
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

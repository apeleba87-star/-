/** 매매(양도·양수) 정형 필드 상수·라벨 */

export const MAGAM_TRADE_SIDES = ["sell", "buy"] as const;
export type MagamTradeSide = (typeof MAGAM_TRADE_SIDES)[number];

export const MAGAM_TRADE_SIDE_LABEL: Record<MagamTradeSide, string> = {
  sell: "양도(팝니다)",
  buy: "양수(삽니다)",
};

export function formatMagamTradeTotalRevenue(won: number | null | undefined): string | null {
  if (won == null || won <= 0) return null;
  const man = Math.floor(won / 10_000);
  return `총매출 ${man.toLocaleString("ko-KR")}만`;
}

export function formatMagamTradeClientCount(count: number | null | undefined): string | null {
  if (count == null || count <= 0) return null;
  return `거래처 ${count}곳`;
}

export function formatMagamTradeSalePrice(
  won: number | null | undefined,
  negotiable?: boolean | null
): string | null {
  if (negotiable) return "협의";
  if (won == null || won <= 0) return null;
  const man = Math.floor(won / 10_000);
  return `희망판매 ${man.toLocaleString("ko-KR")}만`;
}

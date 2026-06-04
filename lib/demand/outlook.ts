import type { DemandChartPoint } from "@/lib/demand/scope-data";
import { basketMomPercent, isBelowRecentAverage } from "@/lib/demand/basket-aggregate";

export type DemandOutlook = "rising" | "watch" | "neutral" | "low";

export type DemandTrend = "up" | "down" | "flat";

export type DemandOutlookResult = {
  outlook: DemandOutlook;
  label: string;
  reasons: string[];
  signals: {
    moveIn: DemandTrend;
    rtms: DemandTrend;
    packing: DemandTrend;
  };
  /** 구별일 때 검색 Basket이 전국 proxy인지 */
  searchProxyNational?: boolean;
};

const OUTLOOK_LABELS: Record<DemandOutlook, string> = {
  rising: "수요 상승",
  watch: "잠재 후보",
  neutral: "관망",
  low: "우선 낮음",
};

export function trendFromMom(mom: number | null, threshold = 0): DemandTrend {
  if (mom == null || !Number.isFinite(mom)) return "flat";
  if (mom > threshold) return "up";
  if (mom < -threshold) return "down";
  return "flat";
}

function rtmsTrend(saleMom: number, jeonseMom: number): DemandTrend {
  const sale = trendFromMom(saleMom, 0);
  const jeon = trendFromMom(jeonseMom, 0);
  if (sale === "up" && jeon === "up") return "up";
  if (sale === "down" && jeon === "down") return "down";
  if (sale === "up" || jeon === "up") return "up";
  if (sale === "down" || jeon === "down") return "down";
  return "flat";
}

function rtmsStrongUp(saleMom: number, jeonseMom: number): boolean {
  return (
    (saleMom > 5 && jeonseMom > 5) ||
    saleMom > 15 ||
    jeonseMom > 15
  );
}

export type ComputeDemandOutlookInput = {
  saleMom: number;
  jeonseMom: number;
  packingBasketMom: number | null;
  moveInBasketMom: number | null;
  moveInBasketSeries?: DemandChartPoint[];
  /** 구 선택 시 전국 Basket MoM을 쓰는 경우 */
  searchProxyNational?: boolean;
};

/**
 * RTMS + Basket 교차확인 — 입주·청소 수요 「가능성」 4단계 (예측 아님).
 */
export function computeDemandOutlook(input: ComputeDemandOutlookInput): DemandOutlookResult {
  const moveIn = trendFromMom(input.moveInBasketMom, 0);
  const packing = trendFromMom(input.packingBasketMom, 0);
  const rtms = rtmsTrend(input.saleMom, input.jeonseMom);

  const moveInLow =
    moveIn === "down" ||
    (input.moveInBasketSeries?.length
      ? isBelowRecentAverage(input.moveInBasketSeries)
      : false);

  const proxyNote = input.searchProxyNational ? " (검색: 전국 Basket)" : "";
  const reasons: string[] = [];

  let outlook: DemandOutlook = "neutral";

  // D: 포장만 ↑, RTMS↓, 입주↓
  if (packing === "up" && rtms === "down" && (moveIn === "down" || moveInLow)) {
    outlook = "low";
    reasons.push("포장이사 Basket ↑, 거래·입주청소는 약함");
  }
  // A: 입주 ↑ + (RTMS↑ or 포장↑)
  else if (moveIn === "up" && (rtms === "up" || packing === "up")) {
    outlook = "rising";
    if (moveIn === "up") reasons.push("입주청소 Basket ↑");
    if (rtms === "up") reasons.push("매매·전월세 거래 ↑");
    if (packing === "up") reasons.push("포장이사 Basket ↑");
  }
  // B: RTMS·포장 ↑, 입주 아직 약함
  else if (
    rtmsStrongUp(input.saleMom, input.jeonseMom) &&
    packing === "up" &&
    (moveIn === "down" || moveIn === "flat" || moveInLow)
  ) {
    outlook = "watch";
    reasons.push("거래·포장이사 관심 ↑, 입주청소 Basket은 아직 약함");
  }
  // C: 혼재
  else {
    outlook = "neutral";
    if (rtms === "up") reasons.push("거래 일부 ↑");
    if (packing === "up") reasons.push("포장이사 Basket ↑");
    if (moveIn === "up") reasons.push("입주청소 Basket ↑");
    if (reasons.length === 0) reasons.push("신호가 뚜렷하지 않음");
  }

  if (input.searchProxyNational && outlook !== "neutral") {
    reasons.push(`검색 신호는 전국 Basket 기준${proxyNote.replace(" (검색: 전국 Basket)", "")}`);
  }

  return {
    outlook,
    label: OUTLOOK_LABELS[outlook],
    reasons,
    signals: { moveIn, rtms, packing },
    searchProxyNational: input.searchProxyNational,
  };
}

export function outlookFromScopeSignals(params: {
  saleMom: number;
  jeonseMom: number;
  packingVolumeMonthly?: DemandChartPoint[];
  moveInVolumeMonthly?: DemandChartPoint[];
  packingIndexMom?: number;
  moveInIndexMom?: number;
  searchProxyNational?: boolean;
}): DemandOutlookResult {
  const packingBasketMom =
    basketMomPercent(params.packingVolumeMonthly ?? []) ?? params.packingIndexMom ?? null;
  const moveInBasketMom =
    basketMomPercent(params.moveInVolumeMonthly ?? []) ?? params.moveInIndexMom ?? null;

  return computeDemandOutlook({
    saleMom: params.saleMom,
    jeonseMom: params.jeonseMom,
    packingBasketMom,
    moveInBasketMom,
    moveInBasketSeries: params.moveInVolumeMonthly,
    searchProxyNational: params.searchProxyNational,
  });
}

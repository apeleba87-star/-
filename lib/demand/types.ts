export type { DemandOutlook, DemandOutlookResult } from "@/lib/demand/outlook";

export type DemandSignal = "strong" | "neutral" | "weak";

export type DemandScope = "national" | "district";

export type DemandDriverKey =
  | "packing_search"
  | "move_in_clean_search"
  | "jeonse_wolse_trade"
  | "sale_trade";

export type DemandDriver = {
  key: DemandDriverKey;
  label: string;
  scope: DemandScope;
  momPercent: number;
  /** 구별 RTMS — 해당 월 아파트 실거래 신고 건수 */
  monthCount?: number;
  drilldown: {
    summary: string;
    detail: string;
    chartHint?: string;
  };
};

export type DemandDistrictScore = {
  gu: string;
  slug: string;
  indexScore: number;
  signal: DemandSignal;
  rank: number;
  prevRank: number;
  rankDelta: number;
  drivers: DemandDriver[];
  drilldownExtra: {
    jeonseRankAmong25?: number;
    jeonsePrevRank?: number;
    similarGu: string[];
    neighborRanks: { gu: string; slug: string; rank: number }[];
    insightLine: string;
    referenceLine: string;
    tenderCount: number;
  };
};

export type DemandHit = {
  id: string;
  leadPeriod: string;
  leadLabel: string;
  leadMomPercent: number;
  lagPeriod: string;
  lagLabel: string;
  lagMomPercent: number;
  scope: DemandScope;
  gu?: string;
  hit: boolean;
};

export type DemandSnapshotMeta = {
  baseMonthLabel: string;
  baseMonthYmd: string;
  publishedAtLabel: string;
  nationalKeywords: {
    packingMom: number;
    moveInCleanMom: number;
  };
};

import { DEMAND_METRIC_LABELS } from "@/lib/demand/copy";
import { guNameToSlug } from "@/lib/demand/slugs";
import type { DemandDistrictScore, DemandDriver, DemandHit, DemandSnapshotMeta } from "@/lib/demand/types";

export const DEMAND_SNAPSHOT_META: DemandSnapshotMeta = {
  baseMonthLabel: "2025년 4월",
  baseMonthYmd: "2025-04",
  publishedAtLabel: "2025년 5월 12일 갱신",
  nationalKeywords: {
    packingMom: 27,
    moveInCleanMom: 11,
  },
};

function tradeCountsForGu(gu: string): { jeonse: number; sale: number } {
  const slug = guNameToSlug(gu) ?? gu;
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < slug.length; i += 1) {
    h1 = (Math.imul(h1, 31) + slug.charCodeAt(i)) | 0;
    h2 = (Math.imul(h2, 37) + slug.charCodeAt(i)) | 0;
  }
  return {
    jeonse: 180 + (Math.abs(h1) % 320),
    sale: 70 + (Math.abs(h2) % 200),
  };
}

function driversForGu(
  gu: string,
  jeonse: number,
  sale: number,
  packing = DEMAND_SNAPSHOT_META.nationalKeywords.packingMom,
  moveIn = DEMAND_SNAPSHOT_META.nationalKeywords.moveInCleanMom
): DemandDriver[] {
  const counts = tradeCountsForGu(gu);
  return [
    {
      key: "sale_trade",
      label: DEMAND_METRIC_LABELS.sale,
      scope: "district",
      momPercent: sale,
      monthCount: counts.sale,
      drilldown: {
        summary: `${gu} 주택매매 ${counts.sale}건 · 전월 대비 ${sale > 0 ? "증가" : "감소"}`,
        detail: "국토부 아파트 매매 실거래 신고 건수(월별) 기준입니다.",
        chartHint: `${gu} · 월별 건수 (더미)`,
      },
    },
    {
      key: "jeonse_wolse_trade",
      label: DEMAND_METRIC_LABELS.jeonse,
      scope: "district",
      momPercent: jeonse,
      monthCount: counts.jeonse,
      drilldown: {
        summary: `${gu} 전월세 ${counts.jeonse}건 · 전월 대비 ${jeonse > 0 ? "증가" : "감소"}`,
        detail: "국토부 아파트 전월세 실거래 신고 건수(월별) 기준입니다.",
        chartHint: `${gu} · 월별 건수 (더미)`,
      },
    },
    {
      key: "packing_search",
      label: DEMAND_METRIC_LABELS.packing,
      scope: "national",
      momPercent: packing,
      drilldown: {
        summary: `포장이사 지수(검색량)가 전월 대비 ${packing > 0 ? "높아" : "낮아"}지는 흐름입니다.`,
        detail:
          "네이버 데이터랩 통합검색 상대 지수(%)입니다. 구별 검색지수는 API로 제공되지 않아 동일 값을 표시합니다.",
        chartHint: "최근 6개월 추이 (더미)",
      },
    },
    {
      key: "move_in_clean_search",
      label: DEMAND_METRIC_LABELS.moveInClean,
      scope: "national",
      momPercent: moveIn,
      drilldown: {
        summary: `입주청소 지수(검색량)는 전월 대비 ${moveIn > 0 ? "상승" : "하락"} 중입니다.`,
        detail:
          "과거 패턴상 포장이사 지수가 1~2개월 선행하는 경우가 있어, 거래 지수와 함께 보는 것을 권장합니다. (가설·검증 중)",
        chartHint: "최근 6개월 추이 (더미)",
      },
    },
  ];
}

const TOP_ROWS: Omit<DemandDistrictScore, "slug">[] = [
  {
    gu: "강서구",
    indexScore: 132,
    signal: "strong",
    rank: 1,
    prevRank: 5,
    rankDelta: 4,
    drivers: driversForGu("강서구", 23, 18, 27, 11),
    drilldownExtra: {
      jeonseRankAmong25: 4,
      jeonsePrevRank: 8,
      similarGu: ["양천구", "마포구", "영등포구"],
      neighborRanks: [
        { gu: "양천구", slug: "yangcheon-gu", rank: 2 },
        { gu: "마포구", slug: "mapo-gu", rank: 3 },
      ],
      insightLine:
        "전월세·매매가 함께 늘고 전국 포장이사 검색지수도 오른 달입니다. 입주·청소 영업 타이밍으로 볼 수 있습니다.",
      referenceLine: "이번 달 데이터만 보면 강서·양천 쪽 신호가 가장 큽니다. (참고용)",
      tenderCount: 3,
    },
  },
  {
    gu: "양천구",
    indexScore: 118,
    signal: "strong",
    rank: 2,
    prevRank: 3,
    rankDelta: 1,
    drivers: driversForGu("양천구", 12, 8, 19, 9),
    drilldownExtra: {
      jeonseRankAmong25: 7,
      similarGu: ["강서구", "마포구", "영등포구"],
      neighborRanks: [
        { gu: "강서구", slug: "gangseo-gu", rank: 1 },
        { gu: "마포구", slug: "mapo-gu", rank: 3 },
      ],
      insightLine: "거래 증가는 강서보다 완만하지만 순위는 상위권을 유지합니다.",
      referenceLine: "강서·양천을 함께 비교해 보세요. (참고용)",
      tenderCount: 2,
    },
  },
  {
    gu: "마포구",
    indexScore: 105,
    signal: "strong",
    rank: 3,
    prevRank: 4,
    rankDelta: 1,
    drivers: driversForGu("마포구", 8, 5, 15, 7),
    drilldownExtra: {
      similarGu: ["강서구", "양천구", "서대문구"],
      neighborRanks: [
        { gu: "양천구", slug: "yangcheon-gu", rank: 2 },
        { gu: "송파구", slug: "songpa-gu", rank: 4 },
      ],
      insightLine: "전국 검색 신호는 강하지만 구별 거래 증가는 중간 수준입니다.",
      referenceLine: "마포·강서 비교 시 거래 지표 차이를 확인하세요.",
      tenderCount: 4,
    },
  },
  {
    gu: "송파구",
    indexScore: 102,
    signal: "neutral",
    rank: 4,
    prevRank: 2,
    rankDelta: -2,
    drivers: driversForGu("송파구", 6, 4, 14, 6),
    drilldownExtra: {
      similarGu: ["강동구", "서초구", "마포구"],
      neighborRanks: [
        { gu: "마포구", slug: "mapo-gu", rank: 3 },
        { gu: "영등포구", slug: "yeongdeungpo-gu", rank: 5 },
      ],
      insightLine: "순위는 소폭 하락했으나 절대 지수는 양호한 편입니다.",
      referenceLine: "송파·강동을 비교해 보세요.",
      tenderCount: 5,
    },
  },
  {
    gu: "영등포구",
    indexScore: 98,
    signal: "neutral",
    rank: 5,
    prevRank: 6,
    rankDelta: 1,
    drivers: driversForGu("영등포구", 10, 6, 16, 8),
    drilldownExtra: {
      similarGu: ["강서구", "양천구", "구로구"],
      neighborRanks: [
        { gu: "송파구", slug: "songpa-gu", rank: 4 },
        { gu: "관악구", slug: "gwanak-gu", rank: 6 },
      ],
      insightLine: "전월세 증가가 눈에 띄는 편입니다.",
      referenceLine: "영등포·강서 비교를 추천합니다.",
      tenderCount: 2,
    },
  },
  {
    gu: "관악구",
    indexScore: 95,
    signal: "neutral",
    rank: 6,
    prevRank: 9,
    rankDelta: 3,
    drivers: driversForGu("관악구", 14, 7, 22, 10),
    drilldownExtra: {
      similarGu: ["동작구", "영등포구", "구로구"],
      neighborRanks: [
        { gu: "영등포구", slug: "yeongdeungpo-gu", rank: 5 },
        { gu: "은평구", slug: "eunpyeong-gu", rank: 7 },
      ],
      insightLine: "급상승 구 중 하나로 거래 지표가 크게 움직였습니다.",
      referenceLine: "관악·은평 급상승 흐름을 함께 보세요.",
      tenderCount: 1,
    },
  },
  {
    gu: "은평구",
    indexScore: 93,
    signal: "neutral",
    rank: 7,
    prevRank: 10,
    rankDelta: 3,
    drivers: driversForGu("은평구", 11, 5, 17, 6),
    drilldownExtra: {
      similarGu: ["서대문구", "마포구", "관악구"],
      neighborRanks: [
        { gu: "관악구", slug: "gwanak-gu", rank: 6 },
        { gu: "노원구", slug: "nowon-gu", rank: 8 },
      ],
      insightLine: "순위가 빠르게 올랐습니다.",
      referenceLine: "은평·관악 비교를 추천합니다.",
      tenderCount: 0,
    },
  },
  {
    gu: "노원구",
    indexScore: 90,
    signal: "neutral",
    rank: 8,
    prevRank: 7,
    rankDelta: -1,
    drivers: driversForGu("노원구", 5, 3, 8, 4),
    drilldownExtra: {
      similarGu: ["도봉구", "강북구", "은평구"],
      neighborRanks: [
        { gu: "은평구", slug: "eunpyeong-gu", rank: 7 },
        { gu: "강북구", slug: "gangbuk-gu", rank: 9 },
      ],
      insightLine: "변화 폭은 크지 않습니다.",
      referenceLine: "상위권 구와 비교 시 차이가 분명합니다.",
      tenderCount: 2,
    },
  },
  {
    gu: "강북구",
    indexScore: 88,
    signal: "neutral",
    rank: 9,
    prevRank: 11,
    rankDelta: 2,
    drivers: driversForGu("강북구", 7, 4, 10, 5),
    drilldownExtra: {
      similarGu: ["노원구", "도봉구", "성북구"],
      neighborRanks: [
        { gu: "노원구", slug: "nowon-gu", rank: 8 },
        { gu: "성북구", slug: "seongbuk-gu", rank: 10 },
      ],
      insightLine: "소폭 개선 흐름입니다.",
      referenceLine: "",
      tenderCount: 1,
    },
  },
  {
    gu: "성북구",
    indexScore: 86,
    signal: "weak",
    rank: 10,
    prevRank: 8,
    rankDelta: -2,
    drivers: driversForGu("성북구", 3, 2, 6, 3),
    drilldownExtra: {
      similarGu: ["강북구", "동대문구", "종로구"],
      neighborRanks: [
        { gu: "강북구", slug: "gangbuk-gu", rank: 9 },
        { gu: "강남구", slug: "gangnam-gu", rank: 11 },
      ],
      insightLine: "거래 증가는 완만한 편입니다.",
      referenceLine: "",
      tenderCount: 1,
    },
  },
];

function withSlug(row: Omit<DemandDistrictScore, "slug">): DemandDistrictScore {
  const slug = guNameToSlug(row.gu);
  if (!slug) throw new Error(`missing slug for ${row.gu}`);
  return { ...row, slug };
}

export const DEMAND_TOP10: DemandDistrictScore[] = TOP_ROWS.map(withSlug);

export const DEMAND_MOVERS = [...DEMAND_TOP10]
  .filter((d) => d.rankDelta > 0)
  .sort((a, b) => b.rankDelta - a.rankDelta)
  .slice(0, 10);

export const DEMAND_DISTRICT_BY_SLUG: Record<string, DemandDistrictScore> = Object.fromEntries(
  DEMAND_TOP10.map((d) => [d.slug, d])
);

export function getDemandDistrictBySlug(slug: string): DemandDistrictScore | undefined {
  return DEMAND_DISTRICT_BY_SLUG[slug];
}

export function getDemandDistrictByGu(gu: string): DemandDistrictScore | undefined {
  const slug = guNameToSlug(gu);
  return slug ? DEMAND_DISTRICT_BY_SLUG[slug] : undefined;
}

export const DEMAND_HITS: DemandHit[] = [
  {
    id: "hit-1",
    leadPeriod: "2025년 12월",
    leadLabel: DEMAND_METRIC_LABELS.packing,
    leadMomPercent: 35,
    lagPeriod: "2026년 1월",
    lagLabel: DEMAND_METRIC_LABELS.moveInClean,
    lagMomPercent: 28,
    scope: "national",
    hit: true,
  },
  {
    id: "hit-2",
    leadPeriod: "2025년 8월",
    leadLabel: "강서구 전월세 거래량",
    leadMomPercent: 18,
    lagPeriod: "2025년 9월",
    lagLabel: DEMAND_METRIC_LABELS.moveInClean,
    lagMomPercent: 15,
    scope: "district",
    gu: "강서구",
    hit: true,
  },
  {
    id: "hit-3",
    leadPeriod: "2024년 7~9월",
    leadLabel: "강서구 포장이사 검색지수 (관찰)",
    leadMomPercent: 22,
    lagPeriod: "2024년 8~10월",
    lagLabel: "입주청소 검색지수 (관찰)",
    lagMomPercent: 19,
    scope: "district",
    gu: "강서구",
    hit: true,
  },
];

export const DEMAND_DEFAULT_COMPARE_SLUGS = ["gangseo-gu", "yangcheon-gu", "mapo-gu"] as const;

export function resolveCompareDistricts(slugs: string[]): DemandDistrictScore[] {
  const seen = new Set<string>();
  const out: DemandDistrictScore[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    const d = DEMAND_DISTRICT_BY_SLUG[slug];
    if (d) {
      seen.add(slug);
      out.push(d);
    }
    if (out.length >= 4) break;
  }
  if (out.length === 0) {
    return DEMAND_DEFAULT_COMPARE_SLUGS.map((s) => DEMAND_DISTRICT_BY_SLUG[s]!).filter(Boolean);
  }
  return out;
}

export const CHANNEL_HINTS = [
  { channel: "전단지", stars: 5 },
  { channel: "당근광고", stars: 5 },
  { channel: "블로그·검색광고", stars: 4 },
  { channel: "문자영업", stars: 2 },
] as const;

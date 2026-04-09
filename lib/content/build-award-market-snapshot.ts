import { REPORT_TYPE_AWARD_MARKET_INTEL, type ReportContentBlock } from "./report-snapshot-types";

type AwardRow = {
  tender_id?: string | null;
  bid_ntce_nm?: string | null;
  openg_dt?: string | null;
  bid_rate_pct: number | null;
  prtcpt_cnum: number | null;
  sucsfbid_amt: number | null;
  presmpt_prce: number | null;
  rate_band: string | null;
  industry_code?: string | null;
  industry_name?: string | null;
  region_sido?: string | null;
  agency_name?: string | null;
  base_amt?: number | null;
};

export type AwardMarketSnapshot = {
  report_type: typeof REPORT_TYPE_AWARD_MARKET_INTEL;
  period_key: string;
  title: string;
  content_full: ReportContentBlock;
  content_summary: ReportContentBlock;
  content_social: string;
  sample_count: number;
};

type AwardRecommendation = {
  cluster_start: number;
  cluster_end: number;
  cluster_count: number;
  p10: number;
  p25: number;
  p50: number;
  safe_rate: number;
  normal_rate: number;
  aggressive_rate: number;
  confidence_level: "높음" | "보통" | "낮음";
};

type AwardReportContent = ReportContentBlock & {
  recommendation?: AwardRecommendation;
  industry_comparison?: {
    industry_name: string;
    award_count: number;
    avg_award_amt: number | null;
    avg_rate: number | null;
    avg_participants: number | null;
    top_region: string;
  }[];
  region_distribution?: {
    region: string;
    award_count: number;
    share_pct: number;
    avg_award_amt: number | null;
  }[];
  top_awards?: {
    rank: number;
    tender_id?: string | null;
    bid_ntce_nm: string;
    region: string;
    agency_name: string;
    industry_name: string;
    base_amt: number | null;
    award_amt: number | null;
    bid_rate_pct: number | null;
    participants: number | null;
    openg_dt: string | null;
  }[];
  out_of_scope_summary?: {
    award_count: number;
    avg_award_amt: number | null;
    avg_rate: number | null;
    avg_participants: number | null;
    regions: {
      region: string;
      award_count: number;
    }[];
  };
};

const KST = "Asia/Seoul";

function kstDateKey(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  const left = sorted[base]!;
  const right = sorted[Math.min(sorted.length - 1, base + 1)]!;
  return left + (right - left) * rest;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function toManWonText(value: number): string {
  const man = Math.round(value / 10000);
  return `${man.toLocaleString("ko-KR")}만원`;
}

function bandText(band: string): string {
  if (band === "under_85") return "85% 미만";
  if (band === "85_95") return "85~95%";
  if (band === "over_95") return "95% 초과";
  return "기타";
}

export function buildAwardMarketSnapshot(rows: AwardRow[], now = new Date()): AwardMarketSnapshot | null {
  if (!rows.length) return null;
  const inScopeRows = rows.filter(
    (r) => typeof r.industry_code === "string" && r.industry_code.trim().length > 0 && (r.industry_name?.trim() ?? "") !== "기타"
  );
  const outScopeRows = rows.filter((r) => !inScopeRows.includes(r));
  if (!inScopeRows.length) return null;

  const rates = inScopeRows.map((r) => r.bid_rate_pct).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const participants = inScopeRows
    .map((r) => r.prtcpt_cnum)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0);
  const awards = inScopeRows
    .map((r) => r.sucsfbid_amt)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0);

  const avgRate = avg(rates);
  const avgParticipants = avg(participants);
  const avgAward = avg(awards);
  const sortedRates = [...rates].sort((a, b) => a - b);

  const bandCounts = new Map<string, number>();
  for (const row of inScopeRows) {
    const key = row.rate_band ?? "unknown";
    bandCounts.set(key, (bandCounts.get(key) ?? 0) + 1);
  }
  const dominant = [...bandCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const dominantBand = dominant ? bandText(dominant[0]) : "—";

  const binSize = 0.05;
  const windowSize = 0.2;
  const bins = new Map<number, number>();
  for (const r of sortedRates) {
    const key = Math.floor(r / binSize) * binSize;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  const starts = [...bins.keys()].sort((a, b) => a - b);
  let bestStart = starts[0] ?? 85;
  let bestCount = 0;
  for (const start of starts) {
    let c = 0;
    for (const [binStart, cnt] of bins.entries()) {
      if (binStart >= start && binStart < start + windowSize) c += cnt;
    }
    if (c > bestCount) {
      bestCount = c;
      bestStart = start;
    }
  }
  const clusterStart = bestStart;
  const clusterEnd = bestStart + windowSize;
  const clusterRates = sortedRates.filter((r) => r >= clusterStart && r < clusterEnd);
  const clusterSorted = clusterRates.length > 0 ? clusterRates : sortedRates;
  const p10 = percentile(clusterSorted, 0.1) ?? clusterStart;
  const p25 = percentile(clusterSorted, 0.25) ?? clusterStart;
  const p50 = percentile(clusterSorted, 0.5) ?? clusterStart;
  const avgParticipantsInCluster = avg(
    inScopeRows
      .filter((r) => typeof r.bid_rate_pct === "number" && r.bid_rate_pct >= clusterStart && r.bid_rate_pct < clusterEnd)
      .map((r) => r.prtcpt_cnum)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
  );
  const compDeltaRaw =
    avgParticipantsInCluster != null && avgParticipants != null ? (avgParticipantsInCluster - avgParticipants) * 0.01 : 0;
  const compDelta = Math.max(-0.08, Math.min(0.08, compDeltaRaw));
  const safeRate = Math.max(clusterStart - 0.02, p50 - 0.02 - compDelta * 0.5);
  const normalRate = Math.max(clusterStart - 0.03, p25 - compDelta);
  const aggressiveRate = Math.max(clusterStart - 0.05, p10 - compDelta - 0.01);

  const sampleCount = inScopeRows.length;
  const periodKey = kstDateKey(now);
  const title = `${periodKey} 낙찰 리포트`;
  const confidenceLevel: AwardRecommendation["confidence_level"] =
    sampleCount >= 80 ? "높음" : sampleCount >= 30 ? "보통" : "낮음";

  const keyMetrics: string[] = [
    `최근 90일 낙찰 표본 ${sampleCount.toLocaleString("ko-KR")}건 (등록 업종 기준)`,
    avgRate != null ? `평균 낙찰률 ${avgRate.toFixed(2)}%` : "평균 낙찰률 산출 불가",
    avgParticipants != null ? `평균 참여 업체수 ${avgParticipants.toFixed(1)}개` : "참여 업체수 산출 불가",
    avgAward != null ? `평균 낙찰금액 ${toManWonText(avgAward)}` : "평균 낙찰금액 산출 불가",
    `최다 낙찰률 구간 ${dominantBand}`,
    `핵심 군집 ${clusterStart.toFixed(2)}~${clusterEnd.toFixed(2)}%`,
  ];

  const headline =
    avgRate != null && avgParticipants != null
      ? `최근 90일 낙찰 결과 기준 평균 낙찰률은 ${avgRate.toFixed(2)}%, 평균 참여 업체수는 ${avgParticipants.toFixed(1)}개입니다.`
      : `최근 90일 등록 업종 낙찰 결과 표본 ${sampleCount.toLocaleString("ko-KR")}건을 기반으로 낙찰 흐름을 요약했습니다.`;

  const practicalNote =
    "이 리포트는 낙찰 결과 군집 기반의 참고 지표입니다. 실제 투찰가는 공고 조건·기관별 특성과 함께 최종 판단하세요.";
  const nextAction =
    "유사 조건으로 입찰 목록을 열어 전략(안전/일반/공격) 기준을 비교하고, 내 관심 조건으로 저장해 반복 적용하세요.";

  const recommendation: AwardRecommendation = {
    cluster_start: round4(clusterStart),
    cluster_end: round4(clusterEnd),
    cluster_count: clusterRates.length,
    p10: round4(p10),
    p25: round4(p25),
    p50: round4(p50),
    safe_rate: round4(safeRate),
    normal_rate: round4(normalRate),
    aggressive_rate: round4(aggressiveRate),
    confidence_level: confidenceLevel,
  };

  const byIndustry = new Map<string, AwardRow[]>();
  for (const row of inScopeRows) {
    const name = row.industry_name?.trim() || "청소관련 업종 외";
    const arr = byIndustry.get(name) ?? [];
    arr.push(row);
    byIndustry.set(name, arr);
  }
  const industryComparison = [...byIndustry.entries()]
    .map(([industryName, list]) => {
      const cnt = list.length;
      const awardAvg = avg(
        list.map((r) => r.sucsfbid_amt).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
      );
      const rateAvg = avg(
        list.map((r) => r.bid_rate_pct).filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      );
      const pAvg = avg(
        list.map((r) => r.prtcpt_cnum).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
      );
      const regionCount = new Map<string, number>();
      for (const r of list) {
        const region = r.region_sido?.trim() || "기타";
        regionCount.set(region, (regionCount.get(region) ?? 0) + 1);
      }
      const topRegion = [...regionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "기타";
      return {
        industry_name: industryName,
        award_count: cnt,
        avg_award_amt: awardAvg,
        avg_rate: rateAvg,
        avg_participants: pAvg,
        top_region: topRegion,
      };
    })
    .sort((a, b) => b.award_count - a.award_count);

  const outScopeSummary = {
    award_count: outScopeRows.length,
    avg_award_amt: avg(
      outScopeRows.map((r) => r.sucsfbid_amt).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
    ),
    avg_rate: avg(
      outScopeRows.map((r) => r.bid_rate_pct).filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    ),
    avg_participants: avg(
      outScopeRows.map((r) => r.prtcpt_cnum).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
    ),
    regions: (() => {
      const byRegion = new Map<string, number>();
      for (const row of outScopeRows) {
        const region = row.region_sido?.trim() || "기타";
        byRegion.set(region, (byRegion.get(region) ?? 0) + 1);
      }
      return [...byRegion.entries()]
        .map(([region, award_count]) => ({ region, award_count }))
        .sort((a, b) => b.award_count - a.award_count);
    })(),
  };
  if (outScopeSummary.award_count > 0) {
    industryComparison.push({
      industry_name: "청소관련 업종 외",
      award_count: outScopeSummary.award_count,
      avg_award_amt: outScopeSummary.avg_award_amt,
      avg_rate: outScopeSummary.avg_rate,
      avg_participants: outScopeSummary.avg_participants,
      top_region: "—",
    });
  }

  const byRegion = new Map<string, AwardRow[]>();
  for (const row of inScopeRows) {
    const region = row.region_sido?.trim() || "기타";
    const arr = byRegion.get(region) ?? [];
    arr.push(row);
    byRegion.set(region, arr);
  }
  const regionDistribution = [...byRegion.entries()]
    .map(([region, list]) => {
      const cnt = list.length;
      const awardAvg = avg(
        list.map((r) => r.sucsfbid_amt).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
      );
      return {
        region,
        award_count: cnt,
        share_pct: inScopeRows.length > 0 ? Math.round((cnt / inScopeRows.length) * 1000) / 10 : 0,
        avg_award_amt: awardAvg,
      };
    })
    .sort((a, b) => b.award_count - a.award_count);

  const topAwards = inScopeRows
    .sort((a, b) => (b.sucsfbid_amt ?? 0) - (a.sucsfbid_amt ?? 0))
    .slice(0, 15)
    .map((r, i) => ({
      rank: i + 1,
      tender_id: r.tender_id ?? null,
      bid_ntce_nm: r.bid_ntce_nm?.trim() || "공고명 없음",
      region: r.region_sido?.trim() || "기타",
      agency_name: r.agency_name?.trim() || "—",
      industry_name: r.industry_name?.trim() || "기타",
      base_amt:
        typeof r.base_amt === "number" && Number.isFinite(r.base_amt)
          ? r.base_amt
          : typeof r.presmpt_prce === "number" && Number.isFinite(r.presmpt_prce)
            ? r.presmpt_prce
            : null,
      award_amt: typeof r.sucsfbid_amt === "number" ? r.sucsfbid_amt : null,
      bid_rate_pct: typeof r.bid_rate_pct === "number" ? r.bid_rate_pct : null,
      participants: typeof r.prtcpt_cnum === "number" ? r.prtcpt_cnum : null,
      openg_dt: r.openg_dt ?? null,
    }));

  const content: AwardReportContent = {
    headline,
    key_metrics: keyMetrics,
    practical_note: practicalNote,
    next_action: nextAction,
    recommendation,
    industry_comparison: industryComparison,
    region_distribution: regionDistribution,
    top_awards: topAwards,
    out_of_scope_summary: outScopeSummary.award_count > 0 ? outScopeSummary : undefined,
    data_trust: {
      source: "나라장터 낙찰요약(tender_award_summaries) 집계",
      sample_count: sampleCount,
    },
    tags: ["낙찰", "낙찰률", "참여업체수", "요약리포트"],
  };

  return {
    report_type: REPORT_TYPE_AWARD_MARKET_INTEL,
    period_key: periodKey,
    title,
    content_full: content,
    content_summary: content,
    content_social: `${periodKey} 낙찰 리포트: 군집 ${clusterStart.toFixed(2)}~${clusterEnd.toFixed(2)}%, 일반 ${normalRate.toFixed(2)}%.`,
    sample_count: sampleCount,
  };
}


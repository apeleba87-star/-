/**
 * 현장거래 시장 인텔리전스 리포트: 시장 가격 구조, 평당 단가, 매매 배수, 지역별 건수.
 */

import type { ListingMarketIntelPayload } from "./listing-report-queries";
import { REPORT_TYPE_LISTING_MARKET_INTEL } from "./report-snapshot-types";
import type { ReportContentBlock } from "./report-snapshot-types";

function formatManwon(value: number): string {
  const man = Math.round(value / 10000);
  return `${man.toLocaleString()}만원`;
}

function formatWon(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만원`;
  return `${Math.round(value).toLocaleString()}원`;
}

function formatMultiplier(value: number): string {
  return `${value.toFixed(1)}배`;
}

export type ListingMarketIntelSnapshot = {
  report_type: typeof REPORT_TYPE_LISTING_MARKET_INTEL;
  period_key: string;
  title: string;
  content_full: ReportContentBlock & { region_top3?: { name: string; count: number }[] };
  content_summary: ReportContentBlock;
  content_social: string;
};

export function buildListingMarketIntelSnapshot(
  payload: ListingMarketIntelPayload
): ListingMarketIntelSnapshot | null {
  const hasAny =
    payload.monthly?.sample_count ||
    payload.per_pyeong?.sample_count ||
    payload.multiplier?.sample_count ||
    payload.total_open_count > 0;

  if (!hasAny) return null;

  const topRegion = payload.region_breakdown[0];
  const regionTop3 = payload.region_breakdown.slice(0, 3);

  const keyMetrics: string[] = [];
  keyMetrics.push(`진행 중 정기 매매 ${payload.total_open_count}건`);
  if (payload.monthly && payload.monthly.sample_count > 0) {
    keyMetrics.push(
      `월 수금: 평균 ${formatManwon(payload.monthly.avg)}, 중앙값 ${formatManwon(payload.monthly.median)}, 범위 ${formatManwon(payload.monthly.min)}~${formatManwon(payload.monthly.max)} (${payload.monthly.sample_count}건)`
    );
  }
  if (payload.per_pyeong && payload.per_pyeong.sample_count > 0) {
    keyMetrics.push(
      `평당 월 단가: 평균 ${formatWon(payload.per_pyeong.avg)}, 중앙값 ${formatWon(payload.per_pyeong.median)}, 상위 ${formatWon(payload.per_pyeong.max)} (${payload.per_pyeong.sample_count}건)`
    );
  }
  if (payload.multiplier && payload.multiplier.sample_count > 0) {
    keyMetrics.push(
      `매매 배수: 평균 ${formatMultiplier(payload.multiplier.avg)}, 중앙값 ${formatMultiplier(payload.multiplier.median)}, 범위 ${formatMultiplier(payload.multiplier.min)}~${formatMultiplier(payload.multiplier.max)}`
    );
  }

  const headline =
    topRegion && payload.total_open_count > 0
      ? `${payload.period_label} 현장거래 시장: 진행 중 정기 매매 ${payload.total_open_count}건, ${topRegion.name} ${topRegion.count}건으로 가장 많습니다. 중앙값·범위 기준 시장 가격 구조를 확인하세요.`
      : `${payload.period_label} 현장거래 시장 요약. 진행 중 정기 매매 ${payload.total_open_count}건 기준 가격·평당 단가·매매 배수 참고치를 제공합니다.`;

  const practical_note =
    payload.monthly && payload.per_pyeong
      ? `평균만 보지 말고 중앙값과 상·하한을 함께 보면 시장 가격 구조를 정확히 파악할 수 있습니다. 평당 단가는 업종·지역별로 차이가 크므로 동일 유형 현장과 비교해 보시고, 매매 배수는 투자·매각 판단 시 참고하세요.`
      : `등록된 정기 매매 현장 기준으로 시세를 정리했습니다. 표본이 충분한 구간만 참고하고, 견적·계약 시에는 현장 조건을 반드시 확인하세요.`;

  const nextAction =
    "현장거래 목록에서 지역·유형별로 필터한 뒤, 비슷한 규모·조건의 거래와 단가·배수를 비교해 보세요.";

  const beneficiary =
    "정기 매매·도급 현장을 등록·검토하는 업체와, 시장 시세를 참고하고 싶은 분에게 유용합니다.";

  const content_full: ListingMarketIntelSnapshot["content_full"] = {
    headline,
    key_metrics: keyMetrics,
    region_top3: regionTop3.map((r) => ({ name: r.name, count: r.count })),
    practical_note,
    next_action: nextAction,
    beneficiary,
    data_trust: {
      source: "클린아이덱스 분석(현장거래 집계)",
      sample_count: payload.total_open_count,
    },
    tags: ["현장거래", "시장인텔", "평당단가", "매매배수"],
  };

  const content_summary: ReportContentBlock = {
    headline,
    key_metrics: keyMetrics,
    practical_note,
    next_action: nextAction,
    beneficiary,
    data_trust: {
      source: "클린아이덱스 분석(현장거래 집계)",
      sample_count: payload.total_open_count,
    },
  };

  const socialParts: string[] = [];
  if (payload.total_open_count > 0) socialParts.push(`진행 중 정기 매매 ${payload.total_open_count}건`);
  if (payload.monthly?.median) socialParts.push(`월수금 중앙값 ${formatManwon(payload.monthly.median)}`);
  if (payload.per_pyeong?.median) socialParts.push(`평당 단가 중앙값 ${formatWon(payload.per_pyeong.median)}`);
  if (payload.multiplier?.median) socialParts.push(`매매배수 중앙값 ${formatMultiplier(payload.multiplier.median)}`);
  const content_social =
    socialParts.length > 0
      ? `${payload.period_label} 현장거래 시장. ${socialParts.join(", ")}. 자세한 내용은 리포트에서.`
      : "";

  const title = `${payload.period_label} 현장거래 시장 인텔리전스`;

  return {
    report_type: REPORT_TYPE_LISTING_MARKET_INTEL,
    period_key: payload.period_key,
    title,
    content_full,
    content_summary,
    content_social,
  };
}

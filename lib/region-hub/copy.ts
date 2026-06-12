/** 크로스 제품 브릿지 — 질문형 헤드 + 숫자 티저 */

export const REGION_HUB_JOBS_CTA = "공고 보기";
export const REGION_HUB_DEMAND_CTA = "수요 보기";
export const REGION_HUB_WAGE_CTA = "시세 확인";

export function regionHubJobsSlimHook(): string {
  return "우리 지역 일자리가 궁금하다면?";
}

export function regionHubJobsSlimDetail(jobCount: number): string {
  return `${jobCount.toLocaleString("ko-KR")}건 일자리 확인`;
}

export function regionHubJobsHeadline(regionLabel: string): string {
  return `${regionLabel}, 지금 구할 만한 일이 있을까요?`;
}

/** 입주레이더 그래프 직후 — 지역명은 차트 캡션에 이미 있음 */
export function regionHubJobsBelowChartHeadline(): string {
  return "열린 일자리가 있을까요?";
}

/** @deprecated `regionHubJobsBelowChartHeadline` — 구 번들·캐시 호환 */
export function regionHubJobsCompactHeadline(_regionLabel?: string): string {
  return regionHubJobsBelowChartHeadline();
}

export function regionHubJobsCompactDetail(jobCount: number, hasPosts: boolean): string {
  if (!hasPosts) return "인근·전국 공고 보기";
  return `오늘 ${jobCount.toLocaleString("ko-KR")}건`;
}

export function regionHubJobsDetail(jobCount: number, hasPosts: boolean): string {
  if (!hasPosts) {
    return "오늘 이 지역 공고가 아직 없어요. 인근·전국 공고부터 살펴보세요.";
  }
  return `오늘 ${jobCount.toLocaleString("ko-KR")}건`;
}

export function regionHubDemandHeadline(regionLabel: string): string {
  return `${regionLabel}, 입주·이사 수요는 어떤가요?`;
}

export function regionHubDemandDetail(): string {
  return "검색·실거래·수요 점수를 한곳에서 비교해 보세요.";
}

export function regionHubDemandSlimHook(): string {
  return "이 동네, 살만할까요?";
}

export function regionHubDemandSlimDetail(): string {
  return "입주·이사 수요 레이더";
}

/** 채용 목록 — 슬림 브릿지 */
export function regionHubDemandJobsPageHeadline(): string {
  return "입주·이사 수요는 어떤가요?";
}

export function regionHubWageJobsPageHeadline(): string {
  return "이 일당 적정할까요?";
}

export function regionHubWageJobsPageDetail(
  dominantCategory: string | null,
  excerpt: string,
  hasPosts: boolean
): string {
  if (!hasPosts) return "전국 시세와 비교해 보기";
  if (dominantCategory) return `오늘 · ${dominantCategory} 최다`;
  return excerpt ? `오늘 · ${excerpt}` : "당일 시세 보기";
}

export function regionHubWageFromJobsHeadline(regionLabel: string): string {
  return `${regionLabel}, 이 일당 적정할까요?`;
}

export function regionHubWageFromJobsDetail(
  dominantCategory: string | null,
  excerpt: string,
  hasPosts: boolean
): string {
  if (!hasPosts) return "오늘 이 지역 시세 공고가 없어요. 전국 시세와 비교해 보세요.";
  if (dominantCategory) return `오늘 시세 · ${dominantCategory} 공고 최다`;
  return excerpt ? `오늘 시세 · ${excerpt}` : "오늘 등록 공고 기준 당일 시세";
}

export function regionHubDemandFromReportHeadline(province: string): string {
  return `${province}, 입주 수요는 어떤가요?`;
}

export function regionHubJobsFromReportHeadline(province: string): string {
  return `${province}, 실제 채용 공고는 얼마나 있을까요?`;
}

export function regionHubJobsFromReportDetail(jobCount: number): string {
  if (jobCount <= 0) return "고용24 기준 열린 공고를 지역별로 모았어요.";
  return `${jobCount.toLocaleString("ko-KR")}건 일자리 확인`;
}

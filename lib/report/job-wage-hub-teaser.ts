export type JobWageHubProvinceTeaser = {
  province: string;
  /** 회원·관리자만 숫자. 게스트는 항상 null */
  avgDailyWon: number | null;
  jobPostCount: number;
};

/** 클라이언트로 내려가는 최소 티저 — payload 원본 없음 */
export type JobWageHubTeaser = {
  reportDate: string;
  excerpt: string;
  dominantCategory: string | null;
  nationalTopProvince: string | null;
  provinces: JobWageHubProvinceTeaser[];
  amountsVisible: boolean;
};

export type JobWageHubTeaserRaw = {
  reportDate: string;
  excerpt: string;
  dominantCategory: string | null;
  nationalTopProvince: string | null;
  provinces: { province: string; avgDailyWon: number; jobPostCount: number }[];
};

export function toJobWageHubTeaserForTier(
  raw: JobWageHubTeaserRaw | null,
  tier: "guest" | "member" | "admin"
): JobWageHubTeaser | null {
  if (!raw) return null;
  const amountsVisible = tier !== "guest";
  return {
    reportDate: raw.reportDate,
    excerpt: raw.excerpt,
    dominantCategory: raw.dominantCategory,
    nationalTopProvince: raw.nationalTopProvince,
    amountsVisible,
    provinces: raw.provinces.map((p) => ({
      province: p.province,
      avgDailyWon: amountsVisible ? p.avgDailyWon : null,
      jobPostCount: p.jobPostCount,
    })),
  };
}

export function jobWageProvinceFromTeaser(
  teaser: JobWageHubTeaser,
  province: string | null
): JobWageHubProvinceTeaser | null {
  if (!province) return null;
  return teaser.provinces.find((p) => p.province === province) ?? null;
}

/** 당일 리포트 전국 평균 일당 1위 시·도 */
export function jobWageNationalTopFromTeaser(
  teaser: JobWageHubTeaser
): JobWageHubProvinceTeaser | null {
  return jobWageProvinceFromTeaser(teaser, teaser.nationalTopProvince);
}

export function jobWageReportHref(reportDate: string, province?: string | null): string {
  const base = `/job-market-report/${reportDate}`;
  if (!province) return base;
  return `${base}?province=${encodeURIComponent(province)}`;
}

/**
 * 입찰 리포트 목록 카드 상단(히어로)용: excerpt에서 건수·한 줄 힌트 추출.
 * 일간: "오늘 … 입찰 N건과 예산 상위…" / 주간 등: "입찰은 N건, 추정 규모 …"
 */
import { formatJobWageDominantDisplayName } from "@/lib/jobs/job-wage-dominant-label";

export type ReportCardHeroParsed = {
  count: number | null;
  subtitle: string | null;
};

export function parseReportCardHeroFromExcerpt(
  excerpt: string | null | undefined
): ReportCardHeroParsed {
  if (!excerpt?.trim()) return { count: null, subtitle: null };
  const text = excerpt.trim();

  const countMatch = text.match(/입찰(?:은)?\s*([\d,]+)\s*건/);
  let count: number | null = null;
  if (countMatch) {
    const n = parseInt(countMatch[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(n) && n >= 0) count = n;
  }

  let subtitle: string | null = null;
  const budgetM = text.match(/추정\s*규모\s*([^,이으며]+)/);
  if (budgetM) {
    subtitle = `추정 규모 ${budgetM[1].trim()}`;
  } else if (/예산\s*상위/.test(text)) {
    subtitle = "예산 상위 공고 포함";
  }

  return { count, subtitle };
}

/** published_at 또는 id로 카드별 그라데이션 톤 인덱스 (0~4) */
export function reportCardGradientIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 5;
}

/** 리포트 목록 카드용 YYYY-MM-DD → 한국어 날짜 (입찰 리포트와 동일 톤) */
export function formatReportCardListDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("ko-KR");
}

/** 입찰 리포트 외: 카드 히어로 큰 숫자·부제 (NewsCard `heroMetrics`) */
export type ReportCardHeroMetrics = {
  /** primaryKeywordLine·primaryStatusLine·primaryLine 없을 때만 표시 */
  value?: number;
  suffix?: string;
  subtitle?: string | null;
  /** 단일 줄 강조 (선택) */
  primaryLine?: string | null;
  /** 마케팅: 1줄 크게 — 예 `[수영장청소]` */
  primaryKeywordLine?: string | null;
  /** 마케팅: 2줄 작게 — 예 `상승중!` */
  primaryStatusLine?: string | null;
  /** 마케팅 카드: 급상승/급하락/안정 건수(색 구분 표시) */
  trendSummary?: { rising: number; falling: number; stable: number } | null;
};

function trendRowGroupName(row: unknown): string | null {
  if (row == null || typeof row !== "object") return null;
  const name = (row as { groupName?: string }).groupName;
  const s = typeof name === "string" ? name.trim() : "";
  return s || null;
}

/** 마케팅 payload → 급상승 1위 그룹명(연결 카드·문구용) */
export function marketingTopRisingGroupName(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const rising = Array.isArray(p.rising) ? p.rising : [];
  return trendRowGroupName(rising[0]);
}

/** 마케팅 리포트 payload → 급상승 1위 키워드 강조 + 급등/급락 요약 (부제는 유지) */
export function heroMetricsFromMarketingPayload(payload: unknown): ReportCardHeroMetrics | null {
  if (payload == null || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const groups = Array.isArray(p.groups) ? p.groups : [];
  if (groups.length === 0) return null;
  const rising = Array.isArray(p.rising) ? p.rising : [];
  const falling = Array.isArray(p.falling) ? p.falling : [];
  const stable = Array.isArray(p.stable) ? p.stable : [];
  const trendSummary = {
    rising: rising.length,
    falling: falling.length,
    stable: stable.length,
  };
  const topRising = trendRowGroupName(rising[0]);
  if (topRising) {
    return {
      primaryKeywordLine: `[${topRising}]`,
      primaryStatusLine: "상승중!",
      trendSummary,
    };
  }
  return {
    value: groups.length,
    suffix: "개 그룹",
    trendSummary,
  };
}

/** 일당 리포트 목록 카드: 1위 직종(몰림) 강조 2줄 */
export function heroMetricsFromJobWagePayload(
  payload: unknown,
  _prevPayload?: unknown
): ReportCardHeroMetrics | null {
  if (payload == null || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const jobPostCount =
    typeof p.jobPostCount === "number" && Number.isFinite(p.jobPostCount) ? Math.max(0, Math.floor(p.jobPostCount)) : null;
  const dom = p.dominantCategory as { name?: string } | undefined;
  const name = (dom?.name ?? "").trim();

  if (name) {
    const heroKeyword = `[${formatJobWageDominantDisplayName(name)}]`;
    return {
      primaryKeywordLine: heroKeyword,
      primaryStatusLine: "최다 모집",
      subtitle: null,
    };
  }

  const value = jobPostCount ?? 0;
  return {
    value,
    suffix: "건",
    subtitle: null,
  };
}

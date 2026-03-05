/**
 * 청소업 관련 점수·판별 로직
 * - high: 제목 +50, 상세 +40
 * - mid: +10
 * - 제외 키워드: -60
 * - clean_score >= 60 → is_clean_related
 */

const HIGH_KEYWORDS = [
  "청소", "미화", "환경미화", "청소용역", "미화용역", "건물청소", "위생관리",
];
const MID_KEYWORDS = [
  "시설관리", "환경관리", "관리용역", "환경정비",
];
const EXCLUDE_KEYWORDS = [
  "뉴스클리핑", "뉴스스크랩", "스크랩", "클리핑", "연구용역", "설계", "보안조치", "정밀점검",
];

const TITLE_HIGH = 50;
const DETAIL_HIGH = 40;
const MID = 10;
const EXCLUDE_PENALTY = 60;
const THRESHOLD = 60;

export interface CleanScoreResult {
  score: number;
  isCleanRelated: boolean;
  reason: {
    matchedHigh: string[];
    matchedMid: string[];
    matchedInTitle: string[];
    matchedInDetail: string[];
    excluded: string[];
  };
}

function findMatches(text: string, keywords: string[]): string[] {
  if (!text || typeof text !== "string") return [];
  const lower = text.toLowerCase().replace(/\s/g, "");
  return keywords.filter((k) => lower.includes(k.toLowerCase().replace(/\s/g, "")));
}

export function computeCleanScore(
  title: string,
  detailText?: string | null
): CleanScoreResult {
  const t = String(title ?? "");
  const d = String(detailText ?? "");
  const reason = {
    matchedHigh: [] as string[],
    matchedMid: [] as string[],
    matchedInTitle: [] as string[],
    matchedInDetail: [] as string[],
    excluded: [] as string[],
  };

  const excluded = findMatches(t + " " + d, EXCLUDE_KEYWORDS);
  reason.excluded = excluded;
  if (excluded.length > 0) {
    return {
      score: -EXCLUDE_PENALTY,
      isCleanRelated: false,
      reason,
    };
  }

  const highInTitle = findMatches(t, HIGH_KEYWORDS);
  const highInDetail = findMatches(d, HIGH_KEYWORDS);
  const midInTitle = findMatches(t, MID_KEYWORDS);
  const midInDetail = findMatches(d, MID_KEYWORDS);

  reason.matchedHigh = [...new Set([...highInTitle, ...highInDetail])];
  reason.matchedMid = [...new Set([...midInTitle, ...midInDetail])];
  reason.matchedInTitle = [...new Set([...highInTitle, ...midInTitle])];
  reason.matchedInDetail = [...new Set([...highInDetail, ...midInDetail])];

  let score = 0;
  if (highInTitle.length > 0) score += TITLE_HIGH;
  if (highInDetail.length > 0) score += DETAIL_HIGH;
  if (score === 0 && (midInTitle.length > 0 || midInDetail.length > 0)) score += MID;

  return {
    score,
    isCleanRelated: score >= THRESHOLD,
    reason,
  };
}

/** DB 행에 넣을 clean_reason JSON (저장용) */
export function cleanReasonToJsonb(result: CleanScoreResult): Record<string, unknown> {
  return {
    score: result.score,
    matchedHigh: result.reason.matchedHigh,
    matchedMid: result.reason.matchedMid,
    matchedInTitle: result.reason.matchedInTitle,
    matchedInDetail: result.reason.matchedInDetail,
    excluded: result.reason.excluded,
  };
}

/**
 * 청소업 관련 점수·판별 로직
 * - DB의 tender_keywords(include/exclude) 사용 가능
 * - exclude: 매칭 전 제거(청소년→공백)로 오매칭 방지 + 포함 시 공고 제외
 * - include: 제목 +50, 상세 +40, 50점 이상이면 is_clean_related
 */

const TITLE_HIGH = 50;
const DETAIL_HIGH = 40;
const EXCLUDE_PENALTY = 60;
const THRESHOLD = 50;

/** 기본 포함 키워드 (DB 미사용 시) */
const DEFAULT_INCLUDE = [
  "청소", "미화", "환경미화", "청소용역", "미화용역", "건물청소", "위생관리",
  "시설관리", "환경관리", "관리용역", "환경정비",
];
/** 기본 제외 키워드 (DB 미사용 시) */
const DEFAULT_EXCLUDE = [
  "청소년", "뉴스클리핑", "뉴스스크랩", "연구용역", "설계",
];

export interface CleanScoreOptions {
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

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

/** exclude 구문을 공백으로 치환해, include가 그 안에서 매칭되지 않게 함 (예: 청소년 → 청소 미매칭) */
function stripExcludePhrases(text: string, excludeKeywords: string[]): string {
  let out = text;
  for (const ex of excludeKeywords) {
    if (!ex || !ex.trim()) continue;
    const re = new RegExp(ex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    out = out.replace(re, " ");
  }
  return out;
}

function findMatches(text: string, keywords: string[]): string[] {
  if (!text || typeof text !== "string") return [];
  const lower = text.toLowerCase().replace(/\s/g, "");
  return keywords.filter((k) => lower.includes(k.toLowerCase().replace(/\s/g, "")));
}

export function computeCleanScore(
  title: string,
  detailText?: string | null,
  options?: CleanScoreOptions | null
): CleanScoreResult {
  const include = options?.includeKeywords?.length ? options.includeKeywords : DEFAULT_INCLUDE;
  const exclude = options?.excludeKeywords?.length ? options.excludeKeywords : DEFAULT_EXCLUDE;

  const t = String(title ?? "");
  const d = String(detailText ?? "");
  const full = t + " " + d;
  const reason = {
    matchedHigh: [] as string[],
    matchedMid: [] as string[],
    matchedInTitle: [] as string[],
    matchedInDetail: [] as string[],
    excluded: [] as string[],
  };

  const excludedInText = findMatches(full, exclude);
  reason.excluded = excludedInText;
  if (excludedInText.length > 0) {
    return {
      score: -EXCLUDE_PENALTY,
      isCleanRelated: false,
      reason,
    };
  }

  const tCleaned = stripExcludePhrases(t, exclude);
  const dCleaned = stripExcludePhrases(d, exclude);

  const highInTitle = findMatches(tCleaned, include);
  const highInDetail = findMatches(dCleaned, include);

  reason.matchedHigh = [...new Set([...highInTitle, ...highInDetail])];
  reason.matchedMid = [];
  reason.matchedInTitle = highInTitle;
  reason.matchedInDetail = highInDetail;

  let score = 0;
  if (highInTitle.length > 0) score += TITLE_HIGH;
  if (highInDetail.length > 0) score += DETAIL_HIGH;

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

/** 업종별 옵션으로 매칭된 카테고리 코드 목록 반환 (cleaning, disinfection 등) */
export type CategoryKeywordOptions = {
  cleaning: CleanScoreOptions;
  disinfection: CleanScoreOptions;
  globalExclude: string[];
};

export function computeCategoryScores(
  title: string,
  detailText: string | undefined | null,
  optionsByCategory: CategoryKeywordOptions
): string[] {
  const matched: string[] = [];
  for (const [code, opts] of Object.entries(optionsByCategory)) {
    if (code === "globalExclude" || !opts || typeof opts !== "object") continue;
    const result = computeCleanScore(title, detailText, opts);
    if (result.isCleanRelated) matched.push(code);
  }
  return matched;
}

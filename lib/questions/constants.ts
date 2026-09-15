/** 제품·지식 Q&A — 상수·슬러그·경로 */

export const QUESTION_ENTITY_TYPES = [
  "product",
  "contaminant",
  "material",
  "place",
  "equipment",
] as const;

export type QuestionEntityType = (typeof QUESTION_ENTITY_TYPES)[number];

export const QUESTIONS_DAILY_LIMIT = 4;
/** 가입 후 이 기간(일) 동안은 일일 상한이 QUESTIONS_NEW_ACCOUNT_DAILY_LIMIT */
export const QUESTIONS_NEW_ACCOUNT_DAYS = 7;
export const QUESTIONS_NEW_ACCOUNT_DAILY_LIMIT = 2;

export const ANSWERS_DAILY_LIMIT = 15;
/** 답변 연속 작성 최소 간격(초) */
export const ANSWERS_COOLDOWN_SEC = 30;
/** 질문 연속 작성 최소 간격(초) */
export const QUESTIONS_COOLDOWN_SEC = 60;

export const QUESTIONS_LIST_PAGE_SIZE = 20;
export const PRODUCT_QUESTIONS_PREVIEW = 5;

/** 공식 답변 공개 표시명 (실제 관리자 닉네임과 무관) */
export const OFFICIAL_ANSWER_DISPLAY_NAME = "cleanidex";

export function questionPath(id: number | string, slug: string): string {
  // Next Link가 인코딩함 — encodeURIComponent 하면 한글 슬러그가 깨져 상세 진입 실패
  return `/questions/${id}/${slug}`;
}

export function questionNewPath(productId?: string): string {
  if (productId) {
    return `/questions/new?product=${encodeURIComponent(productId)}`;
  }
  return "/questions/new";
}

export function slugifyQuestionTitle(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "question").slice(0, 80);
}

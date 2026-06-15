/** 모집(마감) 흐름 — 클린아이덱스 브랜드 대신 쓰는 중립 명칭 */

export const MAGAM_PRODUCT_NAME = "모집 안내";
export const MAGAM_APP_NAME = "마감링크";

/** 로그인·설정·CTA 헤드라인 */
export const MAGAM_APP_TAGLINE = "도급·구인 모집, 이제 마감도 쉽게";

export const MAGAM_APP_HIGHLIGHTS = [
  "링크 하나로 공고 등록",
  "모집 완료 후 마감 버튼 한 번",
  "연락처 자동 비공개",
] as const;

/** 카톡·SNS 링크 미리보기 (og:description) */
export const MAGAM_PWA_OG_DESCRIPTION =
  "도급·구인 모집, 이제 마감도 쉽게. 링크 등록 후 마감 버튼 한 번이면 연락처가 자동 비공개됩니다.";

/** Flutter 웹 PWA 배포 경로 */
export const MAGAM_WEB_APP_PATH = "/magam/app";
export const MAGAM_FROM_QUERY = "magam";

export function isMagamFromQuery(from: string | null | undefined): boolean {
  return from === MAGAM_FROM_QUERY;
}

/** 모집(마감) 흐름 — 클린아이덱스 브랜드 대신 쓰는 중립 명칭 */

export const MAGAM_PRODUCT_NAME = "모집 안내";
export const MAGAM_APP_NAME = "마감 앱";
export const MAGAM_FROM_QUERY = "magam";

export function isMagamFromQuery(from: string | null | undefined): boolean {
  return from === MAGAM_FROM_QUERY;
}

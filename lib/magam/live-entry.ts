/** 클린아이덱스·사이트 메뉴에서 실시간 모집 진입 시 쿼리 */
export const MAGAM_LIVE_FROM_CLEANIDEX = "cleanidex";

export function magamLiveHref(from?: typeof MAGAM_LIVE_FROM_CLEANIDEX): string {
  if (from === MAGAM_LIVE_FROM_CLEANIDEX) {
    return `/magam/live?from=${MAGAM_LIVE_FROM_CLEANIDEX}`;
  }
  return "/magam/live";
}

export function magamLiveBackHref(from?: string | null): string {
  if (from === MAGAM_LIVE_FROM_CLEANIDEX) return "/";
  return "/magam/me";
}

export function isMagamLiveSiteEntry(from?: string | null): boolean {
  return from === MAGAM_LIVE_FROM_CLEANIDEX;
}

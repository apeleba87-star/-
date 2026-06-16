import { MAGAM_LIVE_FROM_CLEANIDEX, magamLiveHref } from "@/lib/magam/live-entry";
import { MAGAM_INTRO_PATH, MAGAM_ME_PATH } from "@/lib/magam/nav-links";

/** 공유 공고(/p/) 진입 출처 — 쿼리 `from` 값 */
export const MAGAM_SHARE_FROM_LIVE = "live";
export const MAGAM_SHARE_FROM_LISTING = "listing";

export const MAGAM_SETTINGS_PATH = "/magam/settings";

export function magamPublicListingHref(
  slug: string,
  opts?: { from?: string; listingId?: string }
): string {
  const q = new URLSearchParams();
  if (opts?.from) q.set("from", opts.from);
  if (opts?.listingId) q.set("listingId", opts.listingId);
  const qs = q.toString();
  return `/p/${slug}${qs ? `?${qs}` : ""}`;
}

/** /p/[slug] 뒤로가기 — 출처 없으면 실시간 모집(카톡 직접 진입) */
export function magamShareBackHref(from?: string | null, listingId?: string | null): string {
  const f = from?.trim() || null;
  if (f === MAGAM_LIVE_FROM_CLEANIDEX || f === "cleanidex") {
    return magamLiveHref(MAGAM_LIVE_FROM_CLEANIDEX);
  }
  if (f === MAGAM_SHARE_FROM_LIVE) return magamLiveHref();
  if (f === MAGAM_SHARE_FROM_LISTING) {
    return listingId ? `/magam/listing/${listingId}` : MAGAM_ME_PATH;
  }
  if (f === "me") return MAGAM_ME_PATH;
  if (f === "settings") return MAGAM_SETTINGS_PATH;
  if (f === "intro") return MAGAM_INTRO_PATH;
  return magamLiveHref();
}

/** OAuth·이메일 인증 후 마감링크로 복귀하기 위한 단기 쿠키 */

export const MAGAM_AUTH_NEXT_COOKIE = "magam_auth_next";
export const MAGAM_DEFAULT_AUTH_NEXT = "/magam/me";

export function isValidMagamAuthNext(path: string | null | undefined): path is string {
  if (!path || typeof path !== "string") return false;
  const p = path.trim();
  return (
    p.startsWith("/") &&
    !p.startsWith("//") &&
    !p.includes("..") &&
    !p.startsWith("/http")
  );
}

export function resolveMagamAuthNext(
  explicitNext: string | null | undefined,
  cookieNext: string | null | undefined
): string | null {
  if (isValidMagamAuthNext(explicitNext)) return explicitNext.trim();
  if (!cookieNext) return null;
  try {
    const decoded = decodeURIComponent(cookieNext);
    return isValidMagamAuthNext(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function magamAuthCallbackUrl(origin: string, next: string = MAGAM_DEFAULT_AUTH_NEXT): string {
  const safeNext = isValidMagamAuthNext(next) ? next : MAGAM_DEFAULT_AUTH_NEXT;
  return `${origin.replace(/\/+$/, "")}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

/** 클라이언트 — OAuth 직전에 설정 (misredirect 폴백용) */
export function setMagamAuthNextCookie(next: string): void {
  if (typeof document === "undefined") return;
  const safeNext = isValidMagamAuthNext(next) ? next : MAGAM_DEFAULT_AUTH_NEXT;
  document.cookie = `${MAGAM_AUTH_NEXT_COOKIE}=${encodeURIComponent(safeNext)}; path=/; max-age=900; SameSite=Lax`;
}

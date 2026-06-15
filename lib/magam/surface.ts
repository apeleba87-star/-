import { isMagamFromQuery } from "@/lib/magam/brand";

/**
 * 클린아이덱스 헤더·푸터·사이트 브랜딩(JSON-LD)을 숨기는 경로
 * - /p/* 공유 링크 (확인자)
 * - /magam/* 마감링크 웹 (올리는 사람·관리)
 * - /login|/signup|/terms|/privacy ?from=magam (마감 흐름에서 빠져나온 인증·약관)
 */
export function isNeutralMagamSurface(pathname: string, fromQuery?: string | null): boolean {
  if (pathname === "/p" || pathname.startsWith("/p/")) return true;
  if (pathname === "/magam" || pathname.startsWith("/magam/")) return true;
  if (
    isMagamFromQuery(fromQuery) &&
    (pathname === "/signup" ||
      pathname === "/login" ||
      pathname === "/terms" ||
      pathname === "/privacy")
  ) {
    return true;
  }
  return false;
}

/** 약관·개인정보 — 마감 흐름에서 클린아이덱스 크롬 없이 열기 */
export function magamLegalHref(path: "/terms" | "/privacy"): string {
  return `${path}?from=magam`;
}

/** OAuth 콜백 실패 시 마감 흐름 로그인 화면으로 */
export function isMagamFlowPath(path: string): boolean {
  return path === "/magam" || path.startsWith("/magam/") || path === "/p" || path.startsWith("/p/");
}

export function magamLoginRedirectPath(next: string, error?: string): string {
  const params = new URLSearchParams();
  if (isMagamFlowPath(next)) {
    params.set("from", "magam");
    params.set("next", next);
  }
  if (error) params.set("error", error);
  const qs = params.toString();
  return `/login${qs ? `?${qs}` : ""}`;
}

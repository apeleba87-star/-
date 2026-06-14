import { isMagamFromQuery } from "@/lib/magam/brand";

/**
 * 클린아이덱스 헤더·푸터·사이트 브랜딩을 숨기는 경로
 * - /p/* 공유 링크 (2번·3번 확인자)
 * - /signup?from=magam, /login?from=magam (1번 글 올리는 사람)
 */
export function isNeutralMagamSurface(pathname: string, fromQuery?: string | null): boolean {
  if (pathname === "/p" || pathname.startsWith("/p/")) return true;
  if (isMagamFromQuery(fromQuery) && (pathname === "/signup" || pathname === "/login")) {
    return true;
  }
  return false;
}

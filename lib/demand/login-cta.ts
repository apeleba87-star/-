/** 로그인 후 돌아올 경로 — 현재 URL 보존 */
export function demandLoginHref(pathname: string, search: string): string {
  const next = search ? `${pathname}?${search}` : pathname || "/";
  return `/login?next=${encodeURIComponent(next)}`;
}

export function demandSignupHref(pathname: string, search: string): string {
  const next = search ? `${pathname}?${search}` : pathname || "/";
  return `/signup?next=${encodeURIComponent(next)}`;
}

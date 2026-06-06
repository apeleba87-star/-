export type DemandNavLink = {
  href: string;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
};

/** 입주레이더 허브 (홈) */
export const DEMAND_HUB_PATH = "/";

export const DEMAND_NAV_LINKS: DemandNavLink[] = [
  { href: DEMAND_HUB_PATH, label: "지역표", exact: true },
  { href: "/demand/top", label: "TOP10", adminOnly: true },
  { href: "/demand/movers", label: "급상승", adminOnly: true },
  { href: "/demand/region", label: "지역", adminOnly: true },
  { href: "/demand/compare", label: "비교", adminOnly: true },
  { href: "/demand/hits", label: "적중", adminOnly: true },
  { href: "/demand/keyword", label: "키워드", adminOnly: true },
];

const DEMAND_ADMIN_EXACT_PATHS = new Set(
  DEMAND_NAV_LINKS.filter((l) => l.adminOnly).map((l) => l.href)
);

/** 허브 서브네비 — 비관리자는 지역표만 */
export function demandNavLinksForUser(isAdmin: boolean): DemandNavLink[] {
  const visible = isAdmin ? DEMAND_NAV_LINKS : DEMAND_NAV_LINKS.filter((l) => !l.adminOnly);
  return visible.map((link) =>
    link.adminOnly ? { ...link, label: `[관] ${link.label}` } : link
  );
}

/** `/`·구 상세 공개, `/demand/*` 서브페이지는 관리자 전용 (`/demand`는 `/`로 리다이렉트) */
export function isDemandAdminOnlyPath(pathname: string): boolean {
  if (pathname === DEMAND_HUB_PATH || pathname === "/demand") return false;
  if (DEMAND_ADMIN_EXACT_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/demand/region/")) return false;
  if (pathname.startsWith("/demand/")) return true;
  return false;
}

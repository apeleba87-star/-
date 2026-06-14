import { withAdminNavLabel } from "@/lib/admin-nav-label";

export type MagamNavLink = {
  href: string;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
};

export const MAGAM_LIVE_PATH = "/magam/live";

/** 클린아이덱스·공유 링크 공통 — 실시간 모집 목록 */
export const MAGAM_NAV_LINKS: MagamNavLink[] = [
  { href: MAGAM_LIVE_PATH, label: "실시간 모집", exact: true },
];

export function magamNavLinksForUser(isAdmin: boolean): MagamNavLink[] {
  const visible = isAdmin ? MAGAM_NAV_LINKS : MAGAM_NAV_LINKS.filter((l) => !l.adminOnly);
  return visible.map((link) =>
    link.adminOnly ? { ...link, label: withAdminNavLabel(link.label) } : link
  );
}

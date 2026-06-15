import { withAdminNavLabel } from "@/lib/admin-nav-label";

export type MagamNavLink = {
  href: string;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
};

export const MAGAM_HUB_PATH = "/magam";
export const MAGAM_WRITE_PATH = "/magam/write";
export const MAGAM_ME_PATH = "/magam/me";
/** 카톡·추천 공유용 공개 소개 (로그인 리다이렉트 없음 → OG 미리보기) */
export const MAGAM_INTRO_PATH = "/magam/intro";
export const MAGAM_LIVE_PATH = "/magam/live";

/** 마감링크 웹 네비 */
export const MAGAM_NAV_LINKS: MagamNavLink[] = [
  { href: MAGAM_HUB_PATH, label: "홈", exact: true },
  { href: MAGAM_WRITE_PATH, label: "올리기", exact: true },
  { href: MAGAM_ME_PATH, label: "내 공고", exact: true },
  { href: MAGAM_LIVE_PATH, label: "실시간", exact: true },
];

export function magamNavLinksForUser(isAdmin: boolean): MagamNavLink[] {
  const visible = isAdmin ? MAGAM_NAV_LINKS : MAGAM_NAV_LINKS.filter((l) => !l.adminOnly);
  return visible.map((link) =>
    link.adminOnly ? { ...link, label: withAdminNavLabel(link.label) } : link
  );
}

export const ADMIN_NAV_PREFIX = "[관] ";

/** 관리자 전용 메뉴 라벨 — 중복 접두 방지 */
export function withAdminNavLabel(label: string): string {
  return label.startsWith(ADMIN_NAV_PREFIX) ? label : `${ADMIN_NAV_PREFIX}${label}`;
}

/** Play Store · 앱 내 고객지원 URL용 */

export const MAGAM_SUPPORT_PATH = "/magam/support";

export function magamSupportEmail(): string {
  return (
    process.env.MAGAM_SUPPORT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_MAGAM_SUPPORT_EMAIL?.trim() ||
    "apeleba2@naver.com"
  );
}

export function magamSupportUrl(siteBase: string): string {
  const base = siteBase.replace(/\/+$/, "");
  return `${base}${MAGAM_SUPPORT_PATH}`;
}

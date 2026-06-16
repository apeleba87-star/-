/** Play Store · 앱 내 고객지원 URL용 */

export const MAGAM_SUPPORT_PATH = "/magam/support";

/** 카카오톡 채널 1:1 채팅 (버그·건의) */
export const MAGAM_KAKAO_FEEDBACK_URL = "https://pf.kakao.com/_xgYbXX/chat";

export function magamKakaoFeedbackUrl(): string {
  return process.env.NEXT_PUBLIC_MAGAM_KAKAO_FEEDBACK_URL?.trim() || MAGAM_KAKAO_FEEDBACK_URL;
}

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

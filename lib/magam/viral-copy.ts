import { MAGAM_APP_NAME, MAGAM_APP_TAGLINE, MAGAM_WEB_APP_PATH } from "@/lib/magam/brand";

export function magamWebAppUrl(siteBase = "https://cleanidex.co.kr"): string {
  const base = siteBase.replace(/\/+$/, "");
  return `${base}${MAGAM_WEB_APP_PATH}/`;
}

/** 동료·단톡에 붙여넣을 서비스 소개 */
export function buildMagamIntroCopy(siteBase = "https://cleanidex.co.kr"): string {
  const appUrl = magamWebAppUrl(siteBase);
  return [
    `구인·도급 올릴 때 ${MAGAM_APP_NAME} 씁니다.`,
    MAGAM_APP_TAGLINE,
    "",
    `▶ ${appUrl}`,
    "",
    "※ 앱스토어 출시 전 · 위 주소로 바로 이용하세요.",
  ].join("\n");
}

/** 마감 후 동료에게 알릴 때 */
export function buildMagamIntroAfterCloseCopy(siteBase = "https://cleanidex.co.kr"): string {
  return [
    "공고 마감하면 링크에서 연락처가 안 보이게 할 수 있어요.",
    buildMagamIntroCopy(siteBase),
  ].join("\n\n");
}

/** 공고 카톡·카페 본문 맨 아래 (선택) */
export const MAGAM_SHARE_BRAND_ATTRIBUTION = `(공고 관리: ${MAGAM_APP_NAME})`;

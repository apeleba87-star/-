import {
  MAGAM_APP_NAME,
  MAGAM_APP_HIGHLIGHTS,
  MAGAM_APP_TAGLINE,
} from "@/lib/magam/brand";
import { MAGAM_ME_PATH } from "@/lib/magam/nav-links";

export function magamWebAppUrl(siteBase = "https://cleanidex.co.kr"): string {
  const base = siteBase.replace(/\/+$/, "");
  return `${base}${MAGAM_ME_PATH}`;
}

/** 동료·단톡에 붙여넣을 서비스 소개 */
export function buildMagamIntroCopy(siteBase = "https://cleanidex.co.kr"): string {
  const appUrl = magamWebAppUrl(siteBase);
  return [
    `${MAGAM_APP_NAME} — ${MAGAM_APP_TAGLINE}`,
    ...MAGAM_APP_HIGHLIGHTS.map((line) => `· ${line}`),
    "",
    `▶ ${appUrl}`,
    "",
    "※ 앱스토어 출시 전 · 위 주소로 바로 이용하세요.",
  ].join("\n");
}

/** 마감 후 동료에게 알릴 때 */
export function buildMagamIntroAfterCloseCopy(siteBase = "https://cleanidex.co.kr"): string {
  return [
    "모집 완료 후 마감 버튼 한 번이면 연락처가 자동 비공개됩니다.",
    buildMagamIntroCopy(siteBase),
  ].join("\n\n");
}

/** 공고 카톡·카페 본문 맨 아래 (선택) */
export const MAGAM_SHARE_BRAND_ATTRIBUTION = `(공고 관리: ${MAGAM_APP_NAME})`;

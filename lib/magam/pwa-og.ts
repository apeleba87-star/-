import {
  MAGAM_APP_NAME,
  MAGAM_PWA_OG_DESCRIPTION,
} from "@/lib/magam/brand";

export const MAGAM_PWA_OG_TITLE = MAGAM_APP_NAME;

export { MAGAM_PWA_OG_DESCRIPTION };

export const MAGAM_PWA_OG_IMAGE_PATH = "/magam/app/icons/Icon-512.png";

export function magamPwaOgImageUrl(siteBase = "https://cleanidex.co.kr"): string {
  return `${siteBase.replace(/\/+$/, "")}${MAGAM_PWA_OG_IMAGE_PATH}`;
}

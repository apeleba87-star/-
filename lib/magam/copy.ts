import type { MagamListingStatus, MagamListingType } from "@/lib/magam/types";

export const MAGAM_LISTING_TYPE_LABEL: Record<MagamListingType, string> = {
  subcontract: "도급",
  hiring: "구인",
  trade: "매매",
};

export const MAGAM_STATUS_LABEL: Record<MagamListingStatus, string> = {
  open: "모집 중",
  closed: "마감",
};

export const MAGAM_SYNC_CONSENT_TITLE = "연동 모집 노출 동의";

export const MAGAM_SYNC_CONSENT_VERSION = "1";

export const MAGAM_SYNC_CONSENT_DETAILS = [
  "본 공고 및 이후 등록 공고는 연동 모집 안내(cleanidex)에 노출됩니다.",
  "마감 시 연락·공고 내용은 모집 목적에 한해 연동 서비스에도 반영됩니다.",
  "설정에서 동의를 철회할 수 있습니다.",
] as const;

/** @deprecated 체크박스+펼침 UI로 대체 */
export const MAGAM_LINKED_SERVICE_NOTICE =
  "본 공고 및 이후 등록 공고는 연동 모집 안내(cleanidex)에 노출됩니다.";

export const MAGAM_SHARE_PAGE_TITLE = "모집 안내";

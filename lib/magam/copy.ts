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

export const MAGAM_WORK_KIND_LABEL: Record<string, string> = {
  move_in_new: "신축입주 청소",
  move_out: "이사 청소",
  ac: "에어컨 청소",
  other: "기타 청소",
};

export const MAGAM_TIME_SLOT_LABEL: Record<string, string> = {
  morning: "오전",
  afternoon: "오후",
  same_day: "당일",
  flexible: "시간 미정",
};

export const MAGAM_SYNC_CONSENT_TITLE = "모집 안내 노출 동의";

export const MAGAM_SYNC_CONSENT_VERSION = "1";

export const MAGAM_SYNC_CONSENT_DETAILS = [
  "본 공고 및 이후 등록 공고는 모집 안내에 함께 노출될 수 있습니다.",
  "마감 시 연락·공고 내용은 모집 목적에 한해 해당 안내에도 반영됩니다.",
  "설정에서 동의를 철회할 수 있습니다.",
] as const;

/** @deprecated 체크박스+펼침 UI로 대체 */
export const MAGAM_LINKED_SERVICE_NOTICE =
  "본 공고 및 이후 등록 공고는 모집 안내에 함께 노출될 수 있습니다.";

import { MAGAM_PRODUCT_NAME } from "@/lib/magam/brand";

export const MAGAM_SHARE_PAGE_TITLE = MAGAM_PRODUCT_NAME;

/** 카카오·공유 링크 CTA (URL 대신 안내 문구) */
export const MAGAM_SHARE_LINK_CTA = "접수 마감 확인하기";

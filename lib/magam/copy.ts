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

export const MAGAM_OTHER_WORK_LABEL = "기타 (직접 입력)";
export const MAGAM_OTHER_WORK_HINT = "예) 유리창 청소, 특수청소";

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

export const MAGAM_AC_TYPE_LABEL: Record<string, string> = {
  wall: "벽걸이",
  stand: "스탠드",
  two_in_one: "2in1",
  one_two_way: "1way·2way",
  four_way: "4way",
  other: "기타",
};

export const MAGAM_HIRING_WORK_LABEL = "작업내용";
export const MAGAM_SHARE_WORK_LABEL = "작업";

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

/** 카카오 피드 버튼·공유 CTA */
export const MAGAM_SHARE_LINK_CTA = "마감확인";
/** 카톡·복사 본문 링크 안내 (👇·대괄호 없음) */
export const MAGAM_SHARE_LINK_FOOTER_LINE = "마감확인 (마감완료 시 연락처는 비공개)";
export const MAGAM_SHARE_CLOSED_CONTACT_HIDDEN =
  "마감완료되어 연락처는 비공개입니다.";

export const MAGAM_KAKAO_SHARE_INCLUDE_PHONE = "공유·복사에 연락처 포함";
export const MAGAM_KAKAO_SHARE_INCLUDE_PHONE_HINT =
  "켜면 카톡·카페 복사 문구에 연락처가 들어갑니다";
export const MAGAM_GROUP_CHAT_COPY_LABEL = "단톡방 모집 글 복사";
export const MAGAM_GROUP_CHAT_COPY_LOADING = "공유 중…";
export const MAGAM_GROUP_CHAT_COPY_DONE = "공고글 복사 완료";
export const MAGAM_GROUP_CHAT_COPY_FAILED = "공고글 복사에 실패했습니다.";
export const MAGAM_NAVER_CAFE_COPY_LABEL = "네이버 카페용 복사";
export const MAGAM_NAVER_CAFE_COPY_DONE = "카페에 붙여넣을 내용이 복사됐어요.";

/** 공고 상세 — 공유 블록 섹션 */
export const MAGAM_SHARE_LISTING_SECTION = "이 공고 공유";
export const MAGAM_SHARE_REFERRAL_SECTION = "마감링크 알리기";
export const MAGAM_SHARE_REFERRAL_HINT = "이 공고가 아니라, 마감링크 서비스를 동료에게 소개합니다.";
export const MAGAM_REFERRAL_KAKAO_LABEL = "카톡으로 마감링크 알리기";
export const MAGAM_REFERRAL_KAKAO_AFTER_CLOSE = "카톡으로 동료에게 소개";

/** 소유자 → /p/ 공개 화면 미리보기 */
export const MAGAM_SHARE_PREVIEW_LABEL = "공고 미리보기";
/** 공고(/p/) 하단 — 다른 열린 공고 목록 */
export const MAGAM_OTHER_OPEN_LISTINGS_TITLE = "다른 모집 공고";
export const MAGAM_OTHER_OPEN_LISTINGS_LIMIT = 5;

export const MAGAM_TERMS_CONSENT_REQUIRED = "이용약관에 동의해야 글을 올릴 수 있습니다.";
export const MAGAM_TERMS_CONSENT_HINT =
  "허위·불법 구인, 연락처 도용 등 부적절한 공고는 금지됩니다.";
export const MAGAM_CLOSE_CONFIRM_TITLE = "마감할까요?";
export const MAGAM_CLOSE_CONFIRM_BODY =
  "마감하면 공유 링크에서 연락처가 더 이상 보이지 않습니다.";
export const MAGAM_CLOSE_CONFIRM_HINT = "한 번 마감하면 되돌릴 수 없습니다.";
export const MAGAM_CLOSE_CONFIRM_CANCEL = "취소";
export const MAGAM_CLOSE_CONFIRM_ACTION = "마감";
export const MAGAM_CLOSE_SUCCESS_TITLE = "마감 완료";
export const MAGAM_CLOSE_SUCCESS_BODY = "공유 링크에서 연락처가 숨겨졌습니다.";
export const MAGAM_SYNC_CONSENT_ALREADY_GRANTED =
  "모집 안내 노출에 동의한 상태입니다. 설정에서 철회할 수 있습니다.";

/** 마감링크 로그인 — 단톡방 목업 카피 */
export const MAGAM_LOGIN_CHAT_ROOM_TITLE = "도급·구인 단톡방";
export const MAGAM_LOGIN_CHAT_MEMBER_COUNT = "24";
export const MAGAM_LOGIN_CHAT_SAMPLE_NAME = "홍길동";
export const MAGAM_LOGIN_CHAT_SAMPLE_POST =
  "내일 구인 / 성북구 27평 잔24 / 010-XXXX-XXXX";
export const MAGAM_LOGIN_CHAT_SAMPLE_REPLY = "ㅁㄱ";
export const MAGAM_LOGIN_CHAT_READ_MARKER = "여기까지 읽으셨습니다.";
export const MAGAM_LOGIN_CHAT_TIME_BEFORE = "오후 9:07";
export const MAGAM_LOGIN_MAGAM_BUBBLE_INTRO = "이제 ㅁㄱ 댓글 달 필요가 없어요";
export const MAGAM_LOGIN_MAGAM_BUBBLE = "[마감] 버튼 한번이면 끝";
export const MAGAM_LOGIN_CHAT_TIME_AFTER = "오후 9:08";
export const MAGAM_LOGIN_TYPING_TEXT = "마감 되면 연락처는 자동으로 숨겨져요";

export const MAGAM_LOGIN_KAKAO_CTA = "카카오로 시작하기";
export const MAGAM_LOGIN_KAKAO_LOADING = "연결 중…";

export const MAGAM_DELETE_ACCOUNT_TITLE = "회원 탈퇴";
export const MAGAM_DELETE_ACCOUNT_BODY =
  "탈퇴하면 등록한 공고와 계정 정보가 삭제됩니다. 동일 계정으로 웹·앱을 쓰는 경우 모두 종료됩니다. 이 작업은 되돌릴 수 없습니다.";

export const MAGAM_HIRING_PHONE_HELPER =
  "구직자가 전화·문자할 번호 · 다음 글쓰기 때 자동 입력";
export const MAGAM_SUBCONTRACT_PHONE_HELPER = "다음 글쓰기 때 자동으로 채워집니다";

export const MAGAM_HIRING_WORK_HINT = "예) 입주청소, 후드청소, 준공청소";
export const MAGAM_HIRING_WORK_HELPER = "카페 제목처럼 하시는 일을 직접 적어 주세요";
export const MAGAM_HIRING_SPECIAL_NOTES_HINT =
  "예) 08:00~17:00, 1명, 작업 후 계좌 지급";
export const MAGAM_SUBCONTRACT_SPECIAL_NOTES_HINT =
  "예) 엘리베이터 없음, 주차 가능, 반려동물 있음";

/** 첫 사용자 온보딩 */
export const MAGAM_ONBOARDING_SKIP = "건너뛰기";
export const MAGAM_ONBOARDING_NEXT = "다음";
export const MAGAM_ONBOARDING_START = "시작하기";
export const MAGAM_ONBOARDING_GOT_IT = "알겠어요";
export const MAGAM_ONBOARDING_WRITE_START = "글쓰기 시작";

export const MAGAM_ONBOARDING_SLIDES = [
  {
    emoji: "✏️",
    title: "글쓰기",
    body: "도급·구인 공고를 1분 만에 올려요",
    visual: "write" as const,
  },
  {
    emoji: "💬",
    title: "단톡방 복사",
    body: "노란 버튼으로 카톡에 붙여넣기",
    visual: "share" as const,
  },
  {
    emoji: "🔒",
    title: "마감",
    body: "마감하면 연락처가 자동으로 숨겨져요",
    visual: "close" as const,
  },
] as const;

export const MAGAM_ONBOARDING_TAB_HINTS = [
  { href: "/magam/me", label: "올린 공고 확인" },
  { href: "/magam/write", label: "새 공고 올리기" },
  { href: "/magam/settings", label: "계정·문의" },
] as const;

export const MAGAM_ONBOARDING_WRITE_STEPS = [
  { visual: "type" as const, title: "① 모집 유형", body: "도급 또는 구인을 골라요" },
  { visual: "region" as const, title: "② 지역", body: "작업 지역을 선택해요" },
  { visual: "submit" as const, title: "③ 연락처·등록", body: "연락처 입력 후 올리면 링크가 만들어져요" },
] as const;

export type MagamOnboardingWriteVisual = (typeof MAGAM_ONBOARDING_WRITE_STEPS)[number]["visual"];

export const MAGAM_ONBOARDING_SHARE_NUDGE_TITLE = "첫 공고 등록 완료!";
export const MAGAM_ONBOARDING_SHARE_NUDGE_BODY =
  "아래 노란 「단톡방 모집 글 복사」를 눌러 카톡에 붙여넣으세요";

/** 카톡·인앱 브라우저 → Safari/Chrome 안내 */
export const MAGAM_INAPP_BROWSER_TITLE = "카톡에서는 일부 기능이 제한될 수 있어요";
export const MAGAM_INAPP_BROWSER_BODY =
  "Safari 또는 Chrome에서 열면 로그인·글쓰기·마감이 더 안정적으로 됩니다.";
export const MAGAM_INAPP_BROWSER_CONTINUE = "그대로 이용하기";
export const MAGAM_INAPP_BROWSER_COPY_FALLBACK =
  "자동으로 열리지 않으면 주소를 복사해 Safari·Chrome 주소창에 붙여넣으세요.";
export const MAGAM_INAPP_BROWSER_COPY_DONE = "주소를 복사했습니다.";

/** PWA · 바탕화면 추가 */
export const MAGAM_PWA_INSTALL_BANNER_TITLE = "바탕화면에 넣으면 앱처럼 쓸 수 있어요";
export const MAGAM_PWA_INSTALL_BANNER_BODY = "링크 찾지 않고 마감링크로 바로 들어옵니다.";
export const MAGAM_PWA_INSTALL_CTA = "바탕화면에 추가";
export const MAGAM_PWA_INSTALL_NATIVE_CTA = "앱 설치";
export const MAGAM_PWA_INSTALL_LATER = "나중에";
export const MAGAM_PWA_INSTALL_GUIDE_TITLE = "바탕화면에 추가";
export const MAGAM_PWA_INSTALL_GUIDE_STEPS = [
  "브라우저 아래쪽 또는 위쪽 메뉴(⋯)를 누르세요.",
  "「홈 화면에 추가」 또는 「바탕화면에 추가」를 선택하세요.",
  "이름이 마감링크인지 확인한 뒤 추가를 누르세요.",
  "홈 화면에 생긴 아이콘으로 다시 들어오면 됩니다.",
] as const;
export const MAGAM_PWA_INSTALL_GUIDE_CONFIRM = "확인";

export const MAGAM_MY_CLOSED_SECTION_LABEL = "마감된 공고";
export function magamMyClosedSectionToggleLabel(total: number, expanded: boolean): string {
  const suffix = total > 0 ? ` ${total}건` : "";
  return expanded ? `${MAGAM_MY_CLOSED_SECTION_LABEL}${suffix} 접기` : `${MAGAM_MY_CLOSED_SECTION_LABEL}${suffix} 보기`;
}
export const MAGAM_MY_CLOSED_LOADING = "불러오는 중…";
export const MAGAM_MY_CLOSED_PAGE_PREV = "이전";
export const MAGAM_MY_CLOSED_PAGE_NEXT = "다음";
export const MAGAM_MY_OPEN_EMPTY_WITH_CLOSED = "모집 중인 공고가 없습니다";
export const MAGAM_MY_OPEN_HAS_MORE = (limit: number) =>
  `모집 중 공고가 많아 최근 ${limit}건만 표시합니다`;

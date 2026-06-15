/// 모집 안내 노출 동의 — 체크박스만 노출, 「모집 안내 노출 동의」 탭 시 본문 펼침

const magamAppName = '마감링크';

const magamAppTagline = '링크 공유 · 마감하면 연락처 비공개';

const magamLoginPrompt = '카카오 또는 이메일로 로그인하세요';

const magamCloseConfirmBody =
    '마감하면 공유 링크에서 연락처가 더 이상 보이지 않습니다.';

const magamSyncConsentTitle = '모집 안내 노출 동의';

const magamSyncConsentVersion = '1';

const magamSyncConsentDetails = [
  '본 공고 및 이후 등록 공고는 모집 안내에 함께 노출될 수 있습니다.',
  '마감 시 연락·공고 내용은 모집 목적에 한해 해당 안내에도 반영됩니다.',
  '설정에서 동의를 철회할 수 있습니다.',
];

const magamSyncConsentAlreadyGranted =
    '모집 안내 노출에 동의한 상태입니다. 설정에서 철회할 수 있습니다.';

const listingTypeLabels = {
  'subcontract': '도급',
  'hiring': '구인',
};

const statusLabels = {
  'open': '모집 중',
  'closed': '마감',
};

/// 카카오·공유 링크 CTA
const magamShareLinkCta = '[접수상태 확인]';

const magamShareLinkArrows = '👇👇👇👇👇';

const magamKakaoShareIncludePhone = '공유·복사에 연락처 포함';

const magamKakaoShareIncludePhoneHint =
    '켜면 카톡·카페 복사 문구에 연락처가 들어갑니다';

const magamNaverCafeCopyLabel = '네이버 카페용 복사';

const magamNaverCafeCopyDone = '카페에 붙여넣을 내용이 복사됐어요.';

const magamShareWorkLabel = '작업';

/// 구인(일당) — 카카오·상세 표시 라벨
const magamHiringWorkLabel = '작업내용';

/// 구인 글쓰기 — 안내 문구 (네이버 카페 일당 구인 패턴)
const magamHiringWorkHint = '예) 입주청소, 후드청소, 준공청소';
const magamHiringWorkHelper = '카페 제목처럼 하시는 일을 직접 적어 주세요';

const magamHiringPriceHint = '13';
const magamHiringPriceSuffix = '만원';

const magamHiringSpecialNotesHint =
    '예) 08:00~17:00, 1명, 작업 후 계좌 지급';
const magamHiringPhoneHelper =
    '구직자가 전화·문자할 번호 · 다음 글쓰기 때 자동 입력';

/// 도급 글쓰기 — 특이사항
const magamSubcontractSpecialNotesHint =
    '예) 엘리베이터 없음, 주차 가능, 반려동물 있음';

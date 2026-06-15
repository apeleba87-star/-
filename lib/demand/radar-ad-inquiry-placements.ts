/** 광고 문의 페이지 — 직거래 배너 노출 지면 (공개용) */

export type RadarAdInquiryPlacementScope = "national" | "regional";

export type RadarAdInquiryWireBlock = {
  kind: "chrome" | "ad";
  label: string;
  /** kind=ad 일 때 전국/지역 구분 */
  scope?: RadarAdInquiryPlacementScope;
};

export type RadarAdInquirySurface = {
  id: string;
  productLabel: string;
  pageLabel: string;
  pagePath: string;
  previewHref: string;
  audienceNote: string;
  wireframe: RadarAdInquiryWireBlock[];
};

export const RADAR_AD_INQUIRY_SURFACES: RadarAdInquirySurface[] = [
  {
    id: "demand",
    productLabel: "입주레이더",
    pageLabel: "입주·거래 허브",
    pagePath: "/",
    previewHref: "/?r=seoul:jongno-gu",
    audienceNote: "입주 수요·실거래·검색량을 보는 청소·용역 업계 방문자",
    wireframe: [
      { kind: "chrome", label: "전국 일일 펄스" },
      { kind: "ad", scope: "national", label: "전국 직거래 배너" },
      { kind: "chrome", label: "지역 찾기" },
      { kind: "chrome", label: "지표 요약 · 비교 카드" },
      { kind: "ad", scope: "regional", label: "지역 직거래 배너" },
      { kind: "chrome", label: "지표 그래프 · 표" },
    ],
  },
  {
    id: "jobs_public_list",
    productLabel: "청소·용역 채용",
    pageLabel: "채용 공고 목록",
    pagePath: "/jobs/public",
    previewHref: "/jobs/public",
    audienceNote: "지역·업종별 채용 공고를 찾는 방문자",
    wireframe: [
      { kind: "chrome", label: "지역 · 공고 수 안내" },
      { kind: "ad", scope: "national", label: "전국 직거래 배너" },
      { kind: "ad", scope: "regional", label: "지역 직거래 배너" },
      { kind: "chrome", label: "채용 공고 목록" },
    ],
  },
  {
    id: "jobs_public_detail",
    productLabel: "청소·용역 채용",
    pageLabel: "채용 공고 상세",
    pagePath: "/jobs/public/[id]",
    previewHref: "/jobs/public",
    audienceNote: "특정 공고를 읽고 지원을 검토하는 방문자",
    wireframe: [
      { kind: "chrome", label: "공고명 · 급여 · 지역" },
      { kind: "chrome", label: "지원 전 확인 사항" },
      { kind: "ad", scope: "regional", label: "지역 직거래 배너" },
      { kind: "chrome", label: "지원 CTA (고용24)" },
      { kind: "ad", scope: "national", label: "전국 직거래 배너" },
      { kind: "chrome", label: "같은 지역 다른 공고" },
    ],
  },
  {
    id: "job_wage",
    productLabel: "일당 리포트",
    pageLabel: "일당 시장 스냅샷",
    pagePath: "/job-market-report/[date]",
    previewHref: "/job-market-report",
    audienceNote: "일당·시장 흐름을 확인하는 방문자",
    wireframe: [
      { kind: "chrome", label: "대표 직종 · 시·도 요약" },
      { kind: "ad", scope: "national", label: "전국 직거래 배너" },
      { kind: "chrome", label: "시·도별 지도 · 표" },
    ],
  },
  {
    id: "magam_home",
    productLabel: "마감앱",
    pageLabel: "내 공고",
    pagePath: "magam://home",
    previewHref: "/admin/radar-ads/manage",
    audienceNote: "도급·구인 공고를 올리는 청소·용역 사업자",
    wireframe: [
      { kind: "chrome", label: "계정 · 내 공고 목록" },
      { kind: "ad", scope: "national", label: "전국 직거래 배너" },
      { kind: "chrome", label: "공고 카드 · 글쓰기 FAB" },
    ],
  },
  {
    id: "magam_compose",
    productLabel: "마감앱",
    pageLabel: "글쓰기",
    pagePath: "magam://compose",
    previewHref: "/admin/radar-ads/manage",
    audienceNote: "공고 작성 중 — 지역을 고르는 단계",
    wireframe: [
      { kind: "ad", scope: "national", label: "전국 직거래 배너" },
      { kind: "chrome", label: "도급/구인 · 일정 · 어디(지역)" },
      { kind: "ad", scope: "regional", label: "지역 직거래 배너" },
      { kind: "chrome", label: "작업 · 금액 · 등록" },
    ],
  },
  {
    id: "magam_share",
    productLabel: "마감앱",
    pageLabel: "모집 안내 · 공유",
    pagePath: "magam://listing/[id]",
    previewHref: "/admin/radar-ads/manage",
    audienceNote: "등록 직후 카톡·카페 공유 · 마감",
    wireframe: [
      { kind: "chrome", label: "공고 미리보기" },
      { kind: "ad", scope: "regional", label: "지역 직거래 배너" },
      { kind: "chrome", label: "카톡 · 카페 · 링크 복사" },
      { kind: "ad", scope: "national", label: "전국 직거래 배너" },
      { kind: "chrome", label: "모집 마감하기" },
    ],
  },
];

export const RADAR_AD_INQUIRY_SCOPE_SUMMARY = {
  national: {
    title: "전국 배너",
    description:
      "아래 화면에 동일한 전국 캠페인이 노출됩니다. 지역 선택과 관계없이 모든 방문자에게 보입니다.",
    bullet: "브랜드 인지 · 전국 단위 홍보에 적합",
  },
  regional: {
    title: "지역 배너",
    description:
      "계약한 시·도 또는 구를 조회·선택한 사용자에게만 노출됩니다. 입주레이더·채용에서 지역이 맞을 때 나갑니다.",
    bullet: "해당 지역 관심자 타깃 · 전환 의도가 높은 자리",
  },
} as const;

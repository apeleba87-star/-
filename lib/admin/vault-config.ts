/**
 * 숨김(보관) 기능 — 코드는 유지, 일반 메뉴·비용 cron만 중지.
 * @see docs/freeze-delete-checklist.md
 */

export type VaultLink = {
  href: string;
  label: string;
  description: string;
};

/** 관리자 화면 — 보관함에서만 진입 */
export const VAULT_ADMIN_LINKS: VaultLink[] = [
  {
    href: "/admin/radar-ads",
    label: "입주레이더 광고",
    description: "레이더 배너·대시보드 (공개 /demand 는 301)",
  },
  {
    href: "/admin/magam-listings",
    label: "마감링크 공고",
    description: "마감앱 공고 신고·강제 마감",
  },
  {
    href: "/admin/magam-stats",
    label: "마감앱 통계",
    description: "마감앱 사용자·광고 성과",
  },
  {
    href: "/admin/newsletter",
    label: "뉴스레터 큐·발송",
    description: "미사용 큐 — 발송 재개 전에만 사용",
  },
  {
    href: "/admin/ugc",
    label: "UGC 검수",
    description: "현장공유 검수",
  },
  {
    href: "/admin/share-unlocks",
    label: "공유 열람권 로그",
    description: "공유 링크 열람 기록",
  },
  {
    href: "/admin/job-wage-report",
    label: "일당 리포트",
    description: "일당 리포트 수동 입력 (cron 중지됨)",
  },
  {
    href: "/admin/naver-trend-keywords",
    label: "네이버 트렌드",
    description: "마케팅 트렌드 키워드 (cron 중지됨)",
  },
  {
    href: "/admin/open-data-ingest",
    label: "데이터 수집 (이사·RTMS·워크넷)",
    description: "수동 실행 — 비용 주의. demand cron은 중지됨",
  },
  {
    href: "/admin/listings/external",
    label: "현장거래 등록(외부)",
    description: "현장 마켓 외부 등록",
  },
  {
    href: "/admin/jobs/external",
    label: "인력구인 등록(외부)",
    description: "인력 센터 외부 등록",
  },
  {
    href: "/admin/listings/deal-completions",
    label: "거래 완료 신고",
    description: "현장거래 완료 신고",
  },
  {
    href: "/admin/job-reports",
    label: "노쇼 신고",
    description: "일자리 노쇼 신고",
  },
  {
    href: "/admin/partners",
    label: "협력센터 관리",
    description: "협력 업체·포트폴리오",
  },
];

/** 공개 URL — 메뉴·sitemap 제외, 직접 접근 시 홈/서비스로 리다이렉트 */
export const VAULT_PUBLIC_PREVIEWS: VaultLink[] = [
  { href: "/demand", label: "입주레이더", description: "301 → /services/move-in" },
  { href: "/move", label: "이사검색", description: "301 → /services/move-in" },
  { href: "/advertise", label: "광고 문의", description: "302 → / (숨김)" },
  { href: "/magam", label: "마감앱", description: "302 → / (숨김, /p 공유 포함)" },
  { href: "/listings", label: "현장 마켓", description: "302 → / (숨김)" },
  { href: "/jobs", label: "인력 센터", description: "302 → / (숨김)" },
  { href: "/jobs/public", label: "채용 공고", description: "302 → / (숨김)" },
  { href: "/partners", label: "협력 센터", description: "302 → / (숨김)" },
  { href: "/marketing-report", label: "마케팅 리포트", description: "302 → / · cron 중지" },
  { href: "/job-market-report", label: "일당 리포트", description: "302 → / · cron 중지" },
  { href: "/archive", label: "뉴스레터 아카이브", description: "302 → /" },
  { href: "/ugc", label: "UGC 현장공유", description: "302 → /" },
  { href: "/industry-news", label: "업계소식", description: "302 → /" },
  { href: "/facilities", label: "시설 허브", description: "302 → /" },
  { href: "/cleanidex", label: "클린아이덱스 SaaS 웹", description: "301 → /" },
  { href: "/news", label: "데이터랩(/news)", description: "301 → /services" },
];

/** vercel.json에서 뺀 비용 cron — 보관함 안내용 */
export const VAULT_PAUSED_CRONS: { path: string; note: string }[] = [
  { path: "/api/cron/ingest-demand-keywords", note: "입주레이더 키워드" },
  { path: "/api/cron/ingest-demand-rtms-seoul", note: "RTMS" },
  { path: "/api/cron/ingest-demand-searchad", note: "검색광고" },
  { path: "/api/cron/generate-demand-sales-report", note: "demand 매출 리포트" },
  { path: "/api/cron/generate-move-rtms-seo", note: "이사 SEO" },
  { path: "/api/cron/job-wage-daily-report", note: "일당 리포트" },
  { path: "/api/cron/naver-trend-report", note: "마케팅 트렌드" },
  { path: "/api/cron/sync-worknet-jobs", note: "워크넷" },
  { path: "/api/cron/cleanidex-purge-trashed-contracts", note: "SaaS 계약 휴지통" },
];

/** 유지 중인 cron (참고) */
export const VAULT_ACTIVE_CRONS_NOTE = [
  "fetch-g2b — 나라장터 입찰 수집 (유지)",
  "generate-content — 입찰 일간 리포트 자동 발행 (당분간 매일 유지)",
  "generate-award-report — 낙찰 리포트 자동 발행 (당분간 매일 유지)",
  "publish-scheduled-edu-blog — 예약 글 재검증 (10분 → 30분으로 완화)",
  "process-subscriptions — AI 구독",
  "purge-old-notifications — 알림 정리",
] as const;

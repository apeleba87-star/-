export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
};

export type AdminHub = {
  id: string;
  label: string;
  href: string;
  description: string;
  items: AdminNavItem[];
};

export const ADMIN_HUBS: AdminHub[] = [
  {
    id: "content",
    label: "콘텐츠·리포트",
    href: "/admin/content",
    description: "글, 뉴스레터, UGC, 자동 생성·리포트 스냅샷",
    items: [
      { href: "/admin/posts", label: "글 관리", description: "블로그·리포트 글 작성·수정" },
      { href: "/admin/knowledge-hub", label: "지식 허브 콘텐츠", description: "가이드·제품·재질·레시피 전체 목록·편집" },
      { href: "/admin/newsletter", label: "뉴스레터 큐·발송", description: "큐 관리 및 발송" },
      { href: "/admin/ugc", label: "UGC 검수", description: "사용자 제출 콘텐츠 검수" },
      { href: "/admin/content-runs", label: "자동 생성 로그", description: "AI 자동 생성 실행 기록" },
      { href: "/admin/report-snapshots", label: "리포트 스냅샷", description: "리포트 발행 스냅샷" },
    ],
  },
  {
    id: "moderation",
    label: "검수·신고",
    href: "/admin/moderation",
    description: "콘텐츠 신고 및 노쇼 신고 처리",
    items: [
      { href: "/admin/reports", label: "신고", description: "콘텐츠·댓글 신고 검토" },
      { href: "/admin/magam-listings", label: "마감링크 공고", description: "공고 신고·강제 마감·이용 정지" },
      { href: "/admin/job-reports", label: "노쇼 신고", description: "일자리 노쇼 신고 처리" },
    ],
  },
  {
    id: "monetization",
    label: "광고·구독",
    href: "/admin/monetization",
    description: "광고 슬롯, 입주레이더 광고, 구독·열람권",
    items: [
      { href: "/admin/ads", label: "광고 슬롯", description: "홈·입찰·낙찰 광고 슬롯" },
      { href: "/admin/radar-ads", label: "입주레이더 광고", description: "광고 대시보드·배너 A·B 관리" },
      { href: "/admin/magam-stats", label: "마감앱 통계", description: "마감앱 사용자·광고 성과(기간별)" },
      { href: "/admin/subscriptions", label: "구독 관리", description: "프리미엄 구독자 목록" },
      { href: "/admin/subscription-config", label: "구독 금액", description: "요금·프로모 설정" },
      { href: "/admin/share-unlocks", label: "공유 열람권 로그", description: "공유 링크 열람 기록" },
      { href: "/admin/beta-applications", label: "베타 지원", description: "베타 신청 검토" },
    ],
  },
  {
    id: "data",
    label: "데이터·수집",
    href: "/admin/data",
    description: "나라장터·공공데이터 수집, 입찰·트렌드·리포트 소스",
    items: [
      { href: "/admin/g2b-ingest", label: "나라장터 입찰 수집", description: "G2B 입찰 공고 수동·Cron 수집" },
      { href: "/admin/scsbid-award-ingest", label: "낙찰(용역) 원천", description: "조달청 낙찰 데이터 수집" },
      { href: "/admin/tender-keywords", label: "입찰 키워드", description: "입찰 검색 키워드 관리" },
      { href: "/admin/open-data-ingest", label: "데이터 수집", description: "이사검색·RTMS·키워드·워크넷 수동 실행" },
      { href: "/admin/naver-trend-keywords", label: "네이버 트렌드", description: "트렌드 키워드·엑셀 업로드" },
      { href: "/admin/job-wage-report", label: "일당 리포트", description: "일당 리포트 수동 입력" },
    ],
  },
  {
    id: "operations",
    label: "현장·협력",
    href: "/admin/operations",
    description: "현장거래·채용 외부 등록, 협력센터",
    items: [
      { href: "/admin/listings/external", label: "현장거래 등록(외부)", description: "외부 현장거래 일괄·개별 등록" },
      { href: "/admin/jobs/external", label: "인력구인 등록(외부)", description: "외부 채용 공고 등록" },
      { href: "/admin/listings/deal-completions", label: "거래 완료 신고", description: "거래 완료 신고 확인" },
      { href: "/admin/partners", label: "협력센터 관리", description: "협력 업체·포트폴리오" },
    ],
  },
  {
    id: "settings",
    label: "설정",
    href: "/admin/settings",
    description: "사용자, 카테고리, 업종, 견적 단가",
    items: [
      { href: "/admin/users", label: "사용자", description: "회원 목록·역할" },
      { href: "/admin/categories", label: "카테고리", description: "콘텐츠 카테고리" },
      { href: "/admin/industries", label: "업종 관리", description: "업종 마스터 데이터" },
      { href: "/admin/estimate-config", label: "견적 단가", description: "견적 계산 단가 설정" },
    ],
  },
];

const ALL_ITEM_HREFS = ADMIN_HUBS.flatMap((hub) => hub.items.map((item) => item.href));

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function pathMatches(pathname: string, href: string): boolean {
  const path = normalizePath(pathname);
  const target = normalizePath(href.split("?")[0] ?? href);
  if (path === target) return true;
  if (target !== "/admin" && path.startsWith(`${target}/`)) return true;
  return false;
}

export function getAdminHubForPath(pathname: string): AdminHub | null {
  const path = normalizePath(pathname);
  if (path === "/admin") return null;

  for (const hub of ADMIN_HUBS) {
    if (path === hub.href || path.startsWith(`${hub.href}/`)) return hub;
    for (const item of hub.items) {
      if (pathMatches(path, item.href)) return hub;
    }
  }
  return null;
}

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  return pathMatches(pathname, href);
}

export function isAdminHubActive(pathname: string, hub: AdminHub): boolean {
  const active = getAdminHubForPath(pathname);
  return active?.id === hub.id;
}

export function findAdminNavItem(pathname: string): AdminNavItem | null {
  const path = normalizePath(pathname);
  for (const hub of ADMIN_HUBS) {
    for (const item of hub.items) {
      if (pathMatches(path, item.href)) return item;
    }
  }
  return null;
}

/** Legacy paths that should still resolve under a hub */
export function isKnownAdminPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/admin") return true;
  if (getAdminHubForPath(path)) return true;
  return ALL_ITEM_HREFS.some((href) => pathMatches(path, href));
}

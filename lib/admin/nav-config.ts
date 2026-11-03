import { VAULT_ADMIN_LINKS } from "@/lib/admin/vault-config";

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
    description: "검색어 가이드, 지식 허브, 청소지식·실무",
    items: [
      {
        href: "/admin/solutions",
        label: "검색어 솔루션",
        description: "장소·부위 검색어 페이지 목록·편집·새로 만들기",
      },
      {
        href: "/admin/places",
        label: "장소별 청소 방법",
        description: "장소 → 할 일 · 루틴·동선 매뉴얼",
      },
      {
        href: "/admin/materials",
        label: "재질별 표면 안전",
        description: "금기·권장·일상 관리 가이드 편집",
      },
      {
        href: "/admin/knowledge-hub",
        label: "지식 허브 (마스터)",
        description: "제품 판매 링크·마스터 조회·가이드 편집 링크",
      },
      {
        href: "/admin/product-sales-clicks",
        label: "구매하기 클릭",
        description: "제품별·기간별 구매 CTA 클릭 수",
      },
      {
        href: "/admin/equipment",
        label: "청소장비",
        description: "장비 마스터 조회 · 대표 이미지 업로드",
      },
      {
        href: "/admin/blog",
        label: "청소지식",
        description: "직접 작성 · 다음 글·제품 연결 · /blog 발행",
      },
      {
        href: "/admin/practice",
        label: "청소업 실무",
        description: "칸(메뉴) 관리 · 실무 글 작성·수정·삭제 · /practice 발행",
      },
      { href: "/admin/posts", label: "글 관리", description: "블로그·리포트 글 작성·수정" },
      {
        href: "/admin/questions",
        label: "질문 게시판",
        description: "태그 지정 · 삭제 · 계정 정지",
      },
      { href: "/admin/content-runs", label: "자동 생성 로그", description: "AI 자동 생성 실행 기록" },
      { href: "/admin/report-snapshots", label: "리포트 스냅샷", description: "리포트 발행 스냅샷" },
    ],
  },
  {
    id: "moderation",
    label: "검수·신고",
    href: "/admin/moderation",
    description: "콘텐츠·질문 신고",
    items: [
      { href: "/admin/reports", label: "신고", description: "콘텐츠·댓글 신고 검토" },
      {
        href: "/admin/questions",
        label: "질문 게시판",
        description: "태그 지정 · 스팸 삭제 · 작성 정지",
      },
    ],
  },
  {
    id: "monetization",
    label: "광고·구독",
    href: "/admin/monetization",
    description: "광고 슬롯, AI·프리미엄 구독",
    items: [
      { href: "/admin/ads", label: "광고 슬롯", description: "입찰·낙찰·견적 등 광고 슬롯" },
      { href: "/admin/subscriptions", label: "구독 관리", description: "프리미엄 구독자 목록" },
      { href: "/admin/subscription-config", label: "구독 금액", description: "요금·프로모 설정" },
      { href: "/admin/ai-blog-billing", label: "AI 블로그 결제", description: "체험·프로모·정상가" },
      { href: "/admin/product-sales-clicks", label: "구매하기 클릭", description: "제품 구매 CTA 클릭 집계" },
      { href: "/admin/beta-applications", label: "베타 지원", description: "베타 신청 검토" },
    ],
  },
  {
    id: "data",
    label: "데이터·수집",
    href: "/admin/data",
    description: "나라장터·낙찰 수집 (입찰 전용)",
    items: [
      { href: "/admin/g2b-ingest", label: "나라장터 입찰 수집", description: "G2B 입찰 공고 수동·Cron 수집" },
      { href: "/admin/scsbid-award-ingest", label: "낙찰(용역) 원천", description: "조달청 낙찰 데이터 수집" },
      { href: "/admin/tender-keywords", label: "입찰 키워드", description: "입찰 검색 키워드 관리" },
    ],
  },
  {
    id: "operations",
    label: "문의·견적",
    href: "/admin/operations",
    description: "견적 문의 응대",
    items: [
      {
        href: "/admin/cleaning-inquiries",
        label: "견적 문의",
        description: "정기·입주 청소 견적 문의",
      },
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
  {
    id: "vault",
    label: "보관함 (숨김 기능)",
    href: "/admin/vault",
    description: "비용 cron 중지·메뉴 숨김 기능 — 코드는 유지",
    items: VAULT_ADMIN_LINKS,
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

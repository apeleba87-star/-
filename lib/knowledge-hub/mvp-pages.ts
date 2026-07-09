/**
 * 지식 허브 Phase 0 — MVP 페이지 레지스트리
 * @see docs/knowledge-hub-phase0-scope.md
 */

export type GuideType = "service_method" | "service_supplies" | "problem";

export type CleaningFrequency = "recurring" | "one_time";

export type InquiryType = "regular" | "move_in" | "none";

export type MvpPageDef = {
  /** service slug (problem형은 guide slug와 동일하게 사용) */
  serviceSlug: string;
  guideType: GuideType;
  /** URL path without domain */
  path: string;
  h1: string;
  seoTitle: string;
  frequency: CleaningFrequency;
  inquiryType: InquiryType;
  /** Phase 1 세로 슬라이스 우선 구현 */
  phase1Priority: boolean;
  indexable: boolean;
};

function serviceMethodPath(slug: string): string {
  return `/services/${slug}`;
}

function serviceSuppliesPath(slug: string): string {
  return `/services/${slug}/supplies`;
}

/** MVP 8페이지 (방법 4 + supplies 4) */
export const KNOWLEDGE_HUB_MVP_PAGES: readonly MvpPageDef[] = [
  {
    serviceSlug: "office-regular",
    guideType: "service_method",
    path: serviceMethodPath("office-regular"),
    h1: "사무실 정기청소 방법",
    seoTitle: "사무실 정기청소 방법 | 클린아이덱스",
    frequency: "recurring",
    inquiryType: "regular",
    phase1Priority: true,
    indexable: true,
  },
  {
    serviceSlug: "office-regular",
    guideType: "service_supplies",
    path: serviceSuppliesPath("office-regular"),
    h1: "사무실 정기청소에 필요한 약품·장비",
    seoTitle: "사무실 정기청소 약품·장비 | 클린아이덱스",
    frequency: "recurring",
    inquiryType: "regular",
    phase1Priority: false,
    indexable: true,
  },
  {
    serviceSlug: "commercial-regular",
    guideType: "service_method",
    path: serviceMethodPath("commercial-regular"),
    h1: "상가 청소 방법",
    seoTitle: "상가 청소 방법 | 클린아이덱스",
    frequency: "recurring",
    inquiryType: "regular",
    phase1Priority: false,
    indexable: true,
  },
  {
    serviceSlug: "commercial-regular",
    guideType: "service_supplies",
    path: serviceSuppliesPath("commercial-regular"),
    h1: "상가 청소에 필요한 약품·장비",
    seoTitle: "상가 청소 약품·장비 | 클린아이덱스",
    frequency: "recurring",
    inquiryType: "regular",
    phase1Priority: false,
    indexable: true,
  },
  {
    serviceSlug: "stairs-regular",
    guideType: "service_method",
    path: serviceMethodPath("stairs-regular"),
    h1: "계단 청소 방법",
    seoTitle: "계단 청소 방법 | 클린아이덱스",
    frequency: "recurring",
    inquiryType: "regular",
    phase1Priority: false,
    indexable: true,
  },
  {
    serviceSlug: "stairs-regular",
    guideType: "service_supplies",
    path: serviceSuppliesPath("stairs-regular"),
    h1: "계단 청소에 필요한 약품·장비",
    seoTitle: "계단 청소 약품·장비 | 클린아이덱스",
    frequency: "recurring",
    inquiryType: "regular",
    phase1Priority: false,
    indexable: true,
  },
  {
    serviceSlug: "move-in",
    guideType: "service_method",
    path: serviceMethodPath("move-in"),
    h1: "입주청소 방법·순서",
    seoTitle: "입주청소 방법·순서 | 클린아이덱스",
    frequency: "one_time",
    inquiryType: "move_in",
    phase1Priority: false,
    indexable: true,
  },
  {
    serviceSlug: "move-in",
    guideType: "service_supplies",
    path: serviceSuppliesPath("move-in"),
    h1: "입주청소 준비물·약품",
    seoTitle: "입주청소 준비물·약품 | 클린아이덱스",
    frequency: "one_time",
    inquiryType: "move_in",
    phase1Priority: false,
    indexable: true,
  },
] as const;

export type CleaningServiceSlug = (typeof KNOWLEDGE_HUB_MVP_PAGES)[number]["serviceSlug"];

/** 고유 서비스 slug (4종) */
export const KNOWLEDGE_HUB_MVP_SERVICES = [
  {
    slug: "office-regular",
    name: "사무실 정기청소",
    frequency: "recurring" as const,
    inquiryType: "regular" as const,
  },
  {
    slug: "commercial-regular",
    name: "상가 청소",
    frequency: "recurring" as const,
    inquiryType: "regular" as const,
  },
  {
    slug: "stairs-regular",
    name: "계단 청소",
    frequency: "recurring" as const,
    inquiryType: "regular" as const,
  },
  {
    slug: "move-in",
    name: "입주청소",
    frequency: "one_time" as const,
    inquiryType: "move_in" as const,
  },
] as const;

/** Phase 2+ 예약 slug (MVP 미포함) */
export const KNOWLEDGE_HUB_RESERVED_SERVICE_SLUGS = [
  "apartment-common",
  "move-out",
  "renovation",
  "factory-regular",
] as const;

export function getMvpPageByPath(path: string): MvpPageDef | undefined {
  return KNOWLEDGE_HUB_MVP_PAGES.find((p) => p.path === path);
}

export function getPhase1SlicePage(): MvpPageDef {
  const page = KNOWLEDGE_HUB_MVP_PAGES.find((p) => p.phase1Priority);
  if (!page) {
    throw new Error("Phase 1 slice page not defined in MVP registry");
  }
  return page;
}

export function inquiryPathForType(type: InquiryType): string | null {
  if (type === "regular") return "/inquiry/regular";
  if (type === "move_in") return "/inquiry/move-in";
  return null;
}

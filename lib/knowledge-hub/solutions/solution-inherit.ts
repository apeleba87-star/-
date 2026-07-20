import type { SolutionDetailBody, SolutionPage } from "@/lib/knowledge-hub/solutions/types";

const PLACE_NAME_PREFIX =
  /^(가정집|상가|식당|카페|미용실|사무실|병원|헬스장|학원|학교|공중|어린이시설)(\s+|$)/u;

/** 「한줄로 보면」앞에 장소·공간을 붙임 — 예: 미용실 화장실 거울에 … */
export function summaryWithPlace(
  summary: string,
  placeLabel: string,
  spaceLabel: string
): string {
  let body = summary.trim();
  if (!body) return body;

  const prefix = `${placeLabel} ${spaceLabel}`;
  if (body.startsWith(`${prefix} `) || body === prefix) return body;

  // 다른 장소명으로 시작하면 벗겨 냄
  if (PLACE_NAME_PREFIX.test(body)) {
    body = body.replace(PLACE_NAME_PREFIX, "").trim();
  }

  // 앞에 남은 공간 라벨 제거 (화장실·욕실 / 화장실 등)
  for (const label of [spaceLabel, "화장실·욕실", "화장실"]) {
    if (body.startsWith(`${label} `)) {
      body = body.slice(label.length).trim();
      break;
    }
    if (body.startsWith(label) && body.length > label.length) {
      const next = body[label.length];
      if (next && /[은는이가을를의에]/.test(next)) {
        // "화장실은 공간이…" → "미용실 화장실은…"
        return `${placeLabel} ${body}`;
      }
    }
  }

  if (body.startsWith(`${prefix} `) || body === prefix) return body;
  return `${prefix} ${body}`;
}

/** 같은 공간·부위·슬러그일 때 상세를 빌려올 장소 우선순위 */
const PLACE_TEMPLATE_PRIORITY = [
  "home",
  "shop",
  "restaurant",
  "cafe",
  "salon",
  "office",
  "hospital",
  "gym",
  "academy",
] as const;

function normSpace(spaceId: string): string {
  if (spaceId === "bathroom") return "restroom";
  return spaceId;
}

export function detailRichness(d?: SolutionDetailBody | null): number {
  if (!d) return 0;
  return (
    (d.summary?.trim() ? 2 : 0) +
    (d.difficulty ? 1 : 0) +
    (d.locations?.length ?? 0) +
    (d.recommendations?.length ?? 0) * 2 +
    (d.methodSteps?.length ?? 0) * 2 +
    (d.cautions?.length ?? 0) +
    (d.ifFails?.length ?? 0)
  );
}

/** 비어 있는 필드만 템플릿으로 채움 (이미 있는 값은 유지) */
export function coalesceDetail(
  primary?: SolutionDetailBody | null,
  fallback?: SolutionDetailBody | null
): SolutionDetailBody | undefined {
  if (!primary && !fallback) return undefined;
  if (!fallback) return primary ?? undefined;
  if (!primary) return fallback;
  return {
    summary: primary.summary?.trim() || fallback.summary,
    difficulty: primary.difficulty ?? fallback.difficulty,
    locations: primary.locations?.length ? primary.locations : fallback.locations,
    recommendations: primary.recommendations?.length
      ? primary.recommendations
      : fallback.recommendations,
    methodSteps: primary.methodSteps?.length ? primary.methodSteps : fallback.methodSteps,
    cautions: primary.cautions?.length ? primary.cautions : fallback.cautions,
    ifFails: primary.ifFails?.length ? primary.ifFails : fallback.ifFails,
  };
}

export function sameSolutionSlot(a: SolutionPage, b: SolutionPage): boolean {
  return (
    normSpace(a.spaceId) === normSpace(b.spaceId) &&
    a.partId === b.partId &&
    a.slug === b.slug
  );
}

/**
 * 같은 공간·부위·슬러그인 다른 장소 페이지 중
 * 상세가 가장 풍부한 것을 고름 (가정집·상가 우선).
 */
export function findDetailTemplate(
  pages: SolutionPage[],
  target: SolutionPage
): SolutionPage | undefined {
  const candidates = pages.filter(
    (p) => p.id !== target.id && sameSolutionSlot(p, target) && detailRichness(p.detail) > 0
  );
  if (!candidates.length) return undefined;

  candidates.sort((a, b) => {
    const byRich = detailRichness(b.detail) - detailRichness(a.detail);
    if (byRich !== 0) return byRich;
    const ai = PLACE_TEMPLATE_PRIORITY.indexOf(a.placeId as (typeof PLACE_TEMPLATE_PRIORITY)[number]);
    const bi = PLACE_TEMPLATE_PRIORITY.indexOf(b.placeId as (typeof PLACE_TEMPLATE_PRIORITY)[number]);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  return candidates[0];
}

/** 페이지 상세·제품이 비면 다른 장소 템플릿으로 보강 */
export function enrichPageFromSiblings<T extends SolutionPage>(
  page: T,
  pages: SolutionPage[]
): T & { inheritedFromPlaceId?: string } {
  const template = findDetailTemplate(pages, page);
  if (!template) return page;

  const ownRich = detailRichness(page.detail);
  const tplRich = detailRichness(template.detail);
  if (tplRich <= ownRich && page.productIds?.length) return page;

  const detail = coalesceDetail(page.detail, template.detail);
  const productIds = page.productIds?.length ? page.productIds : template.productIds;
  const inherited =
    detailRichness(detail) > ownRich || (!page.productIds?.length && template.productIds?.length);

  if (!inherited) return page;

  return {
    ...page,
    detail,
    productIds,
    inheritedFromPlaceId: template.placeId,
  };
}

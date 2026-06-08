import { DEMAND_DAILY_NATIONAL_KEYWORDS } from "@/lib/demand/dummy-daily";
import { DEMAND_TOP10, getDemandDistrictBySlug } from "@/lib/demand/dummy-data";
import { demandRegionSeoPath } from "@/lib/demand/region-seo-path";
import { SEOUL_GU_NAMES, guNameToSlug, guSlugToName } from "@/lib/demand/slugs";

export type DemandSearchResultType = "district" | "keyword";

export type DemandSearchResult = {
  type: DemandSearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  hasDetail: boolean;
};

const KEYWORDS = [
  ...DEMAND_DAILY_NATIONAL_KEYWORDS.map((k) => k.name),
  "이사청소",
  "줄눈",
  "탄성코팅",
] as const;

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

function guAliases(gu: string): string[] {
  const base = gu.replace(/구$/, "");
  return [gu, base, base.toLowerCase(), gu.toLowerCase()];
}

function scoreGu(query: string, gu: string): number {
  const q = normalizeQuery(query);
  if (!q) return 0;
  const aliases = guAliases(gu).map((a) => a.toLowerCase().replace(/\s+/g, ""));
  for (const a of aliases) {
    if (a === q) return 100;
    if (a.startsWith(q) || q.startsWith(a.replace(/구$/, ""))) return 80;
    if (a.includes(q) || q.includes(a.replace(/구$/, ""))) return 50;
  }
  return 0;
}

function scoreKeyword(query: string, kw: string): number {
  const q = normalizeQuery(query);
  const k = kw.toLowerCase().replace(/\s+/g, "");
  if (!q) return 0;
  if (k === q) return 90;
  if (k.startsWith(q) || q.startsWith(k)) return 70;
  if (k.includes(q)) return 45;
  return 0;
}

export function searchDemand(query: string, limit = 12): DemandSearchResult[] {
  const q = query.trim();
  if (q.length < 1) return [];

  const out: DemandSearchResult[] = [];

  for (const gu of SEOUL_GU_NAMES) {
    const score = scoreGu(q, gu);
    if (score <= 0) continue;
    const slug = guNameToSlug(gu);
    if (!slug) continue;
    const district = getDemandDistrictBySlug(slug);
    const inTop = DEMAND_TOP10.some((d) => d.slug === slug);
    out.push({
      type: "district",
      id: `gu-${slug}`,
      title: gu,
      subtitle: district
        ? inTop
          ? `입주 온도 ${district.indexScore} · 서울 ${district.rank}위`
          : "데이터 준비 중"
        : "서울",
      href: demandRegionSeoPath("seoul", slug),
      score,
      hasDetail: !!district,
    });
  }

  const seenKw = new Set<string>();
  for (const kw of KEYWORDS) {
    if (seenKw.has(kw)) continue;
    const score = scoreKeyword(q, kw);
    if (score <= 0) continue;
    seenKw.add(kw);
    out.push({
      type: "keyword",
      id: `kw-${kw}`,
      title: kw,
      subtitle: "전국 검색 트렌드",
      href: `/demand/keyword`,
      score,
      hasDetail: true,
    });
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

/** Enter 키 시 바로 이동할 단일 결과 */
export function pickDemandSearchNavigate(
  query: string,
  results: DemandSearchResult[]
): string | null {
  if (results.length === 0) return null;
  const top = results[0]!;
  if (top.score >= 80) return top.href;
  if (results.length === 1) return top.href;
  return `/demand/search?q=${encodeURIComponent(query.trim())}`;
}

import { CATALOG_TOPICS, getCategory, type CatalogTopic } from "@/lib/knowledge-hub/catalog";

export type GuideSearchResult = {
  path: string;
  h1: string;
  categoryName: string;
  categorySlug: string;
  guideType: CatalogTopic["guideType"];
  snippet: string;
  score: number;
};

export type PopularGuideQuery = {
  label: string;
  /** 직접 링크 (있으면 검색 대신 이동) */
  path?: string;
  /** 검색어 (path 없을 때) */
  query?: string;
};

export const POPULAR_GUIDE_QUERIES: readonly PopularGuideQuery[] = [
  { label: "입주청소 순서", path: "/services/move-in/overview" },
  { label: "욕실 곰팡이", path: "/guides/mold-tile" },
  { label: "가스레인지 기름때", path: "/guides/oil-range" },
  { label: "사무실 화장실", path: "/services/office-regular/restroom" },
  { label: "유리 물때", path: "/guides/water-glass" },
  { label: "입주 욕실 청소", path: "/services/move-in/bathroom" },
  { label: "카페 바닥 청소", path: "/services/commercial-regular/cafe" },
  { label: "청소 약품", query: "약품" },
  { label: "실리콘 곰팡이", path: "/guides/mold-silicone" },
  { label: "계단 청소", path: "/services/stairs-regular/overview" },
  { label: "보양 테이프 제거", path: "/services/move-in/tape" },
  { label: "욕실 냄새", path: "/guides/bathroom-odor" },
] as const;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/[\s,·]+/)
    .filter((t) => t.length >= 1);
}

function scoreTopic(topic: CatalogTopic, tokens: string[]): number {
  if (!tokens.length) return 0;

  const category = getCategory(topic.categorySlug);
  const haystacks: { text: string; weight: number }[] = [
    { text: topic.h1, weight: 12 },
    { text: topic.focus, weight: 10 },
    { text: topic.seoDescription, weight: 6 },
    { text: topic.seoTitle, weight: 5 },
    { text: category?.name ?? "", weight: 8 },
    { text: category?.description ?? "", weight: 4 },
    { text: topic.topicSlug.replace(/-/g, " "), weight: 3 },
  ];

  const normalizedQuery = normalize(tokens.join(" "));
  let score = 0;

  for (const { text, weight } of haystacks) {
    const norm = normalize(text);
    if (!norm) continue;
    if (norm.includes(normalizedQuery)) score += weight * 3;
    for (const token of tokens) {
      if (norm.includes(token)) score += weight;
    }
  }

  if (topic.guideType === "service_supplies" && tokens.some((t) => ["약품", "장비", "용품", "준비물", "세제"].includes(t))) {
    score += 8;
  }
  if (topic.guideType === "problem" && tokens.some((t) => ["곰팡이", "기름", "물때", "얼룩", "제거", "냄새"].includes(t))) {
    score += 6;
  }

  return score;
}

export function searchGuides(query: string, limit = 12): GuideSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = tokenize(trimmed);
  const results: GuideSearchResult[] = [];

  for (const topic of CATALOG_TOPICS) {
    const score = scoreTopic(topic, tokens);
    if (score <= 0) continue;
    const category = getCategory(topic.categorySlug);
    results.push({
      path: topic.path,
      h1: topic.h1,
      categoryName: category?.name ?? topic.categorySlug,
      categorySlug: topic.categorySlug,
      guideType: topic.guideType,
      snippet: topic.seoDescription || topic.focus,
      score,
    });
  }

  return results
    .sort((a, b) => b.score - a.score || a.h1.localeCompare(b.h1, "ko"))
    .slice(0, limit);
}

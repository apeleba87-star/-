import { CATALOG_TOPICS, type CatalogTopic } from "@/lib/knowledge-hub/catalog";

type CrossLinkRule = {
  test: RegExp;
  topicSlug: string;
};

const RULES: CrossLinkRule[] = [
  { test: /곰팡이|실리콘/, topicSlug: "mold-tile" },
  { test: /실리콘/, topicSlug: "mold-silicone" },
  { test: /기름|후드|가스레인지/, topicSlug: "oil-range" },
  { test: /스테인리스|싱크/, topicSlug: "oil-stainless" },
  { test: /물때|샤워|거울/, topicSlug: "water-glass" },
  { test: /수전|크롬|석회/, topicSlug: "water-faucet" },
  { test: /카펫|러그/, topicSlug: "carpet-stain" },
  { test: /대리석/, topicSlug: "marble-care" },
  { test: /원목|합판/, topicSlug: "wood-floor" },
  { test: /냄새|하수구/, topicSlug: "bathroom-odor" },
];

/** 서비스 가이드 본문·제목에서 연관 오염 가이드 추천 */
export function getPollutionCrossLinks(text: string, excludePath?: string): CatalogTopic[] {
  const seen = new Set<string>();
  const results: CatalogTopic[] = [];

  for (const rule of RULES) {
    if (!rule.test.test(text)) continue;
    const topic = CATALOG_TOPICS.find((t) => t.categorySlug === "pollution" && t.topicSlug === rule.topicSlug);
    if (!topic || topic.path === excludePath || seen.has(topic.path)) continue;
    seen.add(topic.path);
    results.push(topic);
  }

  return results.slice(0, 4);
}

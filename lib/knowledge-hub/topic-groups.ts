import type { CatalogTopic } from "@/lib/knowledge-hub/catalog";

export type TopicGroup = {
  id: string;
  title: string;
  topics: CatalogTopic[];
};

const GROUP_ORDER = [
  "start",
  "restroom",
  "kitchen",
  "floor",
  "glass",
  "space",
  "mold",
  "oil",
  "water",
  "stain",
  "safety",
  "supplies",
  "other",
] as const;

type GroupId = (typeof GROUP_ORDER)[number];

function classifyTopic(topic: CatalogTopic): GroupId {
  if (topic.topicSlug === "overview" || topic.h1.includes("총정리")) return "start";
  if (topic.guideType === "service_supplies") return "supplies";

  const text = `${topic.h1} ${topic.focus} ${topic.topicSlug}`;

  if (topic.guideType === "problem") {
    if (/곰팡이|실리콘/.test(text)) return "mold";
    if (/기름/.test(text)) return "oil";
    if (/물때|수전|석회/.test(text)) return "water";
    if (/얼룩|냄새|대리석|원목/.test(text)) return "stain";
    return "other";
  }

  if (/화장실|욕실/.test(text)) return "restroom";
  if (/주방|싱크|가스|탕비|음식점|카페/.test(text)) return "kitchen";
  if (/바닥|디딤|참판|계단/.test(text) && !/난간/.test(text)) return "floor";
  if (/유리|창문|샷시/.test(text)) return "glass";
  if (/안전|주기|야간|체크|먼지|테이프|베란다|로비|회의|책상|난간|코너/.test(text)) return "space";

  return "other";
}

const GROUP_TITLES: Record<GroupId, string> = {
  start: "시작하기",
  restroom: "화장실·욕실",
  kitchen: "주방·식당",
  floor: "바닥·계단",
  glass: "창문·유리",
  space: "구역별 방법",
  mold: "곰팡이 제거",
  oil: "기름때 제거",
  water: "물때·석회 제거",
  stain: "얼룩·냄새·재질 관리",
  safety: "안전·주기",
  supplies: "약품·장비",
  other: "기타",
};

export function groupTopicsBySection(topics: CatalogTopic[]): TopicGroup[] {
  const buckets = new Map<GroupId, CatalogTopic[]>();

  for (const topic of topics) {
    const id = classifyTopic(topic);
    const list = buckets.get(id) ?? [];
    list.push(topic);
    buckets.set(id, list);
  }

  return GROUP_ORDER.filter((id) => buckets.has(id)).map((id) => ({
    id,
    title: GROUP_TITLES[id],
    topics: buckets.get(id)!,
  }));
}

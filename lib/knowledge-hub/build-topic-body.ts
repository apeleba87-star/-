/** @deprecated 지식 DB(generate-from-db)로 대체됨 */
import type { CatalogTopic } from "@/lib/knowledge-hub/catalog";
import { generateGuideBodyForTopic } from "@/lib/knowledge-hub/generate-from-db";
import type { GuideBodyJson } from "@/lib/knowledge-hub/types";

export function buildTopicBody(topic: CatalogTopic): GuideBodyJson {
  return generateGuideBodyForTopic(topic);
}

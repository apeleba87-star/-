import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import type { KnowledgeMediaEntityType } from "@/lib/knowledge-hub/media/constants";

export type KnowledgeMediaRow = {
  entity_type: KnowledgeMediaEntityType;
  entity_id: string;
  role: string;
  url: string;
  thumb_url: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export const KNOWLEDGE_MEDIA_CACHE_TAG = "knowledge-media";
const REVALIDATE_SEC = 3600;

async function loadMediaMap(
  entityType: KnowledgeMediaEntityType
): Promise<Record<string, KnowledgeMediaRow>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("knowledge_media")
      .select("entity_type, entity_id, role, url, thumb_url, alt, width, height")
      .eq("entity_type", entityType)
      .eq("role", "cover");
    if (error || !data) return {};
    const map: Record<string, KnowledgeMediaRow> = {};
    for (const row of data) {
      if (!row.entity_id || !row.url) continue;
      map[row.entity_id] = row as KnowledgeMediaRow;
    }
    return map;
  } catch {
    return {};
  }
}

export function getKnowledgeMediaMap(
  entityType: KnowledgeMediaEntityType
): Promise<Record<string, KnowledgeMediaRow>> {
  return unstable_cache(
    () => loadMediaMap(entityType),
    [`knowledge-media-map-${entityType}`],
    { revalidate: REVALIDATE_SEC, tags: [KNOWLEDGE_MEDIA_CACHE_TAG] }
  )();
}

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { KNOWLEDGE_MEDIA_CACHE_TAG } from "@/lib/knowledge-hub/media/media-store";
import type { ProductBeforeAfterPair } from "@/lib/knowledge-hub/media/product-before-after-types";

export type { ProductBeforeAfterPair } from "@/lib/knowledge-hub/media/product-before-after-types";

const EMPTY: ProductBeforeAfterPair = {
  beforeUrl: null,
  afterUrl: null,
  beforeCaption: null,
  afterCaption: null,
  beforeFocalX: 50,
  beforeFocalY: 50,
  afterFocalX: 50,
  afterFocalY: 50,
};

type MediaRow = {
  role: string;
  url: string;
  alt: string | null;
  focal_x?: number | null;
  focal_y?: number | null;
};

function focal(v: number | null | undefined): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 50;
  return Math.min(100, Math.max(0, v));
}

function mapRows(rows: MediaRow[]): ProductBeforeAfterPair {
  const out = { ...EMPTY };
  for (const row of rows) {
    if (row.role === "before" && row.url) {
      out.beforeUrl = row.url;
      out.beforeCaption = row.alt;
      out.beforeFocalX = focal(row.focal_x);
      out.beforeFocalY = focal(row.focal_y);
    }
    if (row.role === "after" && row.url) {
      out.afterUrl = row.url;
      out.afterCaption = row.alt;
      out.afterFocalX = focal(row.focal_x);
      out.afterFocalY = focal(row.focal_y);
    }
  }
  return out;
}

async function loadProductBeforeAfter(productId: string): Promise<ProductBeforeAfterPair> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("knowledge_media")
      .select("role, url, alt, focal_x, focal_y")
      .eq("entity_type", "product")
      .eq("entity_id", productId)
      .in("role", ["before", "after"]);
    if (error || !data) {
      // focal 컬럼 미적용 환경 폴백
      const fallback = await supabase
        .from("knowledge_media")
        .select("role, url, alt")
        .eq("entity_type", "product")
        .eq("entity_id", productId)
        .in("role", ["before", "after"]);
      if (fallback.error || !fallback.data) return EMPTY;
      return mapRows(fallback.data as MediaRow[]);
    }
    return mapRows(data as MediaRow[]);
  } catch {
    return EMPTY;
  }
}

export function getProductBeforeAfter(productId: string): Promise<ProductBeforeAfterPair> {
  return unstable_cache(
    () => loadProductBeforeAfter(productId),
    [`product-before-after-${productId}`],
    { revalidate: 3600, tags: [KNOWLEDGE_MEDIA_CACHE_TAG] }
  )();
}

export async function getProductBeforeAfterMap(
  productIds: string[]
): Promise<Record<string, ProductBeforeAfterPair>> {
  if (!productIds.length) return {};
  try {
    const supabase = createClient();
    let data: MediaRow[] | null = null;
    const withFocal = await supabase
      .from("knowledge_media")
      .select("entity_id, role, url, alt, focal_x, focal_y")
      .eq("entity_type", "product")
      .in("entity_id", productIds)
      .in("role", ["before", "after"]);
    if (!withFocal.error && withFocal.data) {
      data = withFocal.data as MediaRow[];
    } else {
      const fallback = await supabase
        .from("knowledge_media")
        .select("entity_id, role, url, alt")
        .eq("entity_type", "product")
        .in("entity_id", productIds)
        .in("role", ["before", "after"]);
      if (fallback.error || !fallback.data) return {};
      data = fallback.data as MediaRow[];
    }

    const map: Record<string, ProductBeforeAfterPair> = {};
    for (const id of productIds) map[id] = { ...EMPTY };
    for (const row of data) {
      const id = (row as MediaRow & { entity_id?: string }).entity_id as string;
      if (!map[id]) map[id] = { ...EMPTY };
      if (row.role === "before" && row.url) {
        map[id]!.beforeUrl = row.url;
        map[id]!.beforeCaption = row.alt ?? null;
        map[id]!.beforeFocalX = focal(row.focal_x);
        map[id]!.beforeFocalY = focal(row.focal_y);
      }
      if (row.role === "after" && row.url) {
        map[id]!.afterUrl = row.url;
        map[id]!.afterCaption = row.alt ?? null;
        map[id]!.afterFocalX = focal(row.focal_x);
        map[id]!.afterFocalY = focal(row.focal_y);
      }
    }
    return map;
  } catch {
    return {};
  }
}

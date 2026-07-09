import { createClient } from "@/lib/supabase-server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getSeedGuideByPath, SEED_GUIDES, type SeedGuide } from "@/lib/knowledge-hub/seed-guides";
import { CATALOG_TOPICS } from "@/lib/knowledge-hub/catalog";
import type { CleaningGuideWithProducts, GuideBodyJson, KnowledgeProductRow } from "@/lib/knowledge-hub/types";

function rowToGuide(
  row: Record<string, unknown>,
  products: KnowledgeProductRow[]
): CleaningGuideWithProducts {
  return {
    id: String(row.id),
    guide_type: row.guide_type as CleaningGuideWithProducts["guide_type"],
    service_slug: String(row.service_slug),
    slug: String(row.slug),
    path: String(row.path),
    h1: String(row.h1),
    seo_title: String(row.seo_title),
    seo_description: String(row.seo_description ?? ""),
    body_json: row.body_json as GuideBodyJson,
    indexable: Boolean(row.indexable),
    published_at: row.published_at ? String(row.published_at) : null,
    updated_at: String(row.updated_at ?? row.created_at),
    products,
  };
}

function seedToGuide(seed: SeedGuide, published: boolean): CleaningGuideWithProducts {
  const now = new Date().toISOString();
  return {
    id: `seed-${seed.slug}`,
    guide_type: seed.guide_type,
    service_slug: seed.service_slug,
    slug: seed.slug,
    path: seed.path,
    h1: seed.h1,
    seo_title: seed.seo_title,
    seo_description: seed.seo_description,
    body_json: seed.body_json,
    indexable: seed.indexable,
    published_at: published ? now : null,
    updated_at: now,
    products: seed.products.map((p) => ({
      id: p.id,
      guide_id: `seed-${seed.slug}`,
      block_id: "products",
      display_name: p.display_name,
      source_type: p.source_type,
      source_url: p.source_url,
      coupang_keyword: p.coupang_keyword ?? null,
      image_url: null,
      price_text: null,
      sort_order: p.sort_order,
      is_primary: p.is_primary,
    })),
  };
}

export async function getGuideByPath(path: string): Promise<CleaningGuideWithProducts | null> {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("cleaning_guides")
    .select("*")
    .eq("path", path)
    .maybeSingle();

  if (row) {
    const { data: products } = await supabase
      .from("knowledge_products")
      .select("*")
      .eq("guide_id", row.id)
      .order("sort_order", { ascending: true });
    return rowToGuide(row as Record<string, unknown>, (products ?? []) as KnowledgeProductRow[]);
  }

  const seed = getSeedGuideByPath(path);
  if (!seed) return null;
  return seedToGuide(seed, true);
}

export async function listPublishedGuidePaths(): Promise<{ path: string; updated_at: string }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("cleaning_guides")
    .select("path, updated_at, published_at, indexable")
    .not("published_at", "is", null)
    .eq("indexable", true);

  if (data?.length) {
    return data.map((r) => ({
      path: String(r.path),
      updated_at: String(r.updated_at ?? r.published_at),
    }));
  }

  return CATALOG_TOPICS.filter((g) => g.indexable).map((g) => ({
    path: g.path,
    updated_at: new Date().toISOString(),
  }));
}

export async function getProductById(id: string): Promise<KnowledgeProductRow | null> {
  const supabase = createClient();
  const { data } = await supabase.from("knowledge_products").select("*").eq("id", id).maybeSingle();
  if (data) return data as KnowledgeProductRow;

  for (const seed of SEED_GUIDES) {
    const p = seed.products.find((x) => x.id === id);
    if (p) {
      return {
        id: p.id,
        guide_id: `seed-${seed.slug}`,
        block_id: "products",
        display_name: p.display_name,
        source_type: p.source_type,
        source_url: p.source_url,
        coupang_keyword: p.coupang_keyword ?? null,
        image_url: null,
        price_text: null,
        sort_order: p.sort_order,
        is_primary: p.is_primary,
      };
    }
  }
  return null;
}

export async function updateGuideBlock(
  slug: string,
  blockId: string,
  patch: Record<string, unknown>,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const service = createServiceSupabase();
  const { data: row } = await service.from("cleaning_guides").select("body_json").eq("slug", slug).single();
  if (!row) return { ok: false, error: "가이드를 찾을 수 없습니다." };

  const body = row.body_json as GuideBodyJson;
  let nextBody: GuideBodyJson;

  if (blockId === "_intro" && typeof patch.text === "string") {
    nextBody = { ...body, intro: patch.text };
  } else {
    const blocks = body.blocks.map((b) => {
      if (b.id !== blockId) return b;
      return { ...b, ...patch } as typeof b;
    });
    nextBody = { ...body, blocks };
  }

  const { error } = await service
    .from("cleaning_guides")
    .update({ body_json: nextBody, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateGuideProduct(
  productId: string,
  patch: Partial<KnowledgeProductRow>,
  _userId: string
): Promise<{ ok: boolean; error?: string }> {
  const service = createServiceSupabase();
  const { error } = await service
    .from("knowledge_products")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function isOperator(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return profile?.role === "admin" || profile?.role === "editor";
}

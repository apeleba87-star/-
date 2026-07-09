import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { SEED_GUIDES } from "@/lib/knowledge-hub/seed-guides";

async function requireOperator() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다.", status: 401 };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, error: "권한이 없습니다.", status: 403 };
  }
  return { ok: true as const };
}

export async function POST() {
  const auth = await requireOperator();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const service = createServiceSupabase();
  const now = new Date().toISOString();
  let count = 0;

  for (const g of SEED_GUIDES) {
    const { data: existing } = await service.from("cleaning_guides").select("id").eq("slug", g.slug).maybeSingle();

    let guideId = existing?.id as string | undefined;
    if (guideId) {
      await service
        .from("cleaning_guides")
        .update({
          body_json: g.body_json,
          h1: g.h1,
          seo_title: g.seo_title,
          seo_description: g.seo_description,
          published_at: now,
          updated_at: now,
        })
        .eq("id", guideId);
    } else {
      const { data: inserted, error } = await service
        .from("cleaning_guides")
        .insert({
          guide_type: g.guide_type,
          service_slug: g.service_slug,
          slug: g.slug,
          path: g.path,
          h1: g.h1,
          seo_title: g.seo_title,
          seo_description: g.seo_description,
          body_json: g.body_json,
          indexable: g.indexable,
          published_at: now,
        })
        .select("id")
        .single();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      guideId = inserted.id;
    }

    if (!guideId) continue;
    await service.from("knowledge_products").delete().eq("guide_id", guideId);
    for (const p of g.products) {
      await service.from("knowledge_products").insert({
        guide_id: guideId,
        block_id: "products",
        display_name: p.display_name,
        source_type: p.source_type,
        source_url: p.source_url,
        coupang_keyword: p.coupang_keyword ?? null,
        sort_order: p.sort_order,
        is_primary: p.is_primary,
      });
    }
    count++;
  }

  return NextResponse.json({ ok: true, count });
}

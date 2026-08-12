import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { KNOWLEDGE_MEDIA_CACHE_TAG } from "@/lib/knowledge-hub/media/media-store";
import { PRODUCT_CATALOG_CACHE_TAG } from "@/lib/knowledge-hub/product-catalog";
import type { KnowledgeMediaEntityType, KnowledgeMediaRole } from "@/lib/knowledge-hub/media/constants";

async function requireEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { user, supabase };
}

function clampFocal(v: unknown): number | undefined {
  if (typeof v !== "number" || Number.isNaN(v)) return undefined;
  return Math.min(100, Math.max(0, Math.round(v * 10) / 10));
}

export async function PUT(req: Request) {
  const auth = await requireEditor();
  if ("error" in auth && auth.error) return auth.error;
  const { supabase } = auth;

  const body = (await req.json()) as {
    entity_type?: KnowledgeMediaEntityType;
    entity_id?: string;
    role?: KnowledgeMediaRole;
    alt?: string | null;
    focal_x?: number;
    focal_y?: number;
  };

  const entityType = body.entity_type;
  const entityId = body.entity_id?.trim();
  const role = body.role;

  if (!entityType || !entityId || (role !== "before" && role !== "after")) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data: existing, error: findError } = await supabase
    .from("knowledge_media")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("role", role)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ ok: false, error: findError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: "먼저 사진을 업로드하세요." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if ("alt" in body) patch.alt = body.alt?.trim() || null;
  const fx = clampFocal(body.focal_x);
  const fy = clampFocal(body.focal_y);
  if (fx !== undefined) patch.focal_x = fx;
  if (fy !== undefined) patch.focal_y = fy;

  const { error } = await supabase.from("knowledge_media").update(patch).eq("id", existing.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  revalidateTag(KNOWLEDGE_MEDIA_CACHE_TAG, { expire: 0 });
  if (entityType === "product") {
    revalidateTag(PRODUCT_CATALOG_CACHE_TAG, { expire: 0 });
    revalidatePath("/products");
    revalidatePath(`/products/${encodeURIComponent(entityId)}`);
    revalidatePath("/admin/knowledge-hub");
  }

  return NextResponse.json({ ok: true });
}

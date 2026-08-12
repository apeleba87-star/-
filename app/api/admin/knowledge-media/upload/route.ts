import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  KNOWLEDGE_MEDIA_ALLOWED_MIME,
  KNOWLEDGE_MEDIA_BUCKET,
  KNOWLEDGE_MEDIA_MAX_BYTES,
  type KnowledgeMediaEntityType,
  type KnowledgeMediaRole,
} from "@/lib/knowledge-hub/media/constants";
import { makeKnowledgeMediaVariants } from "@/lib/knowledge-hub/media/process-image";
import { KNOWLEDGE_MEDIA_CACHE_TAG } from "@/lib/knowledge-hub/media/media-store";
import { PRODUCT_CATALOG_CACHE_TAG } from "@/lib/knowledge-hub/product-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENTITY_TYPES = new Set<KnowledgeMediaEntityType>([
  "product",
  "equipment",
  "edu_blog",
  "guide",
]);

function slugifyEntityId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "업로드 본문을 읽지 못했습니다." }, { status: 413 });
  }

  const entityType = String(form.get("entity_type") ?? "").trim() as KnowledgeMediaEntityType;
  const entityId = String(form.get("entity_id") ?? "").trim();
  const role = (String(form.get("role") ?? "cover").trim() || "cover") as KnowledgeMediaRole;
  const alt = String(form.get("alt") ?? "").trim() || null;
  const file = form.get("file");

  if (!ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ ok: false, error: "entity_type이 올바르지 않습니다." }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ ok: false, error: "entity_id가 필요합니다." }, { status: 400 });
  }
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ ok: false, error: "이미지 파일을 선택해 주세요." }, { status: 400 });
  }
  if (file.size > KNOWLEDGE_MEDIA_MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "파일이 너무 큽니다. (최대 8MB)" }, { status: 400 });
  }
  const mime = file.type || "application/octet-stream";
  if (!KNOWLEDGE_MEDIA_ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ ok: false, error: "JPEG·PNG·WebP·GIF만 가능합니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let display: Buffer;
  let thumb: Buffer;
  let width: number;
  let height: number;
  try {
    ({ display, thumb, width, height } = await makeKnowledgeMediaVariants(buffer));
  } catch {
    return NextResponse.json({ ok: false, error: "이미지 변환에 실패했습니다." }, { status: 400 });
  }

  const safeId = slugifyEntityId(entityId) || "item";
  const stamp = crypto.randomBytes(4).toString("hex");
  const basePath = `${entityType}/${safeId}/${Date.now()}-${stamp}`;
  const displayPath = `${basePath}-d.webp`;
  const thumbPath = `${basePath}-t.webp`;

  const upDisplay = await supabase.storage.from(KNOWLEDGE_MEDIA_BUCKET).upload(displayPath, display, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (upDisplay.error) {
    return NextResponse.json({ ok: false, error: upDisplay.error.message }, { status: 500 });
  }
  const upThumb = await supabase.storage.from(KNOWLEDGE_MEDIA_BUCKET).upload(thumbPath, thumb, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (upThumb.error) {
    return NextResponse.json({ ok: false, error: upThumb.error.message }, { status: 500 });
  }

  const { data: displayUrl } = supabase.storage.from(KNOWLEDGE_MEDIA_BUCKET).getPublicUrl(displayPath);
  const { data: thumbUrl } = supabase.storage.from(KNOWLEDGE_MEDIA_BUCKET).getPublicUrl(thumbPath);

  const seoAlt =
    alt ||
    (entityType === "product"
      ? `${entityId} 세정 제품`
      : entityType === "equipment"
        ? `${entityId} 청소장비`
        : entityType === "edu_blog"
          ? "청소지식 이미지"
          : entityId);

  if (role === "cover" || role === "before" || role === "after") {
    await supabase
      .from("knowledge_media")
      .delete()
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("role", role);
  }

  const insertPayload: Record<string, unknown> = {
    entity_type: entityType,
    entity_id: entityId,
    role,
    url: displayUrl.publicUrl,
    thumb_url: thumbUrl.publicUrl,
    alt: seoAlt,
    width,
    height,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };
  if (role === "before" || role === "after") {
    insertPayload.focal_x = 50;
    insertPayload.focal_y = 50;
  }

  const { data: row, error: insertError } = await supabase
    .from("knowledge_media")
    .insert(insertPayload)
    .select("id, url, thumb_url, alt, width, height")
    .maybeSingle();

  // 인라인(본문) 이미지는 Storage URL만 있어도 본문에 삽입 가능 — 메타 테이블 미적용이어도 업로드는 성공 처리
  if (insertError && (role === "cover" || role === "before" || role === "after")) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }
  if (insertError && role !== "cover" && role !== "before" && role !== "after") {
    console.warn("[knowledge-media] meta insert skipped:", insertError.message);
  }

  revalidateTag(KNOWLEDGE_MEDIA_CACHE_TAG, { expire: 0 });
  if (entityType === "product") {
    revalidateTag(PRODUCT_CATALOG_CACHE_TAG, { expire: 0 });
    revalidatePath("/products");
    revalidatePath(`/products/${encodeURIComponent(entityId)}`);
    revalidatePath("/admin/knowledge-hub");
  }
  if (entityType === "equipment") {
    revalidatePath("/equipment");
    revalidatePath(`/equipment/${encodeURIComponent(entityId)}`);
    revalidatePath("/admin/equipment");
  }
  if (entityType === "edu_blog") {
    revalidatePath("/blog");
    revalidatePath("/admin/blog");
  }

  return NextResponse.json({
    ok: true,
    media: row ?? null,
    url: displayUrl.publicUrl,
    thumb_url: thumbUrl.publicUrl,
    meta_saved: !insertError,
  });
}

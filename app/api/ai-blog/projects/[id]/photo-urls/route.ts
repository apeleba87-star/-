import { NextRequest, NextResponse } from "next/server";
import { FIELD_PHOTO_BUCKET, purgeExpiredOriginals } from "@/lib/ai-blog/field-photos";
import { isUuid, jsonError, requireAiAdmin } from "@/lib/ai-blog/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type MediaRow = {
  id: string;
  media_type: string;
  preview_path: string | null;
  storage_path: string | null;
  original_expires_at: string | null;
};

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("invalid_id");
  const guard = await requireAiAdmin();
  if (!guard.ok) return guard.response;

  const supabase = guard.supabase as unknown as SupabaseClient;
  await purgeExpiredOriginals(supabase, id);

  const { data: project } = await guard.supabase
    .schema("cleanidex")
    .from("projects")
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!project) return jsonError("project_not_found", 404);

  const { data, error } = await guard.supabase
    .schema("cleanidex")
    .from("project_media")
    .select("id, media_type, preview_path, storage_path, original_expires_at")
    .eq("project_id", id);
  if (error) return jsonError(error.message);

  const items = [];
  for (const row of (data ?? []) as MediaRow[]) {
    const preview = row.preview_path;
    const original = row.storage_path;
    const path = preview || original;
    let url: string | null = null;
    let originalUrl: string | null = null;
    if (path) {
      const signed = await supabase.storage.from(FIELD_PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
      url = signed.data?.signedUrl ?? null;
    }
    if (original) {
      const signed = await supabase.storage.from(FIELD_PHOTO_BUCKET).createSignedUrl(original, 60 * 60);
      originalUrl = signed.data?.signedUrl ?? null;
    }
    items.push({
      id: row.id,
      mediaType: row.media_type,
      url,
      originalUrl,
      originalAvailable: Boolean(original),
      expiresAt: row.original_expires_at,
    });
  }
  return NextResponse.json({ ok: true, data: items });
}

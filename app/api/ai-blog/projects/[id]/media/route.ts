import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  MEDIA_SELECT,
  PAIR_SELECT,
  cleanText,
  isUuid,
  jsonError,
  nullableInt,
  nullableText,
  requireAiAdmin,
} from "@/lib/ai-blog/server";
import type { MediaType } from "@/lib/ai-blog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MEDIA = 80;
const MAX_PAIRS = 40;
const MEDIA_TYPES = new Set<MediaType>(["BEFORE", "AFTER", "PROCESS", "OTHER"]);

type Params = { params: Promise<{ id: string }> };

function isoOrNull(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * 사진 정렬 저장 (전체 교체). 사진 바이너리는 받지 않는다 — 파일명·크기·순서·짝 정보만.
 * body: { media: [{ key, id?, media_type, local_name, ... }], pairs: [{ id?, label, memo, before, after }] }
 * pairs.before/after 는 media[].key 를 가리킨다.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params;
  if (!isUuid(projectId)) return jsonError("invalid_id");
  const guard = await requireAiAdmin();
  if (!guard.ok) return guard.response;
  const { supabase, ctx } = guard;

  let body: { media?: unknown; pairs?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("invalid_json_body");
  }
  if (!Array.isArray(body.media) || !Array.isArray(body.pairs)) return jsonError("media_and_pairs_required");
  if (body.media.length > MAX_MEDIA) return jsonError("too_many_media");
  if (body.pairs.length > MAX_PAIRS) return jsonError("too_many_pairs");

  const db = supabase.schema("cleanidex");
  const { data: project } = await db
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!project) return jsonError("project_not_found", 404);

  const [{ data: existingMedia }, { data: existingPairs }] = await Promise.all([
    db.from("project_media").select("id").eq("project_id", projectId),
    db.from("media_pairs").select("id").eq("project_id", projectId),
  ]);
  const mediaIds = new Set((existingMedia ?? []).map((r) => r.id as string));
  const pairIds = new Set((existingPairs ?? []).map((r) => r.id as string));

  const keyToId = new Map<string, string>();
  const mediaRows = [];
  for (const [i, raw] of (body.media as Record<string, unknown>[]).entries()) {
    if (!raw || typeof raw !== "object") continue;
    const key = cleanText(raw.key, 200);
    const localName = cleanText(raw.local_name, 255);
    if (!key || !localName || keyToId.has(key)) continue;
    const id = isUuid(raw.id) && mediaIds.has(raw.id) ? raw.id : randomUUID();
    keyToId.set(key, id);
    const type = cleanText(raw.media_type, 10) as MediaType;
    mediaRows.push({
      id,
      project_id: projectId,
      company_id: ctx.companyId,
      media_type: MEDIA_TYPES.has(type) ? type : "OTHER",
      sort_order: i,
      space_type: nullableText(raw.space_type, 30),
      local_name: localName,
      local_size: nullableInt(raw.local_size, 0, Number.MAX_SAFE_INTEGER),
      local_modified_at: isoOrNull(raw.local_modified_at),
      taken_at: isoOrNull(raw.taken_at),
      width: nullableInt(raw.width, 0, 100_000),
      height: nullableInt(raw.height, 0, 100_000),
    });
  }

  const pairRows = [];
  for (const [i, raw] of (body.pairs as Record<string, unknown>[]).entries()) {
    if (!raw || typeof raw !== "object") continue;
    const before = keyToId.get(cleanText(raw.before, 200)) ?? null;
    const after = keyToId.get(cleanText(raw.after, 200)) ?? null;
    pairRows.push({
      id: isUuid(raw.id) && pairIds.has(raw.id) ? raw.id : randomUUID(),
      project_id: projectId,
      company_id: ctx.companyId,
      label: cleanText(raw.label, 50),
      memo: cleanText(raw.memo, 200),
      before_media_id: before,
      after_media_id: after,
      sort_order: i,
    });
  }

  const keepMedia = new Set(mediaRows.map((r) => r.id));
  const keepPairs = new Set(pairRows.map((r) => r.id));
  const removeMedia = [...mediaIds].filter((x) => !keepMedia.has(x));
  const removePairs = [...pairIds].filter((x) => !keepPairs.has(x));

  if (removePairs.length) {
    const { error } = await db.from("media_pairs").delete().in("id", removePairs);
    if (error) return jsonError(error.message);
  }
  if (removeMedia.length) {
    const { error } = await db.from("project_media").delete().in("id", removeMedia);
    if (error) return jsonError(error.message);
  }
  if (mediaRows.length) {
    const { error } = await db.from("project_media").upsert(mediaRows, { onConflict: "id" });
    if (error) return jsonError(error.message);
  }
  if (pairRows.length) {
    const { error } = await db.from("media_pairs").upsert(pairRows, { onConflict: "id" });
    if (error) return jsonError(error.message);
  }

  const [{ data: media }, { data: pairs }] = await Promise.all([
    db.from("project_media").select(MEDIA_SELECT).eq("project_id", projectId).order("sort_order"),
    db.from("media_pairs").select(PAIR_SELECT).eq("project_id", projectId).order("sort_order"),
  ]);
  return NextResponse.json({
    ok: true,
    data: { media: media ?? [], pairs: pairs ?? [], key_map: Object.fromEntries(keyToId) },
  });
}

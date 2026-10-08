import { NextRequest, NextResponse } from "next/server";
import { normalizeUserText } from "@/lib/ai-blog/sanitize";
import { CONTENT_SELECT, cleanText, isUuid, jsonError, requireAiAdmin, textArray } from "@/lib/ai-blog/server";
import type { BlogMode, ContentBlock, ContentStatus } from "@/lib/ai-blog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const STATUSES = new Set<ContentStatus>(["DRAFT", "READY", "DONE", "ARCHIVED"]);
const MAX_BLOCKS = 120;

function parseBlocks(v: unknown): ContentBlock[] | null {
  if (!Array.isArray(v) || v.length > MAX_BLOCKS) return null;
  const out: ContentBlock[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const id = cleanText(r.id, 64);
    if (!id) return null;
    if (r.type === "paragraph") {
      out.push({ id, type: "paragraph", text: normalizeUserText(typeof r.text === "string" ? r.text : "") });
    } else if (r.type === "heading") {
      const text = normalizeUserText(typeof r.text === "string" ? r.text : "", 100).replace(/\n+/g, " ");
      out.push({ id, type: "heading", text });
    } else if (r.type === "image") {
      out.push({
        id,
        type: "image",
        media_id: isUuid(r.media_id) ? r.media_id : null,
        role: r.role === "AFTER" ? "AFTER" : "BEFORE",
        pair_id: isUuid(r.pair_id) ? r.pair_id : null,
      });
    } else {
      return null;
    }
  }
  return out;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("invalid_id");
  const guard = await requireAiAdmin();
  if (!guard.ok) return guard.response;
  const { data } = await guard.supabase
    .schema("cleanidex")
    .from("contents")
    .select(CONTENT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return jsonError("content_not_found", 404);
  return NextResponse.json({ ok: true, data });
}

/** 편집 자동 저장. AI 필드(generation_count 등)는 여기서 바꿀 수 없다. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("invalid_id");
  const guard = await requireAiAdmin();
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_json_body");
  }

  const updates: Record<string, unknown> = {};
  if ("title" in body) updates.title = normalizeUserText(cleanText(body.title, 200), 200);
  if ("keyword" in body) updates.keyword = cleanText(body.keyword, 60);
  if ("secondary_keywords" in body) updates.secondary_keywords = textArray(body.secondary_keywords, 10, 40);
  if ("extra_request" in body) updates.extra_request = cleanText(body.extra_request, 600);
  if ("mode" in body) {
    const m = Number(body.mode);
    if (![1, 2, 3].includes(m)) return jsonError("invalid_mode");
    updates.mode = m as BlogMode;
  }
  if ("status" in body) {
    const s = cleanText(body.status, 10) as ContentStatus;
    if (!STATUSES.has(s)) return jsonError("invalid_status");
    updates.status = s;
  }
  if ("blocks" in body) {
    const blocks = parseBlocks(body.blocks);
    if (!blocks) return jsonError("invalid_blocks");
    updates.blocks = blocks;
  }
  if (!Object.keys(updates).length) return jsonError("nothing_to_update");

  const { data, error } = await guard.supabase
    .schema("cleanidex")
    .from("contents")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null)
    .select(CONTENT_SELECT)
    .maybeSingle();
  if (error) return jsonError(error.message);
  if (!data) return jsonError("content_not_found", 404);
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("invalid_id");
  const guard = await requireAiAdmin();
  if (!guard.ok) return guard.response;
  const { error } = await guard.supabase
    .schema("cleanidex")
    .from("contents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}

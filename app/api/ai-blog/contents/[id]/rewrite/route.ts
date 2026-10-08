import { NextRequest, NextResponse } from "next/server";
import { rewriteParagraph } from "@/lib/ai-blog/generate";
import { LlmError, blogModel } from "@/lib/ai-blog/openai";
import {
  CONTENT_SELECT,
  cleanText,
  isUuid,
  jsonError,
  loadProfile,
  logAiUsage,
  requireAiAdmin,
} from "@/lib/ai-blog/server";
import type { Content, ContentBlock } from "@/lib/ai-blog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

function neighborText(blocks: ContentBlock[], from: number, step: 1 | -1): string | null {
  for (let i = from + step; i >= 0 && i < blocks.length; i += step) {
    const b = blocks[i];
    if (b.type === "paragraph" && b.text.trim()) return b.text;
  }
  return null;
}

/** 문단 하나만 AI 로 다시 쓰기. body: { block_id, hint? } */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("invalid_id");
  const guard = await requireAiAdmin({ requireActive: true });
  if (!guard.ok) return guard.response;
  const { supabase, ctx } = guard;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_json_body");
  }
  const blockId = cleanText(body.block_id, 64);
  const hint = cleanText(body.hint, 200);

  const db = supabase.schema("cleanidex");
  const { data: content } = await db
    .from("contents")
    .select(CONTENT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<Content>();
  if (!content) return jsonError("content_not_found", 404);

  const index = content.blocks.findIndex((b) => b.id === blockId);
  const target = content.blocks[index];
  if (!target || target.type !== "paragraph" || !target.text.trim()) return jsonError("paragraph_not_found", 404);

  const profile = await loadProfile(supabase, ctx.companyId);

  const { data: reserved, error: reserveError } = await supabase
    .rpc("cleanidex_ai_reserve", { p_content_id: id, p_kind: "rewrite" })
    .single<{ ok: boolean; error_code: string | null }>();
  if (reserveError) return jsonError(reserveError.message);
  if (!reserved?.ok) return jsonError(reserved?.error_code ?? "reserve_failed", 409);

  const release = (success: boolean) =>
    supabase.rpc("cleanidex_ai_release", { p_content_id: id, p_kind: "rewrite", p_success: success });

  try {
    const result = await rewriteParagraph({
      title: content.title,
      keyword: content.keyword,
      previous: neighborText(content.blocks, index, -1),
      target: target.text,
      next: neighborText(content.blocks, index, 1),
      hint,
      banned: profile?.banned_phrases ?? [],
    });
    if (!result.text) throw new LlmError("openai_empty", "empty paragraph");

    await db.from("content_versions").insert({
      content_id: id,
      company_id: ctx.companyId,
      title: content.title,
      blocks: content.blocks,
      reason: "AI_PARTIAL",
      created_by: ctx.userId,
    });

    const blocks = content.blocks.map((b) => (b.id === blockId ? { ...b, text: result.text } : b));
    const { data: saved, error: saveError } = await db
      .from("contents")
      .update({ blocks })
      .eq("id", id)
      .select(CONTENT_SELECT)
      .single();
    if (saveError || !saved) throw new LlmError("save_failed", saveError?.message ?? "save failed");

    await release(true);
    await logAiUsage({
      ctx,
      contentId: id,
      feature: "rewrite_partial",
      model: result.llm.model,
      usage: result.llm.usage,
      latencyMs: result.llm.latencyMs,
      status: "success",
    });
    return NextResponse.json({ ok: true, data: saved });
  } catch (e) {
    await release(false);
    const code = e instanceof LlmError ? e.code : "rewrite_failed";
    console.error("[ai-blog] rewrite failed", code, e);
    await logAiUsage({ ctx, contentId: id, feature: "rewrite_partial", model: blogModel(), status: "error", errorCode: code });
    return jsonError(code, 502);
  }
}

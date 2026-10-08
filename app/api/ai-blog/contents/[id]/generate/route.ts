import { NextRequest, NextResponse } from "next/server";
import { generateBlogDraft } from "@/lib/ai-blog/generate";
import { pickRandomMode, pickVariant } from "@/lib/ai-blog/modes";
import { LlmError, blogModel } from "@/lib/ai-blog/openai";
import { PROMPT_VERSION } from "@/lib/ai-blog/prompts";
import {
  CONTENT_SELECT,
  cleanText,
  isUuid,
  jsonError,
  loadProfile,
  loadProjectBundle,
  logAiUsage,
  requireAiAdmin,
  textArray,
} from "@/lib/ai-blog/server";
import type { BlogMode, Content } from "@/lib/ai-blog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Params = { params: Promise<{ id: string }> };

/**
 * AI 초안 생성(최초) / 전체 다시 생성.
 * body: { keyword, secondary_keywords, extra_request, mode: 1|2|3, random: boolean }
 * 한도 차감은 cleanidex_ai_reserve 에서 원자적으로, 실패 시 cleanidex_ai_release 로 환불.
 */
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

  const keyword = cleanText(body.keyword, 60);
  if (!keyword) return jsonError("keyword_required");
  const secondaryKeywords = textArray(body.secondary_keywords, 10, 40);
  const extraRequest = cleanText(body.extra_request, 600);
  const random = body.random === true;

  const db = supabase.schema("cleanidex");
  const { data: content } = await db
    .from("contents")
    .select(CONTENT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<Content>();
  if (!content) return jsonError("content_not_found", 404);

  const profile = await loadProfile(supabase, ctx.companyId);
  if (!profile) return jsonError("business_profile_required", 403);
  const bundle = await loadProjectBundle(supabase, content.project_id);
  if (!bundle) return jsonError("project_not_found", 404);

  const requestedMode = Number(body.mode);
  const mode: BlogMode = random
    ? pickRandomMode(content.mode)
    : ([1, 2, 3].includes(requestedMode) ? requestedMode : (content.mode ?? 1)) as BlogMode;
  const variant = pickVariant(content.variant, random);

  const { data: reserved, error: reserveError } = await supabase
    .rpc("cleanidex_ai_reserve", { p_content_id: id, p_kind: "generation" })
    .single<{ ok: boolean; error_code: string | null; is_first: boolean }>();
  if (reserveError) return jsonError(reserveError.message);
  if (!reserved?.ok) return jsonError(reserved?.error_code ?? "reserve_failed", 409);

  const feature = reserved.is_first ? "generate" : "regenerate";
  const release = (success: boolean) =>
    supabase.rpc("cleanidex_ai_release", { p_content_id: id, p_kind: "generation", p_success: success });

  try {
    const draft = await generateBlogDraft({
      bundle,
      profile,
      keyword,
      secondaryKeywords,
      extraRequest,
      mode,
      variant,
    });

    if (content.blocks.length) {
      await db.from("content_versions").insert({
        content_id: id,
        company_id: ctx.companyId,
        title: content.title,
        blocks: content.blocks,
        reason: "AI_FULL",
        created_by: ctx.userId,
      });
    }

    const { data: saved, error: saveError } = await db
      .from("contents")
      .update({
        keyword,
        secondary_keywords: secondaryKeywords,
        extra_request: extraRequest,
        mode,
        variant,
        title: draft.title,
        title_candidates: draft.titleCandidates,
        blocks: draft.blocks,
        ai_model: draft.llm.model,
        prompt_version: PROMPT_VERSION,
      })
      .eq("id", id)
      .select(CONTENT_SELECT)
      .single();
    if (saveError || !saved) throw new LlmError("save_failed", saveError?.message ?? "save failed");

    await release(true);
    await logAiUsage({
      ctx,
      contentId: id,
      feature,
      model: draft.llm.model,
      usage: draft.llm.usage,
      latencyMs: draft.llm.latencyMs,
      status: "success",
    });
    return NextResponse.json({ ok: true, data: saved });
  } catch (e) {
    await release(false);
    const code = e instanceof LlmError ? e.code : "generation_failed";
    console.error("[ai-blog] generate failed", code, e);
    await logAiUsage({ ctx, contentId: id, feature, model: blogModel(), status: "error", errorCode: code });
    return jsonError(code, 502);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { CONTENT_SELECT, isUuid, jsonError, loadProfile, requireAiAdmin } from "@/lib/ai-blog/server";
import { WRITING_STYLE_TO_MODE } from "@/lib/ai-blog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 현장에서 새 블로그 초안(빈 상태) 생성. AI 생성은 /contents/[id]/generate 에서. */
export async function POST(req: NextRequest) {
  const guard = await requireAiAdmin({ requireActive: true });
  if (!guard.ok) return guard.response;
  const { supabase, ctx } = guard;

  let body: { project_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("invalid_json_body");
  }
  if (!isUuid(body.project_id)) return jsonError("project_id_required");

  const db = supabase.schema("cleanidex");
  const { data: project } = await db
    .from("projects")
    .select("id, service_type, region_sigungu")
    .eq("id", body.project_id)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; service_type: string; region_sigungu: string | null }>();
  if (!project) return jsonError("project_not_found", 404);

  const profile = await loadProfile(supabase, ctx.companyId);
  const keyword = [project.region_sigungu, project.service_type].filter(Boolean).join(" ");

  const { data, error } = await db
    .from("contents")
    .insert({
      company_id: ctx.companyId,
      project_id: project.id,
      channel: "NAVER_BLOG",
      keyword,
      mode: profile ? WRITING_STYLE_TO_MODE[profile.writing_style] : 1,
      created_by: ctx.userId,
    })
    .select(CONTENT_SELECT)
    .single();
  if (error || !data) return jsonError(error?.message ?? "content_create_failed");

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

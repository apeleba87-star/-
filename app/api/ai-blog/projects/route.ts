import { NextRequest, NextResponse } from "next/server";
import { parseAttributes, parseProjectFields } from "@/lib/ai-blog/project-input";
import { PROJECT_SELECT, jsonError, requireAiAdmin } from "@/lib/ai-blog/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireAiAdmin({ requireActive: true });
  if (!guard.ok) return guard.response;
  const { supabase, ctx } = guard;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_json_body");
  }

  const fields = parseProjectFields(body);
  if (!fields.service_type) return jsonError("service_type_required");

  const db = supabase.schema("cleanidex");
  const { data: project, error } = await db
    .from("projects")
    .insert({ ...fields, company_id: ctx.companyId, created_by: ctx.userId })
    .select(PROJECT_SELECT)
    .single();
  if (error || !project) return jsonError(error?.message ?? "project_create_failed");

  const attributes = parseAttributes(body.attributes);
  if (attributes.length) {
    const { error: attrError } = await db
      .from("project_attributes")
      .insert(attributes.map((a) => ({ ...a, project_id: project.id, company_id: ctx.companyId })));
    if (attrError) return jsonError(attrError.message);
  }

  return NextResponse.json({ ok: true, data: project }, { status: 201 });
}

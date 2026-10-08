import { NextRequest, NextResponse } from "next/server";
import { parseAttributes, parseProjectFields } from "@/lib/ai-blog/project-input";
import { PROJECT_SELECT, isUuid, jsonError, loadProjectBundle, requireAiAdmin } from "@/lib/ai-blog/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("invalid_id");
  const guard = await requireAiAdmin();
  if (!guard.ok) return guard.response;
  const bundle = await loadProjectBundle(guard.supabase, id);
  if (!bundle) return jsonError("project_not_found", 404);
  return NextResponse.json({ ok: true, data: bundle });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("invalid_id");
  const guard = await requireAiAdmin();
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
    .update(fields)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PROJECT_SELECT)
    .maybeSingle();
  if (error) return jsonError(error.message);
  if (!project) return jsonError("project_not_found", 404);

  if (Array.isArray(body.attributes)) {
    const attributes = parseAttributes(body.attributes);
    const { error: delError } = await db.from("project_attributes").delete().eq("project_id", id);
    if (delError) return jsonError(delError.message);
    if (attributes.length) {
      const { error: insError } = await db
        .from("project_attributes")
        .insert(attributes.map((a) => ({ ...a, project_id: id, company_id: ctx.companyId })));
      if (insError) return jsonError(insError.message);
    }
  }

  return NextResponse.json({ ok: true, data: project });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("invalid_id");
  const guard = await requireAiAdmin();
  if (!guard.ok) return guard.response;
  const { error } = await guard.supabase
    .schema("cleanidex")
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}

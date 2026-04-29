import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const siteId = req.nextUrl.searchParams.get("site_id")?.trim();
  if (!siteId) return NextResponse.json({ ok: false, error: "site_id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("site_checklist_templates")
    .select("site_id, template_id")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? null });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  let body: { site_id?: string; template_id?: string };
  try {
    body = (await req.json()) as { site_id?: string; template_id?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const siteId = body.site_id?.trim() ?? "";
  const templateId = body.template_id?.trim() ?? "";
  if (!siteId) return NextResponse.json({ ok: false, error: "site_id_required" }, { status: 400 });
  if (!templateId) return NextResponse.json({ ok: false, error: "template_id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("site_checklist_templates")
    .upsert(
      {
        site_id: siteId,
        company_id: context.companyId,
        template_id: templateId,
        updated_by: context.userId,
      },
      { onConflict: "site_id" },
    )
    .select("site_id, template_id")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "site_checklist_template_set",
    targetTable: "site_checklist_templates",
    targetId: siteId,
    metadata: { site_id: siteId, template_id: templateId },
    req,
  });

  return NextResponse.json({ ok: true, data });
}

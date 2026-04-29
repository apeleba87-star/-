import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  let body: { template_id?: string; title?: string; sort_order?: number };
  try {
    body = (await req.json()) as { template_id?: string; title?: string; sort_order?: number };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const templateId = body.template_id?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  if (!templateId) return NextResponse.json({ ok: false, error: "template_id_required" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "title_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("checklist_items")
    .insert({
      company_id: context.companyId,
      template_id: templateId,
      title,
      sort_order: Number.isFinite(body.sort_order) ? body.sort_order : 0,
    })
    .select("id, template_id, title, sort_order")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

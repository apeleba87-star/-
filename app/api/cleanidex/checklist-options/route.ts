import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  let body: { option_set_id?: string; label?: string; sort_order?: number };
  try {
    body = (await req.json()) as { option_set_id?: string; label?: string; sort_order?: number };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const optionSetId = body.option_set_id?.trim() ?? "";
  const label = body.label?.trim() ?? "";
  if (!optionSetId) return NextResponse.json({ ok: false, error: "option_set_id_required" }, { status: 400 });
  if (!label) return NextResponse.json({ ok: false, error: "label_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("checklist_options")
    .insert({
      company_id: context.companyId,
      option_set_id: optionSetId,
      label,
      sort_order: Number.isFinite(body.sort_order) ? body.sort_order : 0,
      is_active: true,
    })
    .select("id, option_set_id, label, sort_order")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

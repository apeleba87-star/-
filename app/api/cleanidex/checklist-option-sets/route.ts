import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("checklist_option_sets")
    .select("id, name")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  let body: { name?: string };
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  if (!name) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("checklist_option_sets")
    .insert({ company_id: context.companyId, name })
    .select("id, name")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateClientBody = {
  name?: string;
  phone?: string;
  email?: string;
};

export async function GET() {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("clients")
    .select("id, name, phone, email, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: CreateClientBody;
  try {
    body = (await req.json()) as CreateClientBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() || null;
  const email = body.email?.trim() || null;
  if (!name) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("clients")
    .insert({
      company_id: context.companyId,
      name,
      phone,
      email,
      created_by: context.userId,
    })
    .select("id, name, phone, email, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "client_created",
    targetTable: "clients",
    targetId: data.id,
    metadata: { name },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

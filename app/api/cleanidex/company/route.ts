import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CompanyRow = {
  id: string;
  name: string;
  display_name: string | null;
  business_number: string | null;
  phone: string | null;
  address: string | null;
  logo_path: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const COMPANY_SELECT =
  "id, name, display_name, business_number, phone, address, logo_path, owner_user_id, created_at, updated_at";

export async function GET() {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("companies")
    .select(COMPANY_SELECT)
    .eq("id", context.companyId)
    .maybeSingle<CompanyRow>();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    data,
    role_code: context.roleCode,
    is_admin: context.roleCode === "admin",
  });
}

type PatchBody = {
  name?: string;
  display_name?: string | null;
  business_number?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_path?: string | null;
};

function trimToNull(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export async function PATCH(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  if (context.roleCode !== "admin") {
    return NextResponse.json({ ok: false, error: "admin_required" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (body.name !== undefined) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    if (!v) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    updates.name = v.slice(0, 200);
  }
  if (body.display_name !== undefined) updates.display_name = trimToNull(body.display_name, 200);
  if (body.business_number !== undefined) updates.business_number = trimToNull(body.business_number, 50);
  if (body.phone !== undefined) updates.phone = trimToNull(body.phone, 50);
  if (body.address !== undefined) updates.address = trimToNull(body.address, 500);
  if (body.logo_path !== undefined) updates.logo_path = trimToNull(body.logo_path, 500);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  // admin 권한을 앱에서 확인했으므로 service_role 로 update.
  const service = createServiceSupabase();
  const { data, error } = await service
    .schema("cleanidex")
    .from("companies")
    .update(updates)
    .eq("id", context.companyId)
    .select(COMPANY_SELECT)
    .single<CompanyRow>();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "company_updated",
    targetTable: "companies",
    targetId: context.companyId,
    metadata: { fields: Object.keys(updates) },
    req,
  });

  return NextResponse.json({ ok: true, data });
}

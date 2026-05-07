import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { fetchAuthEmailsByUserIds, maskEmailForOthers } from "@/lib/cleanidex/member-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  company_id: string;
  display_name: string | null;
  phone: string | null;
  is_active: boolean;
  invited_at: string | null;
  created_at: string;
  updated_at: string;
  role: { code: string | null; name: string | null } | null;
};

const MEMBER_SELECT =
  "id, company_id, display_name, phone, is_active, invited_at, created_at, updated_at, role:roles!inner(code, name)";

export async function GET() {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const isAdmin = context.roleCode === "admin";

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("users")
    .select(MEMBER_SELECT)
    .eq("company_id", context.companyId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const rows = (data ?? []) as unknown as MemberRow[];

  const emailById = new Map<string, string | null>();
  try {
    const service = createServiceSupabase();
    const ids = rows.map((r) => r.id);
    const fetched = await fetchAuthEmailsByUserIds(service, ids);
    for (const [id, em] of fetched) emailById.set(id, em);
  } catch {
    // service role 미설정 등 — 이메일 없이 진행
  }

  const enriched = rows.map((r) => {
    const rawEmail = emailById.get(r.id) ?? null;
    const showFull = isAdmin || r.id === context.userId;
    const email = showFull ? rawEmail : maskEmailForOthers(rawEmail);
    return {
      id: r.id,
      display_name: r.display_name,
      email,
      phone: r.phone,
      role_code: r.role?.code ?? null,
      role_name: r.role?.name ?? null,
      is_active: r.is_active,
      invited_at: r.invited_at,
      created_at: r.created_at,
      is_self: r.id === context.userId,
    };
  });

  return NextResponse.json({
    ok: true,
    data: enriched,
    role_code: context.roleCode,
    is_admin: isAdmin,
  });
}

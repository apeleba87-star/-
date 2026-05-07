import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  display_name?: string | null;
  phone?: string | null;
  role_code?: string;
  is_active?: boolean;
};

const ALLOWED_ROLES = new Set(["admin", "field", "viewer"]);

function trimToNull(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  if (context.roleCode !== "admin") {
    return NextResponse.json({ ok: false, error: "admin_required" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) return NextResponse.json({ ok: false, error: "user_id_required" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const service = createServiceSupabase();

  // 같은 회사의 멤버인지 확인.
  const { data: target, error: targetErr } = await service
    .schema("cleanidex")
    .from("users")
    .select("id, company_id, role_id, is_active, role:roles!inner(code)")
    .eq("id", userId)
    .eq("company_id", context.companyId)
    .maybeSingle<{
      id: string;
      company_id: string;
      role_id: string | null;
      is_active: boolean;
      role: { code: string | null } | null;
    }>();

  if (targetErr) return NextResponse.json({ ok: false, error: targetErr.message }, { status: 400 });
  if (!target) return NextResponse.json({ ok: false, error: "member_not_found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if (body.display_name !== undefined) updates.display_name = trimToNull(body.display_name, 200);
  if (body.phone !== undefined) updates.phone = trimToNull(body.phone, 50);

  let newRoleCode: string | null = null;
  if (body.role_code !== undefined) {
    const code = typeof body.role_code === "string" ? body.role_code.trim() : "";
    if (!ALLOWED_ROLES.has(code)) {
      return NextResponse.json({ ok: false, error: "invalid_role_code" }, { status: 400 });
    }
    newRoleCode = code;
  }

  let newIsActive: boolean | null = null;
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ ok: false, error: "invalid_is_active" }, { status: 400 });
    }
    newIsActive = body.is_active;
  }

  // self lockout 방지: 본인이 자기 권한을 admin 외로 바꾸거나 비활성화 못 하게 막음.
  if (userId === context.userId) {
    if (newRoleCode && newRoleCode !== "admin") {
      return NextResponse.json({ ok: false, error: "self_demote_blocked" }, { status: 400 });
    }
    if (newIsActive === false) {
      return NextResponse.json({ ok: false, error: "self_deactivate_blocked" }, { status: 400 });
    }
  }

  // 마지막 admin 보호: 다른 admin 을 강등/비활성화하기 전에 회사에 admin 1명 이상이 남는지 확인.
  const wasAdmin = target.role?.code === "admin";
  const willLoseAdmin =
    wasAdmin && (newRoleCode && newRoleCode !== "admin" || newIsActive === false);
  if (willLoseAdmin) {
    const { count } = await service
      .schema("cleanidex")
      .from("users")
      .select("id, role:roles!inner(code)", { count: "exact", head: false })
      .eq("company_id", context.companyId)
      .eq("is_active", true)
      .eq("role.code", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ ok: false, error: "last_admin_blocked" }, { status: 400 });
    }
  }

  if (newRoleCode) {
    const { data: roleRow, error: roleErr } = await service
      .schema("cleanidex")
      .from("roles")
      .select("id")
      .eq("code", newRoleCode)
      .maybeSingle<{ id: string }>();
    if (roleErr || !roleRow) {
      return NextResponse.json({ ok: false, error: "role_not_found" }, { status: 400 });
    }
    updates.role_id = roleRow.id;
  }
  if (newIsActive !== null) updates.is_active = newIsActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  const { data, error } = await service
    .schema("cleanidex")
    .from("users")
    .update(updates)
    .eq("id", userId)
    .eq("company_id", context.companyId)
    .select(
      "id, company_id, display_name, phone, is_active, invited_at, created_at, updated_at, role:roles!inner(code, name)"
    )
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "member_updated",
    targetTable: "users",
    targetId: userId,
    metadata: {
      fields: Object.keys(updates),
      role_code_before: target.role?.code ?? null,
      role_code_after: newRoleCode ?? target.role?.code ?? null,
      is_active_before: target.is_active,
      is_active_after: newIsActive ?? target.is_active,
    },
    req,
  });

  return NextResponse.json({ ok: true, data });
}

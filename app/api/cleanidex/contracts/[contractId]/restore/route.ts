import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ contractId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const { contractId } = await ctx.params;
  const id = contractId?.trim() ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "contract_id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: existing, error: loadError } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .select("id, status, deleted_at, deleted_by, deleted_reason")
    .eq("id", id)
    .eq("company_id", context.companyId)
    .maybeSingle();
  if (loadError) return NextResponse.json({ ok: false, error: loadError.message }, { status: 400 });
  if (!existing) return NextResponse.json({ ok: false, error: "contract_not_found" }, { status: 404 });
  if (!existing.deleted_at) return NextResponse.json({ ok: false, error: "not_deleted" }, { status: 409 });

  const { data: updated, error: updateError } = await supabase
    .schema("cleanidex")
    .from("contracts")
    .update({ deleted_at: null, deleted_by: null, deleted_reason: null })
    .eq("id", id)
    .eq("company_id", context.companyId)
    .not("deleted_at", "is", null)
    .select("id, deleted_at")
    .maybeSingle();

  if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  if (!updated) return NextResponse.json({ ok: false, error: "race_or_already_restored" }, { status: 409 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "contract_restored",
    targetTable: "contracts",
    targetId: id,
    metadata: {
      previous_status: existing.status,
      previous_deleted_at: existing.deleted_at,
      previous_deleted_by: existing.deleted_by,
      previous_deleted_reason: existing.deleted_reason,
    },
    req,
  });

  return NextResponse.json({ ok: true, data: updated });
}

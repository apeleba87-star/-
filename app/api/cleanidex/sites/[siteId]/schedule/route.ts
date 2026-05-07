import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";
import { normalizeWeekdays } from "@/lib/cleanidex/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCHEDULE_SELECT =
  "id, site_id, effective_from, cadence, weekly_count, weekdays, notes, created_by, created_at, updated_at";

async function ensureSiteAccessible(siteId: string, companyId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  const { siteId } = await params;
  if (!(await ensureSiteAccessible(siteId, context.companyId))) {
    return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("site_schedule_rules")
    .select(SCHEDULE_SELECT)
    .eq("site_id", siteId)
    .order("effective_from", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, data: data ?? [] });
}

type CreateBody = {
  effective_from?: string;
  cadence?: "weekly_count" | "weekday";
  weekly_count?: number;
  weekdays?: number[];
  notes?: string;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  if (context.roleCode !== "admin") {
    return NextResponse.json({ ok: false, error: "admin_required" }, { status: 403 });
  }
  const { siteId } = await params;
  if (!(await ensureSiteAccessible(siteId, context.companyId))) {
    return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const effectiveFrom = typeof body.effective_from === "string" ? body.effective_from.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return NextResponse.json({ ok: false, error: "effective_from_invalid" }, { status: 400 });
  }

  let payload: { cadence: string; weekly_count: number | null; weekdays: number[] | null };
  if (body.cadence === "weekly_count") {
    const n = Number(body.weekly_count);
    if (!Number.isFinite(n) || n < 1 || n > 14) {
      return NextResponse.json({ ok: false, error: "weekly_count_invalid" }, { status: 400 });
    }
    payload = { cadence: "weekly_count", weekly_count: Math.floor(n), weekdays: null };
  } else if (body.cadence === "weekday") {
    const wd = normalizeWeekdays(body.weekdays);
    if (!wd) return NextResponse.json({ ok: false, error: "weekdays_invalid" }, { status: 400 });
    payload = { cadence: "weekday", weekly_count: null, weekdays: wd };
  } else {
    return NextResponse.json({ ok: false, error: "cadence_invalid" }, { status: 400 });
  }

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : null;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("site_schedule_rules")
    .insert({
      company_id: context.companyId,
      site_id: siteId,
      effective_from: effectiveFrom,
      cadence: payload.cadence,
      weekly_count: payload.weekly_count,
      weekdays: payload.weekdays,
      notes: notes || null,
      created_by: context.userId,
    })
    .select(SCHEDULE_SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "site_schedule_rule_created",
    targetTable: "site_schedule_rules",
    targetId: data.id,
    metadata: {
      site_id: siteId,
      cadence: payload.cadence,
      weekly_count: payload.weekly_count,
      weekdays: payload.weekdays,
      effective_from: effectiveFrom,
    },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";
import { getWeekStartIso, parseIsoDate } from "@/lib/cleanidex/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OVERRIDE_SELECT =
  "id, site_id, week_start, kind, occur_date, notes, created_by, created_at";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  const { siteId } = await params;
  if (!(await ensureSiteAccessible(siteId, context.companyId))) {
    return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const weekStart = sp.get("week_start");

  const supabase = await createServerSupabase();
  let query = supabase
    .schema("cleanidex")
    .from("site_visit_overrides")
    .select(OVERRIDE_SELECT)
    .eq("site_id", siteId)
    .order("week_start", { ascending: false })
    .order("occur_date", { ascending: true })
    .limit(200);

  if (weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    query = query.eq("week_start", weekStart);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

type CreateBody = {
  kind?: "skip" | "add";
  occur_date?: string;
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

  const kind = body.kind;
  if (kind !== "skip" && kind !== "add") {
    return NextResponse.json({ ok: false, error: "kind_invalid" }, { status: 400 });
  }
  const occurDate = typeof body.occur_date === "string" ? body.occur_date.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurDate)) {
    return NextResponse.json({ ok: false, error: "occur_date_invalid" }, { status: 400 });
  }
  const weekStart = getWeekStartIso(parseIsoDate(occurDate));
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : null;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("site_visit_overrides")
    .insert({
      company_id: context.companyId,
      site_id: siteId,
      week_start: weekStart,
      kind,
      occur_date: occurDate,
      notes: notes || null,
      created_by: context.userId,
    })
    .select(OVERRIDE_SELECT)
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: false, error: "override_already_exists" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "site_visit_override_created",
    targetTable: "site_visit_overrides",
    targetId: data.id,
    metadata: { site_id: siteId, kind, occur_date: occurDate, week_start: weekStart },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  if (context.roleCode !== "admin") {
    return NextResponse.json({ ok: false, error: "admin_required" }, { status: 403 });
  }
  const { siteId } = await params;

  const sp = req.nextUrl.searchParams;
  const overrideId = sp.get("id");
  if (!overrideId) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .schema("cleanidex")
    .from("site_visit_overrides")
    .delete()
    .eq("id", overrideId)
    .eq("site_id", siteId)
    .eq("company_id", context.companyId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "site_visit_override_deleted",
    targetTable: "site_visit_overrides",
    targetId: overrideId,
    metadata: { site_id: siteId },
    req,
  });

  return NextResponse.json({ ok: true });
}

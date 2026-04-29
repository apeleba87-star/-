import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateWorkSessionBody = {
  site_id?: string;
  contract_id?: string | null;
  work_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
};

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const siteId = req.nextUrl.searchParams.get("site_id")?.trim();
  const fromDate = req.nextUrl.searchParams.get("from_date")?.trim();
  const toDate = req.nextUrl.searchParams.get("to_date")?.trim();
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "20")));
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? "0"));

  const supabase = await createServerSupabase();
  let query = supabase
    .schema("cleanidex")
    .from("work_sessions")
    .select("id, site_id, contract_id, applied_template_id, work_date, start_time, end_time, notes, created_at, updated_at")
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (siteId) query = query.eq("site_id", siteId);
  if (fromDate) query = query.gte("work_date", fromDate);
  if (toDate) query = query.lte("work_date", toDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  const rows = data ?? [];
  const hasMore = rows.length === limit;
  return NextResponse.json({
    ok: true,
    data: rows,
    pagination: {
      limit,
      offset,
      next_offset: hasMore ? offset + rows.length : null,
      has_more: hasMore,
    },
  });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: CreateWorkSessionBody;
  try {
    body = (await req.json()) as CreateWorkSessionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const siteId = body.site_id?.trim() ?? "";
  const workDate = body.work_date?.trim() ?? "";
  if (!siteId) return NextResponse.json({ ok: false, error: "site_id_required" }, { status: 400 });
  if (!workDate) return NextResponse.json({ ok: false, error: "work_date_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: site, error: siteError } = await supabase
    .schema("cleanidex")
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .maybeSingle();
  if (siteError) return NextResponse.json({ ok: false, error: siteError.message }, { status: 400 });
  if (!site) return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });

  const { data: siteTemplate } = await supabase
    .schema("cleanidex")
    .from("site_checklist_templates")
    .select("template_id")
    .eq("site_id", siteId)
    .maybeSingle();

  let appliedTemplateId = siteTemplate?.template_id ?? null;
  if (!appliedTemplateId) {
    const { data: fallbackTemplate } = await supabase
      .schema("cleanidex")
      .from("checklist_templates")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    appliedTemplateId = fallbackTemplate?.id ?? null;
  }

  const payload = {
    company_id: context.companyId,
    site_id: siteId,
    contract_id: body.contract_id?.trim() || null,
    applied_template_id: appliedTemplateId,
    work_date: workDate,
    start_time: body.start_time?.trim() || null,
    end_time: body.end_time?.trim() || null,
    notes: body.notes?.trim() || null,
    created_by: context.userId,
  };

  const { data, error } = await supabase
    .schema("cleanidex")
    .from("work_sessions")
    .insert(payload)
    .select("id, site_id, contract_id, applied_template_id, work_date, start_time, end_time, notes, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "work_session_created",
    targetTable: "work_sessions",
    targetId: data.id,
    metadata: { site_id: siteId, work_date: workDate },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

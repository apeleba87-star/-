import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateReportBody = {
  work_session_id?: string;
  generated_pdf_file_id?: string | null;
};

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const workSessionId = req.nextUrl.searchParams.get("work_session_id")?.trim();
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "20")));
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? "0"));

  const supabase = await createServerSupabase();
  let query = supabase
    .schema("cleanidex")
    .from("reports")
    .select("id, work_session_id, generated_pdf_file_id, generated_by, generated_at, created_at")
    .order("generated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (workSessionId) query = query.eq("work_session_id", workSessionId);

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

  let body: CreateReportBody;
  try {
    body = (await req.json()) as CreateReportBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const workSessionId = body.work_session_id?.trim() ?? "";
  if (!workSessionId) {
    return NextResponse.json({ ok: false, error: "work_session_id_required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: session, error: sessionError } = await supabase
    .schema("cleanidex")
    .from("work_sessions")
    .select("id")
    .eq("id", workSessionId)
    .maybeSingle();
  if (sessionError) return NextResponse.json({ ok: false, error: sessionError.message }, { status: 400 });
  if (!session) return NextResponse.json({ ok: false, error: "work_session_not_found" }, { status: 404 });

  const { data, error } = await supabase
    .schema("cleanidex")
    .from("reports")
    .insert({
      company_id: context.companyId,
      work_session_id: workSessionId,
      generated_pdf_file_id: body.generated_pdf_file_id?.trim() || null,
      generated_by: context.userId,
    })
    .select("id, work_session_id, generated_pdf_file_id, generated_by, generated_at, created_at")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "report_generated",
    targetTable: "reports",
    targetId: data.id,
    metadata: { work_session_id: workSessionId, generated_pdf_file_id: data.generated_pdf_file_id },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UpsertChecklistResponse = {
  checklist_item_id: string;
  selected_option_id: string;
};

type UpsertChecklistBody = {
  work_session_id?: string;
  responses?: UpsertChecklistResponse[];
};

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const workSessionId = req.nextUrl.searchParams.get("work_session_id")?.trim();
  if (!workSessionId) {
    return NextResponse.json({ ok: false, error: "work_session_id_required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("checklist_responses")
    .select("id, work_session_id, checklist_item_id, selected_option_id, responder_user_id, created_at, updated_at")
    .eq("work_session_id", workSessionId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: UpsertChecklistBody;
  try {
    body = (await req.json()) as UpsertChecklistBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const workSessionId = body.work_session_id?.trim() ?? "";
  const responses = body.responses ?? [];
  if (!workSessionId) {
    return NextResponse.json({ ok: false, error: "work_session_id_required" }, { status: 400 });
  }
  if (!responses.length) {
    return NextResponse.json({ ok: false, error: "responses_required" }, { status: 400 });
  }

  const sanitized = responses
    .map((item) => ({
      work_session_id: workSessionId,
      checklist_item_id: item.checklist_item_id?.trim(),
      selected_option_id: item.selected_option_id?.trim(),
      company_id: context.companyId,
      responder_user_id: context.userId,
    }))
    .filter((item) => item.checklist_item_id && item.selected_option_id);

  if (!sanitized.length) {
    return NextResponse.json({ ok: false, error: "responses_invalid" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("checklist_responses")
    .upsert(sanitized, { onConflict: "work_session_id,checklist_item_id" })
    .select("id, work_session_id, checklist_item_id, selected_option_id, responder_user_id, created_at, updated_at");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "checklist_response_upserted",
    targetTable: "checklist_responses",
    metadata: { work_session_id: workSessionId, count: sanitized.length },
    req,
  });

  return NextResponse.json({ ok: true, data: data ?? [] }, { status: 201 });
}

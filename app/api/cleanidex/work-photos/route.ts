import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateWorkPhotoBody = {
  work_session_id?: string;
  file_id?: string;
  zone_id?: string | null;
  captured_at?: string | null;
};

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const workSessionId = req.nextUrl.searchParams.get("work_session_id")?.trim();
  if (!workSessionId) return NextResponse.json({ ok: false, error: "work_session_id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("work_photos")
    .select("id, work_session_id, file_id, zone_id, captured_at, created_at")
    .eq("work_session_id", workSessionId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  let body: CreateWorkPhotoBody;
  try {
    body = (await req.json()) as CreateWorkPhotoBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const workSessionId = body.work_session_id?.trim() ?? "";
  const fileId = body.file_id?.trim() ?? "";
  const zoneId = body.zone_id?.trim() || null;
  const capturedAt = body.captured_at ? new Date(body.captured_at) : null;
  if (!workSessionId) return NextResponse.json({ ok: false, error: "work_session_id_required" }, { status: 400 });
  if (!fileId) return NextResponse.json({ ok: false, error: "file_id_required" }, { status: 400 });
  if (capturedAt && Number.isNaN(capturedAt.getTime())) {
    return NextResponse.json({ ok: false, error: "captured_at_invalid" }, { status: 400 });
  }
  if (capturedAt) {
    const now = Date.now();
    const capturedMs = capturedAt.getTime();
    const maxPastMs = 15 * 60 * 1000;
    const maxFutureMs = 5 * 60 * 1000;
    if (capturedMs < now - maxPastMs || capturedMs > now + maxFutureMs) {
      return NextResponse.json({ ok: false, error: "captured_at_out_of_range" }, { status: 400 });
    }
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("work_photos")
    .insert({
      company_id: context.companyId,
      work_session_id: workSessionId,
      file_id: fileId,
      zone_id: zoneId,
      captured_at: capturedAt ? capturedAt.toISOString() : null,
    })
    .select("id, work_session_id, file_id, zone_id, captured_at, created_at")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "work_photo_added",
    targetTable: "work_photos",
    targetId: data.id,
    metadata: { work_session_id: workSessionId, file_id: fileId, zone_id: zoneId },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

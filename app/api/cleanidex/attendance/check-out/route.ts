import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";
import { assertAttendanceRateLimit } from "@/lib/cleanidex/attendance-rate-limit";
import { DEFAULT_GEOFENCE_RADIUS_M, haversineMeters } from "@/lib/cleanidex/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  work_session_id?: string;
  lat?: number;
  lng?: number;
  accuracy_m?: number;
  notes?: string;
};

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const lat = typeof body.lat === "number" && Number.isFinite(body.lat) ? body.lat : null;
  const lng = typeof body.lng === "number" && Number.isFinite(body.lng) ? body.lng : null;
  const accuracy =
    typeof body.accuracy_m === "number" && Number.isFinite(body.accuracy_m)
      ? Math.max(0, body.accuracy_m)
      : null;
  if (accuracy !== null && accuracy > 10_000) {
    return NextResponse.json({ ok: false, error: "accuracy_m_invalid" }, { status: 400 });
  }

  const supabase = await createServerSupabase();

  const rl = await assertAttendanceRateLimit(supabase, context.userId, "check_out");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: rl.error, retry_after_sec: rl.retry_after_sec },
      { status: 429 }
    );
  }

  // 활성 세션 결정: 본인 + end_time IS NULL 중 가장 최근 (또는 명시된 세션)
  let sessionQuery = supabase
    .schema("cleanidex")
    .from("work_sessions")
    .select("id, site_id, work_date, start_time, end_time, site:sites!inner(id, name, lat, lng, geofence_radius_m)")
    .eq("company_id", context.companyId)
    .eq("created_by", context.userId)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1);

  if (typeof body.work_session_id === "string" && body.work_session_id.trim()) {
    sessionQuery = supabase
      .schema("cleanidex")
      .from("work_sessions")
      .select("id, site_id, work_date, start_time, end_time, site:sites!inner(id, name, lat, lng, geofence_radius_m)")
      .eq("company_id", context.companyId)
      .eq("created_by", context.userId)
      .eq("id", body.work_session_id.trim())
      .is("end_time", null)
      .limit(1);
  }

  const { data: sessions, error: sessErr } = await sessionQuery;
  if (sessErr) return NextResponse.json({ ok: false, error: sessErr.message }, { status: 400 });

  type SessionRow = {
    id: string;
    site_id: string;
    site: { id: string; name: string; lat: number | null; lng: number | null; geofence_radius_m: number | null } | null;
  };
  // supabase relational select returns arrays — normalize to single object.
  const rawSession = (sessions ?? [])[0] as
    | (Omit<SessionRow, "site"> & { site: SessionRow["site"] | SessionRow["site"][] })
    | undefined;
  if (!rawSession) {
    return NextResponse.json({ ok: false, error: "no_open_session" }, { status: 409 });
  }
  const siteFlat = Array.isArray(rawSession.site) ? rawSession.site[0] ?? null : rawSession.site;
  const session: SessionRow = { id: rawSession.id, site_id: rawSession.site_id, site: siteFlat };

  let distance: number | null = null;
  let status: "inside" | "outside" | "unknown" = "unknown";
  if (lat !== null && lng !== null && session.site && session.site.lat !== null && session.site.lng !== null) {
    distance = haversineMeters(lat, lng, Number(session.site.lat), Number(session.site.lng));
    const radius = session.site.geofence_radius_m ?? DEFAULT_GEOFENCE_RADIUS_M;
    status = distance <= radius ? "inside" : "outside";
  }

  // end_time 세팅 → 트리거가 try_mark_session_complete 호출
  const { error: updErr } = await supabase
    .schema("cleanidex")
    .from("work_sessions")
    .update({ end_time: new Date().toISOString() })
    .eq("id", session.id)
    .eq("company_id", context.companyId);
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });

  const { data: ev, error: evErr } = await supabase
    .schema("cleanidex")
    .from("attendance_events")
    .insert({
      company_id: context.companyId,
      user_id: context.userId,
      site_id: session.site_id,
      work_session_id: session.id,
      kind: "check_out",
      lat,
      lng,
      accuracy_m: accuracy,
      distance_m: distance,
      geofence_status: status,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null,
      device: req.headers.get("user-agent"),
    })
    .select("id, occurred_at, geofence_status, distance_m")
    .single();
  if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 400 });

  // 완료 여부 재조회 (트리거에 의해 갱신되었을 수 있음)
  const { data: refreshed } = await supabase
    .schema("cleanidex")
    .from("work_sessions")
    .select("id, completed_at")
    .eq("id", session.id)
    .maybeSingle<{ id: string; completed_at: string | null }>();

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "attendance_check_out",
    targetTable: "attendance_events",
    targetId: ev.id,
    metadata: {
      site_id: session.site_id,
      work_session_id: session.id,
      geofence_status: status,
      distance_m: distance !== null ? Math.round(distance) : null,
      auto_completed: refreshed?.completed_at ? true : false,
    },
    req,
  });

  return NextResponse.json({
    ok: true,
    data: {
      attendance_event_id: ev.id,
      work_session_id: session.id,
      geofence_status: status,
      distance_m: distance !== null ? Math.round(distance) : null,
      occurred_at: ev.occurred_at,
      session_completed_at: refreshed?.completed_at ?? null,
    },
  });
}

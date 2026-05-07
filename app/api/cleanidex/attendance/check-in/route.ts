import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";
import { assertAttendanceRateLimit } from "@/lib/cleanidex/attendance-rate-limit";
import { DEFAULT_GEOFENCE_RADIUS_M, haversineMeters } from "@/lib/cleanidex/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  site_id?: string;
  lat?: number;
  lng?: number;
  accuracy_m?: number;
  notes?: string;
};

type SiteRow = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  geofence_radius_m: number | null;
};

function todayIsoUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  const explicitSiteId = typeof body.site_id === "string" ? body.site_id.trim() || null : null;

  if (lat === null || lng === null) {
    return NextResponse.json({ ok: false, error: "location_required" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ ok: false, error: "location_out_of_range" }, { status: 400 });
  }
  if (accuracy !== null && (accuracy > 10_000 || accuracy < 0)) {
    return NextResponse.json({ ok: false, error: "accuracy_m_invalid" }, { status: 400 });
  }

  const supabase = await createServerSupabase();

  const rl = await assertAttendanceRateLimit(supabase, context.userId, "check_in");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: rl.error, retry_after_sec: rl.retry_after_sec },
      { status: 429 }
    );
  }

  // 1) 활성 세션 중복 체크 (같은 user, 종료되지 않은 세션) — 있으면 거부
  const { data: openSession, error: openErr } = await supabase
    .schema("cleanidex")
    .from("work_sessions")
    .select("id, site_id, work_date, start_time, end_time")
    .eq("company_id", context.companyId)
    .eq("created_by", context.userId)
    .is("end_time", null)
    .not("start_time", "is", null)
    .order("start_time", { ascending: false })
    .limit(1);
  if (openErr) return NextResponse.json({ ok: false, error: openErr.message }, { status: 400 });
  if (openSession && openSession.length > 0) {
    return NextResponse.json(
      { ok: false, error: "already_checked_in", data: { open_session_id: openSession[0].id } },
      { status: 409 }
    );
  }

  // 2) 사이트 결정: explicit > nearest with coords (≤ 5km), fallback null (기록은 가능, geofence_status=unknown)
  let site: SiteRow | null = null;
  if (explicitSiteId) {
    const { data, error } = await supabase
      .schema("cleanidex")
      .from("sites")
      .select("id, name, lat, lng, geofence_radius_m")
      .eq("id", explicitSiteId)
      .eq("company_id", context.companyId)
      .maybeSingle<SiteRow>();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });
    site = data;
  } else {
    const { data, error } = await supabase
      .schema("cleanidex")
      .from("sites")
      .select("id, name, lat, lng, geofence_radius_m")
      .eq("company_id", context.companyId)
      .not("lat", "is", null)
      .not("lng", "is", null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    let bestDist = Infinity;
    for (const s of (data ?? []) as SiteRow[]) {
      if (s.lat === null || s.lng === null) continue;
      const d = haversineMeters(lat, lng, Number(s.lat), Number(s.lng));
      if (d < bestDist) {
        bestDist = d;
        site = s;
      }
    }
    if (!site || bestDist > 5000) {
      // 가까운 사이트가 없음 — site_id 없이도 기록 자체는 가능하지만 작업 시작이 모호해서 거부
      return NextResponse.json(
        { ok: false, error: "no_nearby_site", data: { distance_m: Number.isFinite(bestDist) ? Math.round(bestDist) : null } },
        { status: 400 }
      );
    }
  }

  // 3) geofence 계산
  let distance: number | null = null;
  let status: "inside" | "outside" | "unknown" = "unknown";
  if (site && site.lat !== null && site.lng !== null) {
    distance = haversineMeters(lat, lng, Number(site.lat), Number(site.lng));
    const radius = site.geofence_radius_m ?? DEFAULT_GEOFENCE_RADIUS_M;
    status = distance <= radius ? "inside" : "outside";
  }

  // 4) work_session 생성 (오늘 같은 site 의 미종료 세션이 있으면 재사용)
  const today = todayIsoUtc();
  const { data: existingToday, error: extErr } = await supabase
    .schema("cleanidex")
    .from("work_sessions")
    .select("id, site_id, work_date, start_time, end_time")
    .eq("company_id", context.companyId)
    .eq("created_by", context.userId)
    .eq("site_id", site!.id)
    .eq("work_date", today)
    .is("end_time", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (extErr) return NextResponse.json({ ok: false, error: extErr.message }, { status: 400 });

  let sessionId: string;
  if (existingToday && existingToday.length > 0 && existingToday[0].start_time) {
    sessionId = existingToday[0].id;
  } else if (existingToday && existingToday.length > 0) {
    const { data: upd, error: updErr } = await supabase
      .schema("cleanidex")
      .from("work_sessions")
      .update({ start_time: new Date().toISOString() })
      .eq("id", existingToday[0].id)
      .select("id")
      .single();
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
    sessionId = upd.id;
  } else {
    const { data: ins, error: insErr } = await supabase
      .schema("cleanidex")
      .from("work_sessions")
      .insert({
        company_id: context.companyId,
        site_id: site!.id,
        work_date: today,
        start_time: new Date().toISOString(),
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (insErr) {
      if ((insErr as { code?: string }).code === "23505") {
        return NextResponse.json(
          { ok: false, error: "already_checked_in", message: "동시 요청으로 세션이 이미 열렸습니다." },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
    }
    sessionId = ins.id;
  }

  // 5) attendance_event 기록
  const { data: ev, error: evErr } = await supabase
    .schema("cleanidex")
    .from("attendance_events")
    .insert({
      company_id: context.companyId,
      user_id: context.userId,
      site_id: site!.id,
      work_session_id: sessionId,
      kind: "check_in",
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

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "attendance_check_in",
    targetTable: "attendance_events",
    targetId: ev.id,
    metadata: {
      site_id: site!.id,
      work_session_id: sessionId,
      geofence_status: status,
      distance_m: distance !== null ? Math.round(distance) : null,
    },
    req,
  });

  return NextResponse.json({
    ok: true,
    data: {
      attendance_event_id: ev.id,
      work_session_id: sessionId,
      site: { id: site!.id, name: site!.name },
      geofence_status: status,
      distance_m: distance !== null ? Math.round(distance) : null,
      occurred_at: ev.occurred_at,
    },
  });
}

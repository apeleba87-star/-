import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const dateParam = sp.get("date");
  const isoDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? 50)));

  const supabase = await createServerSupabase();
  let query = supabase
    .schema("cleanidex")
    .from("attendance_events")
    .select(
      "id, user_id, site_id, work_session_id, kind, occurred_at, lat, lng, accuracy_m, distance_m, geofence_status, notes, site:sites(id, name)"
    )
    .eq("company_id", context.companyId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (isoDate) {
    const start = `${isoDate}T00:00:00.000Z`;
    const next = new Date(Date.parse(start) + 24 * 3600 * 1000).toISOString();
    query = query.gte("occurred_at", start).lt("occurred_at", next);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

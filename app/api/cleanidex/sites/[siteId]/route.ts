import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_SELECT =
  "id, client_id, name, address, lat, lng, geofence_radius_m, created_at, updated_at";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  const { siteId } = await params;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("sites")
    .select(SITE_SELECT)
    .eq("id", siteId)
    .eq("company_id", context.companyId)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, data });
}

type PatchBody = {
  name?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  geofence_radius_m?: number | null;
};

function clampLat(v: number): number | null {
  if (!Number.isFinite(v)) return null;
  if (v < -90 || v > 90) return null;
  return Math.round(v * 1_000_000) / 1_000_000;
}
function clampLng(v: number): number | null {
  if (!Number.isFinite(v)) return null;
  if (v < -180 || v > 180) return null;
  return Math.round(v * 1_000_000) / 1_000_000;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  if (context.roleCode !== "admin") {
    return NextResponse.json({ ok: false, error: "admin_required" }, { status: 403 });
  }
  const { siteId } = await params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    if (!v) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    updates.name = v.slice(0, 200);
  }
  if (body.address !== undefined) {
    const s = typeof body.address === "string" ? body.address.trim() : "";
    updates.address = s ? s.slice(0, 500) : null;
  }
  if (body.lat !== undefined) {
    if (body.lat === null) updates.lat = null;
    else {
      const n = clampLat(Number(body.lat));
      if (n === null) return NextResponse.json({ ok: false, error: "lat_invalid" }, { status: 400 });
      updates.lat = n;
    }
  }
  if (body.lng !== undefined) {
    if (body.lng === null) updates.lng = null;
    else {
      const n = clampLng(Number(body.lng));
      if (n === null) return NextResponse.json({ ok: false, error: "lng_invalid" }, { status: 400 });
      updates.lng = n;
    }
  }
  if (body.geofence_radius_m !== undefined) {
    if (body.geofence_radius_m === null) updates.geofence_radius_m = null;
    else {
      const n = Number(body.geofence_radius_m);
      if (!Number.isFinite(n) || n < 10 || n > 5000) {
        return NextResponse.json({ ok: false, error: "geofence_radius_invalid" }, { status: 400 });
      }
      updates.geofence_radius_m = Math.round(n);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("sites")
    .update(updates)
    .eq("id", siteId)
    .eq("company_id", context.companyId)
    .select(SITE_SELECT)
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "site_not_found" }, { status: 404 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "site_updated",
    targetTable: "sites",
    targetId: siteId,
    metadata: { fields: Object.keys(updates) },
    req,
  });

  return NextResponse.json({ ok: true, data });
}

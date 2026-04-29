import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateTokenBody = {
  work_session_id?: string;
  expires_in_minutes?: number;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  let body: CreateTokenBody;
  try {
    body = (await req.json()) as CreateTokenBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const workSessionId = body.work_session_id?.trim() ?? "";
  if (!workSessionId) {
    return NextResponse.json({ ok: false, error: "work_session_id_required" }, { status: 400 });
  }

  const expiresIn = Math.max(10, Math.min(60 * 24 * 14, body.expires_in_minutes ?? 60 * 24));
  const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000).toISOString();
  const token = randomBytes(24).toString("hex");
  const tokenHash = sha256(token);

  const supabase = await createServerSupabase();

  const { data: sessionRow, error: sessionError } = await supabase
    .schema("cleanidex")
    .from("work_sessions")
    .select("id, site_id, applied_template_id")
    .eq("id", workSessionId)
    .maybeSingle();
  if (sessionError) return NextResponse.json({ ok: false, error: sessionError.message }, { status: 400 });
  if (!sessionRow) return NextResponse.json({ ok: false, error: "work_session_not_found" }, { status: 404 });

  let templateId = sessionRow.applied_template_id ?? null;
  if (!templateId) {
    const { data: fallbackTemplate } = await supabase
      .schema("cleanidex")
      .from("checklist_templates")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    templateId = fallbackTemplate?.id ?? null;
  }

  if (templateId) {
    const [{ count: itemCount, error: itemError }, { count: responseCount, error: responseError }] = await Promise.all([
      supabase
        .schema("cleanidex")
        .from("checklist_items")
        .select("id", { count: "exact", head: true })
        .eq("template_id", templateId),
      supabase
        .schema("cleanidex")
        .from("checklist_responses")
        .select("id", { count: "exact", head: true })
        .eq("work_session_id", workSessionId),
    ]);
    if (itemError) return NextResponse.json({ ok: false, error: itemError.message }, { status: 400 });
    if (responseError) return NextResponse.json({ ok: false, error: responseError.message }, { status: 400 });
    if ((itemCount ?? 0) > 0 && (responseCount ?? 0) < (itemCount ?? 0)) {
      return NextResponse.json(
        {
          ok: false,
          error: "checklist_incomplete",
          details: { required: itemCount ?? 0, completed: responseCount ?? 0 },
        },
        { status: 400 },
      );
    }
  }

  const { data: requiredZones, error: zonesError } = await supabase
    .schema("cleanidex")
    .from("photo_zones")
    .select("id")
    .eq("site_id", sessionRow.site_id)
    .eq("is_required", true);
  if (zonesError) return NextResponse.json({ ok: false, error: zonesError.message }, { status: 400 });

  const requiredZoneIds = (requiredZones ?? []).map((z) => z.id);
  if (requiredZoneIds.length > 0) {
    const { data: uploadedRequiredZones, error: photosError } = await supabase
      .schema("cleanidex")
      .from("work_photos")
      .select("zone_id")
      .eq("work_session_id", workSessionId)
      .in("zone_id", requiredZoneIds);
    if (photosError) return NextResponse.json({ ok: false, error: photosError.message }, { status: 400 });
    const completedZoneSet = new Set((uploadedRequiredZones ?? []).map((row) => row.zone_id).filter(Boolean));
    if (completedZoneSet.size < requiredZoneIds.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "required_photo_zones_incomplete",
          details: { required: requiredZoneIds.length, completed: completedZoneSet.size },
        },
        { status: 400 },
      );
    }
  }

  const { data: existing, error: existingError } = await supabase
    .schema("cleanidex")
    .from("client_confirmations")
    .select("id")
    .eq("work_session_id", workSessionId)
    .maybeSingle();
  if (existingError) return NextResponse.json({ ok: false, error: existingError.message }, { status: 400 });

  if (existing?.id) {
    const { error } = await supabase
      .schema("cleanidex")
      .from("client_confirmations")
      .update({
        token_hash: tokenHash,
        token_expires_at: expiresAt,
        confirmed: false,
        confirmed_at: null,
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.schema("cleanidex").from("client_confirmations").insert({
      company_id: context.companyId,
      work_session_id: workSessionId,
      token_hash: tokenHash,
      token_expires_at: expiresAt,
      confirmed: false,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "client_confirmation_token_issued",
    targetTable: "client_confirmations",
    metadata: { work_session_id: workSessionId, expires_at: expiresAt },
    req,
  });

  return NextResponse.json({
    ok: true,
    data: {
      token,
      expires_at: expiresAt,
      // UI can build final URL with host.
      path: `/api/cleanidex/client-confirmations/verify?token=${token}`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const siteId = req.nextUrl.searchParams.get("site_id")?.trim();
  if (!siteId) return NextResponse.json({ ok: false, error: "site_id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("photo_zones")
    .select("id, site_id, name, sort_order, is_required")
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  let body: { site_id?: string; name?: string; names?: string[]; sort_order?: number; is_required?: boolean };
  try {
    body = (await req.json()) as { site_id?: string; name?: string; names?: string[]; sort_order?: number; is_required?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const siteId = body.site_id?.trim() ?? "";
  const rawNames = Array.isArray(body.names) ? body.names : [body.name ?? ""];
  const names = rawNames
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v, idx, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === idx);
  if (!siteId) return NextResponse.json({ ok: false, error: "site_id_required" }, { status: 400 });
  if (!names.length) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: existingZones, error: existingError } = await supabase
    .schema("cleanidex")
    .from("photo_zones")
    .select("id, site_id, name, sort_order, is_required")
    .eq("site_id", siteId);
  if (existingError) return NextResponse.json({ ok: false, error: existingError.message }, { status: 400 });

  const existingByNormalized = new Map((existingZones ?? []).map((z) => [z.name.trim().toLowerCase(), z]));
  const createNames = names.filter((n) => !existingByNormalized.has(n.toLowerCase()));
  const skippedCount = names.length - createNames.length;

  let created: Array<{ id: string; site_id: string; name: string; sort_order: number; is_required: boolean }> = [];
  if (createNames.length > 0) {
    const { data, error } = await supabase
      .schema("cleanidex")
      .from("photo_zones")
      .insert(
        createNames.map((name) => ({
          company_id: context.companyId,
          site_id: siteId,
          name,
          sort_order: Number.isFinite(body.sort_order) ? body.sort_order : 0,
          is_required: body.is_required ?? true,
        })),
      )
      .select("id, site_id, name, sort_order, is_required");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    created = data ?? [];
  }

  if (created.length > 0) {
    await writeCleanidexAuditLog({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "photo_zone_created_bulk",
      targetTable: "photo_zones",
      metadata: { site_id: siteId, created_count: created.length, names: created.map((z) => z.name) },
      req,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      data: created,
      created_count: created.length,
      skipped_count: skippedCount,
    },
    { status: created.length > 0 ? 201 : 200 },
  );
}

export async function PATCH(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  let body: { id?: string; sort_order?: number; name?: string; orders?: Array<{ id: string; sort_order: number }> };
  try {
    body = (await req.json()) as { id?: string; sort_order?: number; name?: string; orders?: Array<{ id: string; sort_order: number }> };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const orders = Array.isArray(body.orders) ? body.orders : [];
  const supabase = await createServerSupabase();

  if (orders.length > 0) {
    for (const row of orders) {
      if (!row?.id?.trim() || !Number.isFinite(row.sort_order)) {
        return NextResponse.json({ ok: false, error: "invalid_orders_payload" }, { status: 400 });
      }
    }

    const updates = await Promise.all(
      orders.map((row) =>
        supabase
          .schema("cleanidex")
          .from("photo_zones")
          .update({ sort_order: row.sort_order })
          .eq("id", row.id)
          .select("id, site_id, name, sort_order, is_required")
          .single(),
      ),
    );
    const failed = updates.find((u) => u.error);
    if (failed?.error) return NextResponse.json({ ok: false, error: failed.error.message }, { status: 400 });
    const updatedRows = updates.map((u) => u.data).filter(Boolean);

    await writeCleanidexAuditLog({
      companyId: context.companyId,
      actorUserId: context.userId,
      action: "photo_zone_reordered_bulk",
      targetTable: "photo_zones",
      metadata: { updated_count: updatedRows.length, ids: updatedRows.map((r) => r?.id) },
      req,
    });

    return NextResponse.json({ ok: true, data: updatedRows });
  }

  const id = body.id?.trim() ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  const nextName = body.name?.trim();
  const hasSortOrder = Number.isFinite(body.sort_order);
  const hasName = typeof nextName === "string" && nextName.length > 0;
  if (!hasSortOrder && !hasName) {
    return NextResponse.json({ ok: false, error: "sort_order_or_name_required" }, { status: 400 });
  }

  const updatePayload: { sort_order?: number; name?: string } = {};
  if (hasSortOrder) updatePayload.sort_order = body.sort_order;
  if (hasName) {
    const { data: targetZone, error: targetZoneError } = await supabase
      .schema("cleanidex")
      .from("photo_zones")
      .select("id, site_id, name")
      .eq("id", id)
      .single();
    if (targetZoneError) return NextResponse.json({ ok: false, error: targetZoneError.message }, { status: 400 });

    const { data: siteZones, error: siteZonesError } = await supabase
      .schema("cleanidex")
      .from("photo_zones")
      .select("id, name")
      .eq("site_id", targetZone.site_id);
    if (siteZonesError) return NextResponse.json({ ok: false, error: siteZonesError.message }, { status: 400 });

    const hasDuplicate = (siteZones ?? []).some((z) => z.id !== id && z.name.trim().toLowerCase() === nextName.toLowerCase());
    if (hasDuplicate) return NextResponse.json({ ok: false, error: "photo_zone_name_duplicated" }, { status: 400 });
    updatePayload.name = nextName;
  }
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("photo_zones")
    .update(updatePayload)
    .eq("id", id)
    .select("id, site_id, name, sort_order, is_required")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: hasName ? "photo_zone_updated" : "photo_zone_reordered",
    targetTable: "photo_zones",
    targetId: data.id,
    metadata: { site_id: data.site_id, sort_order: data.sort_order, name: data.name },
    req,
  });

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: zone, error: zoneError } = await supabase
    .schema("cleanidex")
    .from("photo_zones")
    .select("id, site_id, name")
    .eq("id", id)
    .single();
  if (zoneError) return NextResponse.json({ ok: false, error: zoneError.message }, { status: 400 });

  const { error } = await supabase.schema("cleanidex").from("photo_zones").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "photo_zone_deleted",
    targetTable: "photo_zones",
    targetId: zone.id,
    metadata: { site_id: zone.site_id, name: zone.name },
    req,
  });

  return NextResponse.json({ ok: true });
}

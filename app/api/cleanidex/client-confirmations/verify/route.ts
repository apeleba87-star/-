import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
}

async function resolveConfirmationByToken(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return { error: "token_required" as const };

  const tokenHash = sha256(token);
  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("client_confirmations")
    .select("id, company_id, work_session_id, confirmed, token_expires_at, opened_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "token_not_found" as const };
  if (!data.token_expires_at || new Date(data.token_expires_at).getTime() < Date.now()) {
    return { error: "token_expired" as const };
  }

  return { data };
}

export async function GET(req: NextRequest) {
  const resolved = await resolveConfirmationByToken(req);
  if ("error" in resolved) return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });
  const supabase = createServiceSupabase();
  const ip = requestIp(req);
  const device = req.headers.get("user-agent");
  if (!resolved.data.opened_at) {
    await supabase
      .schema("cleanidex")
      .from("client_confirmations")
      .update({
        opened_at: new Date().toISOString(),
        opened_ip: ip,
        opened_device: device,
      })
      .eq("id", resolved.data.id);
    await supabase.schema("cleanidex").from("audit_logs").insert({
      company_id: resolved.data.company_id,
      actor_user_id: null,
      action: "client_confirmation_opened",
      target_table: "client_confirmations",
      target_id: resolved.data.id,
      ip,
      device,
      metadata: { work_session_id: resolved.data.work_session_id },
    });
  }

  const [sessionResult, responsesResult, photosResult] = await Promise.all([
    supabase
      .schema("cleanidex")
      .from("work_sessions")
      .select("site_id")
      .eq("id", resolved.data.work_session_id)
      .maybeSingle(),
    supabase
      .schema("cleanidex")
      .from("checklist_responses")
      .select("checklist_item_id, selected_option_id")
      .eq("work_session_id", resolved.data.work_session_id),
    supabase
      .schema("cleanidex")
      .from("work_photos")
      .select("file_id, zone_id")
      .eq("work_session_id", resolved.data.work_session_id),
  ]);

  if (sessionResult.error) return NextResponse.json({ ok: false, error: sessionResult.error.message }, { status: 400 });
  if (responsesResult.error) return NextResponse.json({ ok: false, error: responsesResult.error.message }, { status: 400 });
  if (photosResult.error) return NextResponse.json({ ok: false, error: photosResult.error.message }, { status: 400 });

  const itemIds = Array.from(new Set((responsesResult.data ?? []).map((r) => r.checklist_item_id)));
  const optionIds = Array.from(new Set((responsesResult.data ?? []).map((r) => r.selected_option_id)));
  const fileIds = Array.from(new Set((photosResult.data ?? []).map((r) => r.file_id)));
  const zoneIds = Array.from(new Set((photosResult.data ?? []).map((r) => r.zone_id).filter(Boolean)));

  const [itemsResult, optionsResult, filesResult, zonesResult] = await Promise.all([
    itemIds.length
      ? supabase.schema("cleanidex").from("checklist_items").select("id, title").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    optionIds.length
      ? supabase.schema("cleanidex").from("checklist_options").select("id, label").in("id", optionIds)
      : Promise.resolve({ data: [], error: null }),
    fileIds.length
      ? supabase.schema("cleanidex").from("files").select("id, file_path").in("id", fileIds)
      : Promise.resolve({ data: [], error: null }),
    zoneIds.length
      ? supabase
          .schema("cleanidex")
          .from("photo_zones")
          .select("id, name, sort_order")
          .in("id", zoneIds as string[])
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (itemsResult.error) return NextResponse.json({ ok: false, error: itemsResult.error.message }, { status: 400 });
  if (optionsResult.error) return NextResponse.json({ ok: false, error: optionsResult.error.message }, { status: 400 });
  if (filesResult.error) return NextResponse.json({ ok: false, error: filesResult.error.message }, { status: 400 });
  if (zonesResult.error) return NextResponse.json({ ok: false, error: zonesResult.error.message }, { status: 400 });

  const itemMap = new Map((itemsResult.data ?? []).map((i) => [i.id, i.title]));
  const optionMap = new Map((optionsResult.data ?? []).map((o) => [o.id, o.label]));
  const zoneMap = new Map((zonesResult.data ?? []).map((z) => [z.id, { name: z.name, sort: z.sort_order ?? 9999 }]));

  const photoData = [];
  for (const photo of photosResult.data ?? []) {
    const file = (filesResult.data ?? []).find((f) => f.id === photo.file_id);
    if (!file) continue;
    const { data: signed } = await supabase.storage.from("cleanidex-private").createSignedUrl(file.file_path, 600);
    photoData.push({
      file_id: photo.file_id,
      zone_id: photo.zone_id,
      zone_name: photo.zone_id ? zoneMap.get(photo.zone_id)?.name ?? null : null,
      zone_sort_order: photo.zone_id ? zoneMap.get(photo.zone_id)?.sort ?? 9999 : 9999,
      signed_url: signed?.signedUrl ?? null,
    });
  }
  photoData.sort((a, b) => a.zone_sort_order - b.zone_sort_order);

  const checklistData = (responsesResult.data ?? []).map((row) => ({
    checklist_item_id: row.checklist_item_id,
    checklist_item_title: itemMap.get(row.checklist_item_id) ?? row.checklist_item_id,
    selected_option_id: row.selected_option_id,
    selected_option_label: optionMap.get(row.selected_option_id) ?? row.selected_option_id,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      work_session_id: resolved.data.work_session_id,
      confirmed: resolved.data.confirmed,
      token_expires_at: resolved.data.token_expires_at,
      checklist: checklistData,
      photos: photoData,
    },
  });
}

export async function POST(req: NextRequest) {
  const resolved = await resolveConfirmationByToken(req);
  if ("error" in resolved) return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });

  let body: { confirmed_by_name?: string };
  try {
    body = (await req.json()) as { confirmed_by_name?: string };
  } catch {
    body = {};
  }

  const supabase = createServiceSupabase();
  const now = new Date().toISOString();
  const ip = requestIp(req);
  const device = req.headers.get("user-agent");

  const { error } = await supabase
    .schema("cleanidex")
    .from("client_confirmations")
    .update({
      confirmed: true,
      confirmed_by_name: body.confirmed_by_name?.trim() || null,
      confirmed_at: now,
      ip,
      device,
      token_hash: null,
      token_expires_at: null,
    })
    .eq("id", resolved.data.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await supabase.schema("cleanidex").from("audit_logs").insert({
    company_id: resolved.data.company_id,
    actor_user_id: null,
    action: "client_confirmed",
    target_table: "client_confirmations",
    target_id: resolved.data.id,
    ip,
    device,
    metadata: { work_session_id: resolved.data.work_session_id },
  });

  return NextResponse.json({
    ok: true,
    data: {
      work_session_id: resolved.data.work_session_id,
      confirmed: true,
      confirmed_at: now,
    },
  });
}

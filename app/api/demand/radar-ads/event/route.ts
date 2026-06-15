import { NextRequest, NextResponse } from "next/server";
import { isRadarSlotLive } from "@/lib/demand/radar-ads-slot";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import { magamCorsHeaders, withMagamCors } from "@/lib/api/magam-cors";
import { createServiceSupabase } from "@/lib/supabase-server";

const ALLOWED_TYPES = ["impression", "click", "phone_click"] as const;

type Body = {
  event_type?: string;
  slot_id?: string;
  session_id?: string | null;
  anon_visitor_id?: string | null;
  page_path?: string | null;
  referrer?: string | null;
  meta?: Record<string, unknown> | null;
};

type SlotRow = {
  id: string;
  banner_id: string;
  status: string;
  start_date: string;
  end_date: string;
};

const memoryHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, limit = 180, windowMs = 60_000): boolean {
  const now = Date.now();
  let entry = memoryHits.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryHits.set(ip, entry);
  }
  entry.count += 1;
  return entry.count <= limit;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: magamCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!rateLimit(ip)) {
      return withMagamCors(
        NextResponse.json({ error: "Too many requests" }, { status: 429 }),
        origin
      );
    }

    const body = (await request.json()) as Body;
    const { event_type, slot_id, session_id, anon_visitor_id, page_path, referrer, meta } = body;

    if (!event_type || !ALLOWED_TYPES.includes(event_type as (typeof ALLOWED_TYPES)[number])) {
      return withMagamCors(
        NextResponse.json({ error: "Invalid event_type" }, { status: 400 }),
        origin
      );
    }
    if (!slot_id || !/^[0-9a-f-]{36}$/i.test(slot_id)) {
      return withMagamCors(
        NextResponse.json({ error: "Invalid slot_id" }, { status: 400 }),
        origin
      );
    }

    const supabase = createServiceSupabase();
    const { data: slot, error: slotErr } = await supabase
      .from("radar_ad_slots")
      .select("id, banner_id, status, start_date, end_date")
      .eq("id", slot_id)
      .maybeSingle();

    if (slotErr || !slot) {
      return withMagamCors(
        NextResponse.json({ error: "Slot not found" }, { status: 404 }),
        origin
      );
    }

    const slotRow = slot as SlotRow;
    const today = getKstTodayString();
    if (!isRadarSlotLive(slotRow, today)) {
      return withMagamCors(
        NextResponse.json({ error: "Slot not live" }, { status: 403 }),
        origin
      );
    }

    const { data: banner, error: bannerErr } = await supabase
      .from("radar_ad_banners")
      .select("enabled")
      .eq("id", slotRow.banner_id)
      .maybeSingle();

    if (bannerErr || !banner?.enabled) {
      return withMagamCors(
        NextResponse.json({ error: "Banner not enabled" }, { status: 403 }),
        origin
      );
    }

    const baseMeta =
      meta && typeof meta === "object" && !Array.isArray(meta) ? { ...meta } : {};
    if (referrer && typeof referrer === "string") {
      baseMeta.referrer = referrer.slice(0, 1024);
    }

    const row = {
      slot_id: slotRow.id,
      banner_id: slotRow.banner_id,
      event_type,
      session_id: session_id && typeof session_id === "string" ? session_id.slice(0, 256) : null,
      anon_visitor_id:
        anon_visitor_id && typeof anon_visitor_id === "string"
          ? anon_visitor_id.slice(0, 256)
          : null,
      page_path: page_path && typeof page_path === "string" ? page_path.slice(0, 1024) : null,
      meta: baseMeta,
    };

    const { error } = await supabase.from("radar_ad_events").insert(row);
    if (error) {
      console.error("[radar-ads/event] insert error:", error);
      return withMagamCors(
        NextResponse.json({ error: "Failed to record event" }, { status: 500 }),
        origin
      );
    }

    return withMagamCors(NextResponse.json({ ok: true }), origin);
  } catch (e) {
    console.error("[radar-ads/event]", e);
    return withMagamCors(NextResponse.json({ error: "Bad request" }, { status: 400 }), origin);
  }
}

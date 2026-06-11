import { NextRequest, NextResponse } from "next/server";
import { insertDemandRegionViewEvent, isValidDemandRegionKey } from "@/lib/demand/region-view-events";
import type { DemandRegionViewSource } from "@/lib/demand/region-view-events";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

const ALLOWED_SOURCES = new Set<DemandRegionViewSource>(["hub", "region_scope", "seo", "share"]);

const memoryHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, limit = 120, windowMs = 60_000): boolean {
  const now = Date.now();
  let entry = memoryHits.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryHits.set(ip, entry);
  }
  entry.count += 1;
  return entry.count <= limit;
}

type Body = {
  region_key?: string;
  source?: string;
  session_id?: string | null;
  anon_visitor_id?: string | null;
  page_path?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = (await request.json()) as Body;
    const regionKey = body.region_key?.trim() ?? "";
    const source = body.source as DemandRegionViewSource;

    if (!regionKey || !isValidDemandRegionKey(regionKey)) {
      return NextResponse.json({ error: "Invalid region_key" }, { status: 400 });
    }
    if (!source || !ALLOWED_SOURCES.has(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    const authSupabase = await createServerSupabase();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    const supabase = createServiceSupabase();
    const ok = await insertDemandRegionViewEvent(supabase, {
      region_key: regionKey,
      source,
      user_id: user?.id ?? null,
      session_id: body.session_id,
      anon_visitor_id: body.anon_visitor_id,
      page_path: body.page_path,
    });

    if (!ok) {
      return NextResponse.json({ error: "Failed to record" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[region-views/event]", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

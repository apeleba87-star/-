import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

const ALLOWED_EVENT_TYPES = [
  "impression",
  "viewable_impression",
  "click",
  "phone_click",
  "website_click",
  "inquiry_submit",
  "quote_request_submit",
  "kakao_click",
] as const;

const SLOT_KEYS = [
  "premium_banner",
  "native_card",
  "home_bottom",
  "post_top",
  "post_bottom",
  "tenders_top",
  "tenders_mid",
  "listings_top",
  "jobs_top",
];

type Body = {
  event_type: string;
  campaign_id?: string | null;
  slot_key: string;
  session_id?: string | null;
  anon_visitor_id?: string | null;
  page_path?: string | null;
  referrer?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const {
      event_type,
      campaign_id,
      slot_key,
      session_id,
      anon_visitor_id,
      page_path,
      referrer,
      meta,
    } = body;

    if (!event_type || !ALLOWED_EVENT_TYPES.includes(event_type as (typeof ALLOWED_EVENT_TYPES)[number])) {
      return NextResponse.json(
        { error: "Invalid or missing event_type" },
        { status: 400 }
      );
    }
    if (!slot_key || typeof slot_key !== "string" || !SLOT_KEYS.includes(slot_key)) {
      return NextResponse.json(
        { error: "Invalid or missing slot_key" },
        { status: 400 }
      );
    }

    const row = {
      campaign_id: campaign_id && /^[0-9a-f-]{36}$/i.test(campaign_id) ? campaign_id : null,
      slot_key: slot_key.slice(0, 64),
      event_type,
      session_id: session_id && typeof session_id === "string" ? session_id.slice(0, 256) : null,
      anon_visitor_id: anon_visitor_id && typeof anon_visitor_id === "string" ? anon_visitor_id.slice(0, 256) : null,
      page_path: page_path && typeof page_path === "string" ? page_path.slice(0, 1024) : null,
      referrer: referrer && typeof referrer === "string" ? referrer.slice(0, 1024) : null,
      user_agent_hash: null as string | null,
      meta: meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {},
    };

    const supabase = createServiceSupabase();
    const { error } = await supabase.from("ad_events").insert(row);

    if (error) {
      console.error("[ads/event] insert error:", error);
      return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ads/event]", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

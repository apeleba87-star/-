import { NextRequest, NextResponse } from "next/server";
import { parseAndValidateRadarAdInquiry } from "@/lib/demand/radar-ad-inquiry";
import { createServiceSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const memoryHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, limit = 12, windowMs = 60_000): boolean {
  const now = Date.now();
  let entry = memoryHits.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryHits.set(ip, entry);
  }
  entry.count += 1;
  return entry.count <= limit;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = parseAndValidateRadarAdInquiry(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "문의 접수 시스템이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 }
    );
  }

  const d = parsed.data;
  const referer = request.headers.get("referer");

  try {
    const supabase = createServiceSupabase();
    const { error } = await supabase.from("radar_ad_inquiries").insert({
      company_name: d.companyName,
      contact_name: d.contactName,
      phone: d.phone,
      email: d.email || null,
      scope: d.scope,
      region_interest: d.regionInterest || null,
      category: d.category || null,
      message: d.message || null,
      consent_personal: d.consentPersonal,
      source_path: "/advertise",
      page_path: referer ? referer.slice(0, 1024) : null,
    });

    if (error) {
      console.error("[radar-ads/inquiry]", error);
      return NextResponse.json({ error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
    }
  } catch (e) {
    console.error("[radar-ads/inquiry]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

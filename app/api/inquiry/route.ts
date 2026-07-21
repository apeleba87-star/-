import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit-edge";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    inquiry_type?: string;
    service_slug?: string | null;
    region?: string;
    phone?: string;
    message?: string;
    ref_slug?: string;
    ref_path?: string;
    /** 봇 허니팟 — 채워지면 거절 */
    website?: string;
    _hp?: string;
  };

  if ((body.website && body.website.trim()) || (body._hp && body._hp.trim())) {
    return NextResponse.json({ ok: true });
  }

  const rl = await checkRateLimit("inquiry-route", clientIp(req), 8, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (!body.inquiry_type || !body.phone?.trim()) {
    return NextResponse.json({ ok: false, error: "연락처를 입력해 주세요." }, { status: 400 });
  }
  if (body.inquiry_type !== "regular" && body.inquiry_type !== "move_in") {
    return NextResponse.json({ ok: false, error: "잘못된 문의 유형입니다." }, { status: 400 });
  }

  const service = createServiceSupabase();
  const { error } = await service.from("cleaning_inquiries").insert({
    inquiry_type: body.inquiry_type,
    service_slug: body.service_slug ?? body.ref_slug ?? null,
    region: body.region?.trim() ?? null,
    phone: body.phone.trim(),
    message: body.message?.trim() ?? null,
    ref_slug: body.ref_slug ?? null,
    ref_path: body.ref_path ?? null,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

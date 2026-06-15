import { NextRequest, NextResponse } from "next/server";

import {
  MAGAM_REPORT_REASON_TYPES,
  type MagamReportReasonType,
} from "@/lib/magam/report-reasons";
import { checkRateLimit } from "@/lib/rate-limit-edge";
import { createClient, createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Body = {
  listingId?: string;
  shareSlug?: string;
  reasonType?: string;
  reasonText?: string;
};

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = await checkRateLimit("magam-report", ip, 8, 3600_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: "신고 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const reasonType = body.reasonType?.trim() as MagamReportReasonType | undefined;
  if (!reasonType || !MAGAM_REPORT_REASON_TYPES.includes(reasonType)) {
    return NextResponse.json({ ok: false, error: "신고 사유를 선택해 주세요." }, { status: 400 });
  }

  const reasonText = body.reasonText?.trim().slice(0, 500) || null;
  if (reasonType === "other" && (!reasonText || reasonText.length < 4)) {
    return NextResponse.json(
      { ok: false, error: "기타 사유는 4자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  const listingId = body.listingId?.trim();
  const shareSlug = body.shareSlug?.trim();
  if (!listingId && !shareSlug) {
    return NextResponse.json({ ok: false, error: "공고를 지정해 주세요." }, { status: 400 });
  }

  const supabase = createClient();
  let query = supabase.from("magam_listings_public").select("id, status");
  if (listingId) query = query.eq("id", listingId);
  else query = query.eq("share_slug", shareSlug!);

  const { data: listing } = await query.maybeSingle();
  if (!listing) {
    return NextResponse.json({ ok: false, error: "공고를 찾을 수 없습니다." }, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existing } = await supabase
      .from("magam_listing_reports")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("reporter_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "이미 접수된 신고가 검토 중입니다." },
        { status: 409 }
      );
    }
  }

  let service;
  try {
    service = createServiceSupabase();
  } catch {
    return NextResponse.json(
      { ok: false, error: "신고 접수를 일시적으로 할 수 없습니다." },
      { status: 503 }
    );
  }

  const { error } = await service.from("magam_listing_reports").insert({
    listing_id: listing.id,
    reporter_id: user?.id ?? null,
    reason_type: reasonType,
    reason_text: reasonText,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

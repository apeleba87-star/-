import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { kstYmd } from "@/lib/partners/kst-day";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  company_id?: string;
  event_type?: "detail_view" | "contact_click";
};

const EVENT_LOOKBACK_HOURS = 40;

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

function getSessionIdFromCookie(req: NextRequest): string | null {
  const raw = req.cookies.get("partner_sid")?.value?.trim();
  return raw || null;
}

function newSessionId(): string {
  return crypto.randomUUID();
}

type EventRow = {
  created_at: string;
  session_id: string | null;
  actor_user_id: string | null;
};

function isSameVisitorEventToday(
  rows: EventRow[],
  todayKst: string,
  sessionId: string,
  userId: string | null
): boolean {
  return rows.some((r) => {
    if (kstYmd(new Date(r.created_at)) !== todayKst) return false;
    if (userId && r.actor_user_id === userId) return true;
    if (r.session_id && r.session_id === sessionId) return true;
    return false;
  });
}

async function fetchRecentEventsForVisitor(
  service: ReturnType<typeof createServiceSupabase>,
  companyId: string,
  eventType: "detail_view" | "contact_click",
  sessionId: string,
  userId: string | null
): Promise<EventRow[]> {
  if (!userId && !sessionId) return [];

  const since = new Date(Date.now() - EVENT_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  let q = service
    .from("partner_contact_events")
    .select("created_at, session_id, actor_user_id")
    .eq("company_id", companyId)
    .eq("event_type", eventType)
    .gte("created_at", since);

  if (userId && sessionId) {
    q = q.or(`actor_user_id.eq.${userId},session_id.eq.${sessionId}`);
  } else if (userId) {
    q = q.eq("actor_user_id", userId);
  } else {
    q = q.eq("session_id", sessionId);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[api/partners/contact] fetch recent events:", error.message);
    return [];
  }
  return (data ?? []) as EventRow[];
}

/** 오늘 이미 집계된 방문자인지 (로그인 시 user 우선, 비로그인은 session_id) */
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("company_id")?.trim() ?? "";
  if (!companyId) {
    return NextResponse.json({ error: "company_id가 필요합니다." }, { status: 400 });
  }

  const sessionId = getSessionIdFromCookie(req);
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  const service = createServiceSupabase();
  const { data: company } = await service
    .from("partner_companies")
    .select("id, status, phone")
    .eq("id", companyId)
    .maybeSingle();
  if (!company || company.status !== "active") {
    return NextResponse.json({ error: "업체를 찾을 수 없습니다." }, { status: 404 });
  }

  const todayKst = kstYmd();
  const rows = await fetchRecentEventsForVisitor(
    service,
    companyId,
    "contact_click",
    sessionId ?? "",
    user?.id ?? null
  );
  const alreadyLoggedContactToday = isSameVisitorEventToday(rows, todayKst, sessionId ?? "", user?.id ?? null);

  return NextResponse.json({
    alreadyLoggedContactToday,
    phone: alreadyLoggedContactToday ? (company.phone ?? null) : null,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const companyId = body?.company_id?.trim() ?? "";
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "company_id가 필요합니다." }, { status: 400 });
  }
  if (body?.event_type !== "contact_click" && body?.event_type !== "detail_view") {
    return NextResponse.json({ ok: false, error: "허용되지 않은 이벤트입니다." }, { status: 400 });
  }

  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  const service = createServiceSupabase();
  const { data: company } = await service
    .from("partner_companies")
    .select("id, status, phone")
    .eq("id", companyId)
    .maybeSingle();
  if (!company || company.status !== "active") {
    return NextResponse.json({ ok: false, error: "업체를 찾을 수 없습니다." }, { status: 404 });
  }

  let sessionId = getSessionIdFromCookie(req);
  if (!sessionId) {
    sessionId = newSessionId();
  }

  const todayKst = kstYmd();
  const eventType = body.event_type;

  const recent = await fetchRecentEventsForVisitor(service, companyId, eventType, sessionId, user?.id ?? null);
  const duplicateToday = isSameVisitorEventToday(recent, todayKst, sessionId, user?.id ?? null);

  if (duplicateToday) {
    const res = NextResponse.json({
      ok: true,
      skipped_duplicate: true,
      phone: eventType === "contact_click" ? (company.phone ?? null) : null,
    });
    res.cookies.set("partner_sid", sessionId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 90,
    });
    return res;
  }

  const ipHash = hashIp(getClientIp(req));
  const userAgent = req.headers.get("user-agent");
  const referrer = req.headers.get("referer");

  const { error: insertError } = await service.from("partner_contact_events").insert({
    company_id: companyId,
    event_type: eventType,
    actor_user_id: user?.id ?? null,
    session_id: sessionId,
    ip_hash: ipHash,
    user_agent: userAgent,
    referrer,
  });
  if (insertError) {
    console.error("[api/partners/contact] insert failed:", insertError.message);
    return NextResponse.json({ ok: false, error: "이벤트 저장에 실패했습니다." }, { status: 500 });
  }

  revalidatePath("/admin/partners");

  const response = NextResponse.json({
    ok: true,
    skipped_duplicate: false,
    phone: eventType === "contact_click" ? (company.phone ?? null) : null,
  });
  response.cookies.set("partner_sid", sessionId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}

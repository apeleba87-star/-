import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";
import { writeCleanidexAuditLog } from "@/lib/cleanidex/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQ_SELECT =
  "id, client_id, content, agreed_at, agreed_contact_name, agreed_contact_phone, notes, created_by, created_at";

const STALE_DAYS = 30;

async function ensureClientAccessible(clientId: string, companyId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  const { clientId } = await params;
  if (!(await ensureClientAccessible(clientId, context.companyId))) {
    return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const includeHistory = sp.get("history") === "1";
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") ?? 20)));

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("client_requirements")
    .select(REQ_SELECT)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(includeHistory ? limit : 1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const rows = data ?? [];
  const current = rows[0] ?? null;
  const isStale = (() => {
    if (!current) return false;
    const agreedAt = Date.parse(current.agreed_at as unknown as string);
    if (!Number.isFinite(agreedAt)) return false;
    const ageMs = Date.now() - agreedAt;
    return ageMs > STALE_DAYS * 24 * 3600 * 1000;
  })();

  return NextResponse.json({
    ok: true,
    current,
    is_stale: isStale,
    stale_threshold_days: STALE_DAYS,
    history: includeHistory ? rows : undefined,
  });
}

type CreateBody = {
  content?: string;
  agreed_at?: string;
  agreed_contact_name?: string | null;
  agreed_contact_phone?: string | null;
  notes?: string | null;
};

function trimToNull(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }
  const { clientId } = await params;
  if (!(await ensureClientAccessible(clientId, context.companyId))) {
    return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
  }

  if (context.roleCode !== "admin") {
    return NextResponse.json({ ok: false, error: "admin_required" }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ ok: false, error: "content_required" }, { status: 400 });
  if (content.length > 5000) {
    return NextResponse.json({ ok: false, error: "content_too_long" }, { status: 400 });
  }

  // agreed_at: 빈 값이면 NOW().
  let agreedAtIso: string;
  if (typeof body.agreed_at === "string" && body.agreed_at.trim()) {
    const d = new Date(body.agreed_at.trim());
    if (!Number.isFinite(d.valueOf())) {
      return NextResponse.json({ ok: false, error: "agreed_at_invalid" }, { status: 400 });
    }
    agreedAtIso = d.toISOString();
  } else {
    agreedAtIso = new Date().toISOString();
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .schema("cleanidex")
    .from("client_requirements")
    .insert({
      company_id: context.companyId,
      client_id: clientId,
      content: content.slice(0, 5000),
      agreed_at: agreedAtIso,
      agreed_contact_name: trimToNull(body.agreed_contact_name, 200),
      agreed_contact_phone: trimToNull(body.agreed_contact_phone, 50),
      notes: trimToNull(body.notes, 2000),
      created_by: context.userId,
    })
    .select(REQ_SELECT)
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await writeCleanidexAuditLog({
    companyId: context.companyId,
    actorUserId: context.userId,
    action: "client_requirement_created",
    targetTable: "client_requirements",
    targetId: data.id,
    metadata: {
      client_id: clientId,
      agreed_at: agreedAtIso,
      content_length: content.length,
    },
    req,
  });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

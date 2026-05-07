import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_DAYS = 30;

type Row = {
  id: string;
  client_id: string;
  content: string;
  agreed_at: string;
  agreed_contact_name: string | null;
  agreed_contact_phone: string | null;
  created_at: string;
};

type ClientRow = { id: string; name: string };

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const onlyStale = sp.get("stale") === "1";

  const supabase = await createServerSupabase();

  // 회사 전체 거래처 가져오기
  const { data: clients, error: clErr } = await supabase
    .schema("cleanidex")
    .from("clients")
    .select("id, name")
    .eq("company_id", context.companyId);
  if (clErr) return NextResponse.json({ ok: false, error: clErr.message }, { status: 400 });

  const clientList = (clients ?? []) as ClientRow[];
  if (clientList.length === 0) {
    return NextResponse.json({ ok: true, data: [], stale_threshold_days: STALE_DAYS });
  }
  const clientById = new Map(clientList.map((c) => [c.id, c]));

  // 거래처별 최신 1건: DB RPC (DISTINCT ON) — 전체 이력 스캔 방지
  const { data: latestRows, error: rpcErr } = await supabase.rpc("cleanidex_company_latest_client_requirements", {
    p_company_id: context.companyId,
  });
  if (rpcErr) return NextResponse.json({ ok: false, error: rpcErr.message }, { status: 400 });

  const clientIdSet = new Set(clientList.map((c) => c.id));
  const latestForCompany = ((latestRows ?? []) as Row[]).filter((r) => clientIdSet.has(r.client_id));

  const now = Date.now();
  const enriched = latestForCompany.map((r) => {
    const agreedAt = Date.parse(r.agreed_at);
    const ageDays = Number.isFinite(agreedAt) ? Math.floor((now - agreedAt) / (24 * 3600 * 1000)) : null;
    return {
      ...r,
      client_name: clientById.get(r.client_id)?.name ?? null,
      age_days: ageDays,
      is_stale: ageDays !== null ? ageDays > STALE_DAYS : false,
    };
  });

  const filtered = onlyStale ? enriched.filter((e) => e.is_stale) : enriched;
  filtered.sort((a, b) => (b.age_days ?? 0) - (a.age_days ?? 0));

  return NextResponse.json({
    ok: true,
    data: filtered,
    stale_threshold_days: STALE_DAYS,
  });
}

import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

/**
 * 마감된 입찰 공고: 일별 집계를 tender_period_stats에 저장한 뒤 삭제.
 * - "현재 진행 중인 공고만 유지", 과거는 "몇 건"만 보관.
 * - bid_clse_dt < NOW() 인 공고를 대상으로, 일별 closed_count·budget_total 집계 후 삭제.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();

  const { data: toDelete, error: selectError } = await supabase
    .from("tenders")
    .select("id, bid_clse_dt, base_amt")
    .not("bid_clse_dt", "is", null)
    .lt("bid_clse_dt", new Date().toISOString());

  if (selectError) {
    return NextResponse.json({ ok: false, error: selectError.message }, { status: 500 });
  }

  const rows = toDelete ?? [];
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      deleted: 0,
      message: "삭제할 마감 공고 없음",
    });
  }

  const byDate = new Map<string, { count: number; budget: number }>();
  for (const r of rows) {
    const dt = r.bid_clse_dt ? new Date(r.bid_clse_dt) : null;
    const dateKey = dt
      ? new Date(dt.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : "";
    if (!dateKey) continue;
    const cur = byDate.get(dateKey) ?? { count: 0, budget: 0 };
    cur.count += 1;
    cur.budget += Number(r.base_amt) || 0;
    byDate.set(dateKey, cur);
  }

  for (const [stats_date, { count, budget }] of byDate) {
    const { data: existing } = await supabase
      .from("tender_period_stats")
      .select("closed_count, budget_total")
      .eq("stats_date", stats_date)
      .eq("period_type", "day")
      .maybeSingle();
    const prevCount = existing?.closed_count ?? 0;
    const prevBudget = Number(existing?.budget_total ?? 0);
    const { error: upErr } = await supabase.from("tender_period_stats").upsert(
      {
        stats_date,
        period_type: "day",
        closed_count: prevCount + count,
        budget_total: prevBudget + (budget || 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stats_date,period_type" }
    );
    if (upErr) {
      return NextResponse.json(
        { ok: false, error: `tender_period_stats 저장 실패: ${upErr.message}` },
        { status: 500 }
      );
    }
  }

  const ids = rows.map((r) => r.id);
  const BATCH = 500;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error: deleteError } = await supabase.from("tenders").delete().in("id", chunk);
    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    deleted: ids.length,
    stats_updated: byDate.size,
    message: `마감 공고 ${ids.length}건 집계 후 삭제됨 (${byDate.size}일치)`,
  });
}

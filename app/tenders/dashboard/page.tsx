import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import TendersDashboardClient from "./TendersDashboardClient";

export const revalidate = 60;

export default async function TendersDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ clean_only?: string }>;
}) {
  const params = await searchParams;
  const cleanOnly = params.clean_only !== "0";
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const todayEnd = today + "T23:59:59.999Z";
  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const in72h = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { count: todayCount } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .gte("bid_ntce_dt", today)
    .lt("bid_ntce_dt", todayEnd);

  const { count: todayCleanCount } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .gte("bid_ntce_dt", today)
    .lt("bid_ntce_dt", todayEnd)
    .eq("is_clean_related", true);

  const { count: currentOpenCleanCount } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .gt("bid_clse_dt", now)
    .eq("is_clean_related", true);

  let closingSoonQ = supabase
    .from("tenders")
    .select("id, bid_ntce_nm, ntce_instt_nm, bid_clse_dt, is_clean_related")
    .gte("bid_clse_dt", in24h)
    .lte("bid_clse_dt", in72h)
    .order("bid_clse_dt", { ascending: true })
    .limit(50);
  if (cleanOnly) closingSoonQ = closingSoonQ.eq("is_clean_related", true);
  const { data: closingSoon } = await closingSoonQ;

  const days: { date: string; count: number; cleanCount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = d.toISOString().slice(0, 10);
    const end = start + "T23:59:59.999Z";
    const { count } = await supabase
      .from("tenders")
      .select("*", { count: "exact", head: true })
      .gte("bid_ntce_dt", start)
      .lt("bid_ntce_dt", end);
    const { count: cleanCount } = await supabase
      .from("tenders")
      .select("*", { count: "exact", head: true })
      .gte("bid_ntce_dt", start)
      .lt("bid_ntce_dt", end)
      .eq("is_clean_related", true);
    days.push({ date: start, count: count ?? 0, cleanCount: cleanCount ?? 0 });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">입찰 대시보드 (오늘)</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500">오늘 올라온 공고</h3>
          <p className="mt-1 text-3xl font-bold text-slate-800">{todayCount ?? 0}건</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500">오늘 청소 관련</h3>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{todayCleanCount ?? 0}건</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500">진행 중 청소 관련</h3>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{currentOpenCleanCount ?? 0}건</p>
        </div>
        <Link href="/tenders" className="card block hover:border-blue-200">
          <h3 className="text-sm font-medium text-slate-500">전체 목록</h3>
          <p className="mt-1 text-blue-600">보기 →</p>
        </Link>
      </div>

      <section className="mt-10">
        <TendersDashboardClient cleanOnly={cleanOnly} closingSoon={closingSoon ?? []} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">최근 7일 공고 추이</h2>
        <div className="flex items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
          {days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center">
              <span className="text-xs text-slate-500">{d.date.slice(5)}</span>
              <div className="mt-1 flex w-full gap-0.5">
                <div
                  className="rounded bg-slate-200"
                  style={{
                    height: `${Math.max(4, (d.count / Math.max(1, Math.max(...days.map((x) => x.count)))) * 60)}px`,
                    flex: 1,
                  }}
                  title={`전체 ${d.count}건`}
                />
                <div
                  className="rounded bg-emerald-400"
                  style={{
                    height: `${Math.max(4, (d.cleanCount / Math.max(1, Math.max(...days.map((x) => x.count)))) * 60)}px`,
                    flex: 1,
                  }}
                  title={`청소 ${d.cleanCount}건`}
                />
              </div>
              <span className="mt-1 text-xs font-medium">{d.count} / {d.cleanCount}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

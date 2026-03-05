import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import TendersListClient from "./TendersListClient";

export const revalidate = 60;

function dday(clseDt: string | null): string {
  if (!clseDt) return "—";
  const end = new Date(clseDt).getTime();
  const now = Date.now();
  const day = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  if (day < 0) return "마감";
  if (day === 0) return "D-Day";
  return `D-${day}`;
}

export default async function TendersPage({
  searchParams,
}: {
  searchParams: Promise<{ clean_only?: string }>;
}) {
  const params = await searchParams;
  const cleanOnly = params.clean_only !== "0";
  const supabase = createClient();
  let q = supabase
    .from("tenders")
    .select("id, bid_ntce_no, bid_ntce_ord, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_ntce_dt, bid_clse_dt, is_clean_related")
    .order("bid_clse_dt", { ascending: true, nullsFirst: false })
    .limit(100);
  if (cleanOnly) q = q.eq("is_clean_related", true);
  const { data: tenders } = await q;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">입찰 공고</h1>
        <TendersListClient cleanOnly={cleanOnly} />
      </div>
      {!tenders?.length ? (
        <div className="card">
          <p className="text-slate-500">등록된 공고가 없습니다.</p>
          {cleanOnly && (
            <Link href="/tenders?clean_only=0" className="mt-2 inline-block text-blue-600 hover:underline">
              전체 보기
            </Link>
          )}
          <p className="mt-2 text-sm text-slate-500">
            크론에서 <code className="rounded bg-slate-100 px-1">/api/cron/fetch-g2b</code>를 호출하거나, 공공데이터포털 인증키를 설정한 뒤 수집을 실행하세요.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse rounded-lg border border-slate-200 bg-white text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 font-semibold text-slate-800">공고명</th>
                <th className="p-3 font-semibold text-slate-800">기관</th>
                <th className="p-3 font-semibold text-slate-800">지역</th>
                <th className="p-3 font-semibold text-slate-800">기초금액</th>
                <th className="p-3 font-semibold text-slate-800">공고일</th>
                <th className="p-3 font-semibold text-slate-800">마감일</th>
                <th className="p-3 font-semibold text-slate-800">D-day</th>
              </tr>
            </thead>
            <tbody>
              {tenders.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <Link href={`/tenders/${t.id}`} className="font-medium text-blue-600 hover:underline">
                      {(t.bid_ntce_nm as string) || "(제목 없음)"}
                    </Link>
                    {t.is_clean_related && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">청소</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{t.ntce_instt_nm as string}</td>
                  <td className="p-3 text-slate-600">{t.bsns_dstr_nm as string}</td>
                  <td className="p-3">
                    {t.base_amt != null ? `${(Number(t.base_amt) / 10000).toFixed(0)}만원` : "—"}
                  </td>
                  <td className="p-3 text-slate-600">
                    {t.bid_ntce_dt ? new Date(t.bid_ntce_dt as string).toLocaleDateString("ko-KR") : "—"}
                  </td>
                  <td className="p-3 text-slate-600">
                    {t.bid_clse_dt ? new Date(t.bid_clse_dt as string).toLocaleDateString("ko-KR") : "—"}
                  </td>
                  <td className="p-3">
                    <span className={dday(t.bid_clse_dt as string) === "D-Day" || dday(t.bid_clse_dt as string) === "마감" ? "font-medium text-red-600" : ""}>
                      {dday(t.bid_clse_dt as string)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

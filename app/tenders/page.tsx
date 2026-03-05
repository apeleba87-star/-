import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import TendersListClient from "./TendersListClient";

export const revalidate = 60;

export type CategoryFilter = "all" | "cleaning" | "disinfection" | "both";

function dday(clseDt: string | null): string {
  if (!clseDt) return "—";
  const end = new Date(clseDt).getTime();
  const now = Date.now();
  const day = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  if (day < 0) return "마감";
  if (day === 0) return "D-Day";
  return `D-${day}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCategoryFilter(q: any, category: CategoryFilter) {
  if (category === "all") return q;
  if (category === "cleaning") return q.contains("categories", ["cleaning"]);
  if (category === "disinfection") return q.contains("categories", ["disinfection"]);
  if (category === "both") return q.overlaps("categories", ["cleaning", "disinfection"]);
  return q;
}

export default async function TendersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = (params.category as CategoryFilter) || "both";
  const validCategory: CategoryFilter =
    ["all", "cleaning", "disinfection", "both"].includes(category) ? category : "both";

  const supabase = createClient();
  let q = supabase
    .from("tenders")
    .select("id, bid_ntce_no, bid_ntce_ord, bid_ntce_nm, ntce_instt_nm, bsns_dstr_nm, base_amt, bid_ntce_dt, bid_clse_dt, categories")
    .order("bid_clse_dt", { ascending: true, nullsFirst: false })
    .limit(100);
  q = applyCategoryFilter(q, validCategory);
  const { data: tenders } = await q;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">입찰 공고</h1>
        <TendersListClient currentCategory={validCategory} />
      </div>
      {!tenders?.length ? (
        <div className="card">
          <p className="text-slate-500">등록된 공고가 없습니다.</p>
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
                    <span className="ml-2 flex flex-wrap gap-1">
                      {(t.categories as string[])?.includes("cleaning") && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">청소</span>
                      )}
                      {(t.categories as string[])?.includes("disinfection") && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">소독·방역</span>
                      )}
                    </span>
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

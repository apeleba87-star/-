import Link from "next/link";
import { listProducts } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { loadProductSalesClickStats } from "@/lib/knowledge-hub/product-sales-clicks";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function AdminProductSalesClicksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const today = kstToday();
  const to = first(sp.to) && /^\d{4}-\d{2}-\d{2}$/.test(first(sp.to)!) ? first(sp.to)! : today;
  const fromDefault = addDays(to, -29);
  const from =
    first(sp.from) && /^\d{4}-\d{2}-\d{2}$/.test(first(sp.from)!) ? first(sp.from)! : fromDefault;

  const { byProduct, byDay, total } = await loadProductSalesClickStats({ from, to });
  const nameById = new Map(listProducts().map((p) => [p.id, p.name]));

  const presets = [
    { label: "7일", from: addDays(today, -6), to: today },
    { label: "30일", from: addDays(today, -29), to: today },
    { label: "90일", from: addDays(today, -89), to: today },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">구매하기 클릭</h1>
        <p className="mt-1 text-sm text-slate-500">
          제품 상세·레시피·가이드의 구매 CTA 클릭 수입니다. `/go/buy`·`/go/p` 경유분만 집계됩니다.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">시작일</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">종료일</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          조회
        </button>
        <div className="flex gap-2">
          {presets.map((p) => (
            <Link
              key={p.label}
              href={`/admin/product-sales-clicks?from=${p.from}&to=${p.to}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <strong className="tabular-nums text-slate-900">{total.toLocaleString()}</strong>회 클릭 · {from} ~ {to}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">제품별</h2>
        {byProduct.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            해당 기간 클릭이 없습니다. 마이그레이션 적용 후 구매하기를 눌러 보면 여기에 쌓입니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-700">제품</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">클릭</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">세션(추정)</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">최근 클릭</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">링크</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((row) => (
                  <tr key={row.product_id} className="border-b border-slate-100">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">
                        {nameById.get(row.product_id) ?? row.product_id}
                      </div>
                      <div className="text-xs text-slate-400">{row.product_id}</div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-900">
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">
                      {row.unique_sessions.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {row.last_clicked_at
                        ? new Date(row.last_clicked_at).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/products/${encodeURIComponent(row.product_id)}`}
                        className="text-sky-700 underline hover:text-sky-900"
                        target="_blank"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">일별</h2>
        {byDay.length === 0 ? (
          <p className="text-sm text-slate-500">데이터 없음</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-700">일자 (KST)</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">클릭</th>
                </tr>
              </thead>
              <tbody>
                {byDay.map((row) => (
                  <tr key={row.day} className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-700">{row.day}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-900">
                      {row.clicks.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

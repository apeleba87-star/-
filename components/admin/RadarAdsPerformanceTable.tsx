import Link from "next/link";
import type { RadarAdSlotPerformanceRow } from "@/lib/demand/radar-ad-performance";

function manageHref(row: RadarAdSlotPerformanceRow) {
  const params = new URLSearchParams({
    banner: row.bannerId,
    slot: String(row.slotIndex),
    section: row.scope,
  });
  return `/admin/radar-ads/manage?${params.toString()}`;
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function fmtCtr(ctr: number | null): string {
  if (ctr == null) return "—";
  return `${ctr.toFixed(2)}%`;
}

export default function RadarAdsPerformanceTable({ rows }: { rows: RadarAdSlotPerformanceRow[] }) {
  const liveRows = rows.filter((r) => r.isLive);
  const totals = rows.reduce(
    (acc, r) => ({
      imp7: acc.imp7 + r.impressionsRaw7d,
      imp30: acc.imp30 + r.impressionsRaw30d,
      clicks30: acc.clicks30 + r.clicksRaw30d,
    }),
    { imp7: 0, imp30: 0, clicks30: 0 }
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">광고 성과</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            노출: 배너 50% 이상·0.4초 이상 표시 시 집계 · 동일 세션·슬롯 30분 쿨다운 · 클릭은
            배너 클릭 1회 = 1회
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <span>
            게재 중 <strong className="text-slate-900">{liveRows.length}</strong>슬롯
          </span>
          <span>
            30일 노출 <strong className="text-slate-900">{fmt(totals.imp30)}</strong>
          </span>
          <span>
            30일 클릭 <strong className="text-slate-900">{fmt(totals.clicks30)}</strong>
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          등록된 슬롯이 없습니다. 광고를 등록하면 성과가 여기에 표시됩니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">광고</th>
                <th className="px-4 py-3 font-medium">구분</th>
                <th className="px-4 py-3 font-medium text-right">노출 7일</th>
                <th className="px-4 py-3 font-medium text-right">노출 30일</th>
                <th className="px-4 py-3 font-medium text-right">순방문 30일</th>
                <th className="px-4 py-3 font-medium text-right">클릭 30일</th>
                <th className="px-4 py-3 font-medium text-right">CTR 30일</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.slotId} className={row.isLive ? "" : "bg-slate-50/50 text-slate-500"}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {row.advertiserName ? `${row.advertiserName} · ` : ""}
                      {row.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      슬롯 {row.slotIndex}
                      {row.isLive ? (
                        <span className="ml-1.5 text-emerald-600">게재</span>
                      ) : (
                        <span className="ml-1.5">미게재</span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{row.regionLabel}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(row.impressionsRaw7d)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                    {fmt(row.impressionsRaw30d)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {fmt(row.impressionsUnique30d)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(row.clicksRaw30d)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtCtr(row.ctr30d)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={manageHref(row)}
                      className="text-xs font-medium text-teal-700 hover:underline"
                    >
                      편집
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        노출 30일 = raw(표시 횟수) · 순방문 30일 = 방문자(anon) 기준 unique · CTR = 클릭 ÷ 노출
        30일
      </p>
    </section>
  );
}

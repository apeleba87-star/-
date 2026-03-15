"use client";

type Row = {
  stats_date: string;
  campaign_id: string | null;
  slot_key: string;
  impressions_raw: number;
  impressions_deduped: number;
  clicks_raw: number;
  clicks_deduped: number;
};

type Props = {
  rows: Row[];
  campaignTitles: Map<string, string>;
};

export default function AdDailyStatsTable({ rows, campaignTitles }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
        최근 7일 집계 데이터가 없습니다. 직접 수주 광고 노출·클릭이 발생하면 크론으로 집계 후 표시됩니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 font-semibold text-slate-700">일자</th>
            <th className="px-4 py-3 font-semibold text-slate-700">캠페인</th>
            <th className="px-4 py-3 font-semibold text-slate-700">슬롯</th>
            <th className="px-4 py-3 font-semibold text-slate-700">노출(raw)</th>
            <th className="px-4 py-3 font-semibold text-slate-700">노출(dedup)</th>
            <th className="px-4 py-3 font-semibold text-slate-700">클릭(raw)</th>
            <th className="px-4 py-3 font-semibold text-slate-700">클릭(dedup)</th>
            <th className="px-4 py-3 font-semibold text-slate-700">CTR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const imp = r.impressions_raw || 0;
            const clicks = r.clicks_deduped ?? r.clicks_raw ?? 0;
            const ctr = imp > 0 ? ((clicks / imp) * 100).toFixed(2) + "%" : "—";
            const title = r.campaign_id ? campaignTitles.get(r.campaign_id) ?? r.campaign_id : "—";
            return (
              <tr key={`${r.stats_date}-${r.campaign_id}-${r.slot_key}-${i}`} className="border-b border-slate-100">
                <td className="px-4 py-2.5 text-slate-700">{r.stats_date}</td>
                <td className="max-w-[180px] truncate px-4 py-2.5 text-slate-700" title={title}>
                  {title}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{r.slot_key}</td>
                <td className="px-4 py-2.5 tabular-nums text-slate-700">{r.impressions_raw.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600">{r.impressions_deduped.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-slate-700">{r.clicks_raw.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600">{r.clicks_deduped.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-slate-700">{ctr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

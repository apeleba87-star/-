import type {
  MagamAdminStatsBundle,
  MagamAdSlotPerformanceRow,
} from "@/lib/magam/admin-stats";

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function fmtCtr(ctr: number | null): string {
  if (ctr == null) return "—";
  return `${ctr.toFixed(2)}%`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SlotTable({
  title,
  subtitle,
  rows,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  rows: MagamAdSlotPerformanceRow[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">광고</th>
                <th className="px-4 py-3 font-medium">채널</th>
                <th className="px-4 py-3 font-medium">구분</th>
                <th className="px-4 py-3 font-medium text-right">노출</th>
                <th className="px-4 py-3 font-medium text-right">클릭</th>
                <th className="px-4 py-3 font-medium text-right">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={`${row.slotId}-${row.channel}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {row.advertiserName ? `${row.advertiserName} · ` : ""}
                      {row.title}
                    </p>
                    <p className="text-xs text-slate-500">슬롯 {row.slotIndex || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.channel === "magam" ? (
                      <span className="rounded bg-violet-100 px-2 py-0.5 font-medium text-violet-800">
                        마감앱
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        웹
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{row.regionLabel}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                    {fmt(row.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(row.clicks)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtCtr(row.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function MagamStatsDashboard({ data }: { data: MagamAdminStatsBundle }) {
  const { range, usage, channelTotals, magamScreens, slotRows } = data;
  const magamSlots = slotRows.filter((r) => r.channel === "magam");
  const webSlots = slotRows.filter((r) => r.channel === "web");

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">마감앱 사용 (누적)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="공고 작성자" value={`${fmt(usage.totalPosters)}명`} hint="magam_listings 기준" />
          <StatCard label="총 공고" value={`${fmt(usage.totalListings)}건`} />
          <StatCard label="모집 중" value={`${fmt(usage.openListings)}건`} />
          <StatCard
            label="연동 동의"
            value={`${fmt(usage.consentUsers)}명`}
            hint="profiles.magam_sync_consent_at"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          기간 내 활동 ({range.from} ~ {range.to}, KST)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="기간 내 신규 작성자"
            value={`${fmt(usage.postersInRange)}명`}
            hint="해당 기간에 공고를 등록한 사용자"
          />
          <StatCard label="기간 내 신규 공고" value={`${fmt(usage.listingsInRange)}건`} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">직거래 배너 — 채널별 성과</h2>
        <p className="text-xs text-slate-500">
          동일 슬롯이 입주레이더·채용(웹)과 마감앱에 노출됩니다. 마감앱은 meta.surface=magam_app
          또는 page_path magam:* 로 구분합니다.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">채널</th>
                <th className="px-4 py-3 font-medium text-right">노출</th>
                <th className="px-4 py-3 font-medium text-right">클릭</th>
                <th className="px-4 py-3 font-medium text-right">순방문(anon)</th>
                <th className="px-4 py-3 font-medium text-right">세션</th>
                <th className="px-4 py-3 font-medium text-right">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {channelTotals.map((row) => (
                <tr key={row.channel}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {fmt(row.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(row.clicks)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {fmt(row.uniqueVisitors)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {fmt(row.uniqueSessions)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtCtr(row.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">마감앱 화면별 노출</h2>
        {magamScreens.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            선택 기간에 마감앱 광고 이벤트가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">화면</th>
                  <th className="px-4 py-3 font-medium">page_path</th>
                  <th className="px-4 py-3 font-medium text-right">노출</th>
                  <th className="px-4 py-3 font-medium text-right">클릭</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {magamScreens.map((row) => (
                  <tr key={row.pagePath}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.pagePath}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(row.impressions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(row.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SlotTable
        title="슬롯별 성과 — 마감앱"
        subtitle="선택 기간 · 마감앱 채널만"
        rows={magamSlots}
        emptyMessage="선택 기간에 마감앱 슬롯 노출·클릭이 없습니다."
      />

      <SlotTable
        title="슬롯별 성과 — 클린아이덱스 웹"
        subtitle="입주레이더·채용·일당 리포트 등 웹 채널"
        rows={webSlots}
        emptyMessage="선택 기간에 웹 슬롯 노출·클릭이 없습니다."
      />
    </div>
  );
}

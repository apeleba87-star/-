import Link from "next/link";
import RadarAdArchiveExpiredButton from "@/components/admin/RadarAdArchiveExpiredButton";
import RadarAdsPerformanceTable from "@/components/admin/RadarAdsPerformanceTable";
import type { RadarAdSlotPerformanceRow } from "@/lib/demand/radar-ad-performance";
import type { RadarAdsDashboardStats } from "@/lib/demand/radar-ads-admin-stats";
import { RADAR_AD_EXPIRING_SOON_DAYS, RADAR_AD_SLOTS_PER_BANNER } from "@/lib/demand/radar-ads-slot";

function manageHref(
  bannerId: string,
  opts?: { slotIndex?: number; section?: "national" | "regional" }
) {
  const params = new URLSearchParams({ banner: bannerId });
  if (opts?.section) params.set("section", opts.section);
  if (opts?.slotIndex != null) params.set("slot", String(opts.slotIndex));
  return `/admin/radar-ads/manage?${params.toString()}`;
}

function manageRegionalHref(bannerId: string) {
  return manageHref(bannerId, { section: "regional" });
}

function StatCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "slate" | "amber" | "emerald" | "teal";
}) {
  const toneClass = {
    slate: "border-slate-200",
    amber: "border-amber-200 bg-amber-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
    teal: "border-teal-200 bg-teal-50/40",
  }[tone];

  return (
    <div className={`card ${toneClass}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function RadarAdsDashboard({
  stats,
  performanceRows,
}: {
  stats: RadarAdsDashboardStats;
  performanceRows: RadarAdSlotPerformanceRow[];
}) {
  return (
    <div className="space-y-8">
      <RadarAdsPerformanceTable rows={performanceRows} />

      {stats.staleActive.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-orange-950">기간 만료 · 정리 필요</h2>
              <p className="mt-1 text-sm text-orange-900/80">
                종료일이 지났는데 게재(active) 상태인 슬롯입니다. 삭제하지 말고 중지로 보관하세요.
              </p>
            </div>
            <RadarAdArchiveExpiredButton count={stats.staleActive.length} />
          </div>
          <ul className="divide-y divide-orange-100 rounded-lg border border-orange-200 bg-white">
            {stats.staleActive.map((item) => (
              <li key={item.slotId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {item.advertiserName ? `${item.advertiserName} · ` : ""}
                    {item.title}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.regionLabel} · 슬롯 {item.slotIndex} · 종료 {item.endDate}
                  </p>
                </div>
                <Link
                  href={manageHref(item.bannerId, {
                    slotIndex: item.slotIndex,
                    section: item.scope,
                  })}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  종료 처리
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="만료·정리 필요"
          value={stats.staleActive.length}
          hint="게재 상태인데 종료일 경과"
          tone={stats.staleActive.length > 0 ? "amber" : "slate"}
        />
        <StatCard
          label="마감 임박"
          value={stats.expiringSoon.length}
          hint={`${RADAR_AD_EXPIRING_SOON_DAYS}일 이내 종료`}
          tone="amber"
        />
        <StatCard
          label="슬롯 가득 참"
          value={stats.fullRegions.length}
          hint={`지역당 ${RADAR_AD_SLOTS_PER_BANNER}개 게재 중`}
          tone="emerald"
        />
        <StatCard
          label="슬롯 여유"
          value={stats.openRegions.length}
          hint="게재 슬롯 1~2개 또는 비어 있음"
          tone="teal"
        />
        <StatCard
          label="전체 광고"
          value={stats.nationalLiveCount}
          hint={`게재 ${stats.nationalLiveCount}/${RADAR_AD_SLOTS_PER_BANNER} · 여유 ${stats.nationalOpenCount}`}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">마감 임박 광고</h2>
          <Link href="/admin/radar-ads/manage" className="text-sm font-medium text-teal-700 hover:underline">
            광고 관리 →
          </Link>
        </div>
        {stats.expiringSoon.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            {RADAR_AD_EXPIRING_SOON_DAYS}일 이내 종료 예정인 게재 광고가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {stats.expiringSoon.map((item) => (
              <li key={item.slotId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {item.advertiserName ? `${item.advertiserName} · ` : ""}
                    {item.title}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.regionLabel} · 슬롯 {item.slotIndex} · D-{item.daysLeft} (
                    {item.endDate})
                  </p>
                </div>
                <Link
                  href={manageHref(item.bannerId, {
                    slotIndex: item.slotIndex,
                    section: item.scope,
                  })}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  수정
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            슬롯 가득 참 ({stats.fullRegions.length})
          </h2>
          <p className="text-xs text-slate-500">지역당 {RADAR_AD_SLOTS_PER_BANNER}개 슬롯 모두 게재 중</p>
          {stats.fullRegions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              해당 지역이 없습니다.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
              {stats.fullRegions.map((r) => (
                <li key={r.bannerId}>
                  <Link
                    href={manageRegionalHref(r.bannerId)}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">
                      {r.regionLabelShort} ({r.liveCount})
                    </span>
                    {!r.enabled ? (
                      <span className="text-xs text-amber-600">노출 꺼짐</span>
                    ) : (
                      <span className="text-xs text-emerald-600">가득</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            슬롯 여유 ({stats.openRegions.length})
          </h2>
          <p className="text-xs text-slate-500">추가 게재·신규 광고 가능 지역</p>
          {stats.openRegions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              등록된 지역이 없거나 모두 가득 찼습니다.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
              {stats.openRegions.map((r) => (
                <li key={r.bannerId}>
                  <Link
                    href={manageRegionalHref(r.bannerId)}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">
                      {r.liveCount > 0
                        ? `${r.regionLabelShort} (${r.liveCount})`
                        : r.regionLabelShort}
                    </span>
                    <span className="text-xs text-teal-700">여유 {r.openCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

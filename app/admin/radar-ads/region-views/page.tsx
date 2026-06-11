import Link from "next/link";
import AdminDemandRegionViewPicker from "@/components/admin/AdminDemandRegionViewPicker";
import MonetizationSectionTabs from "@/components/admin/MonetizationSectionTabs";
import RadarAdsSubNav from "@/components/admin/RadarAdsSubNav";
import {
  currentKstYearMonth,
  isValidDemandRegionKey,
  loadDemandRegionViewRank,
  loadDemandRegionViewStats,
  type DemandRegionViewRankScope,
} from "@/lib/demand/region-view-events";
import { createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const DEFAULT_REGION_KEY = "district:seoul:gangseo-gu";

type Props = {
  searchParams: Promise<{ month?: string; region?: string; rank?: string }>;
};

function parseRankScope(raw: string | undefined): DemandRegionViewRankScope {
  if (raw === "city" || raw === "national" || raw === "all") return raw;
  return "district";
}

export default async function AdminDemandRegionViewsPage({ searchParams }: Props) {
  const { month: rawMonth, region: rawRegion, rank: rawRank } = await searchParams;
  const yearMonth = rawMonth?.trim() && /^\d{4}-\d{2}$/.test(rawMonth.trim()) ? rawMonth.trim() : currentKstYearMonth();
  const regionKey =
    rawRegion?.trim() && isValidDemandRegionKey(rawRegion.trim()) ? rawRegion.trim() : DEFAULT_REGION_KEY;
  const rankScope = parseRankScope(rawRank);

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch {
    return (
      <p className="text-red-600">
        SUPABASE_SERVICE_ROLE_KEY가 필요합니다. 지역 조회 통계를 불러올 수 없습니다.
      </p>
    );
  }

  const [stats, rank] = await Promise.all([
    loadDemandRegionViewStats(supabase, regionKey, yearMonth),
    loadDemandRegionViewRank(supabase, yearMonth, 50, rankScope),
  ]);

  const rankScopeLabel =
    rankScope === "district"
      ? "시·군·구"
      : rankScope === "city"
        ? "시·도"
        : rankScope === "national"
          ? "전국"
          : "전체";

  return (
    <div className="space-y-6">
      <MonetizationSectionTabs />
      <RadarAdsSubNav />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">입주레이더 지역 조회</h1>
        <p className="mt-1 text-sm text-slate-600">
          전국 시·도·시·군·구 조회 수 (KST 월, 로그인·비로그인 포함). 지역 광고 단가 참고용입니다.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block min-w-[140px]">
          <span className="text-xs font-semibold text-slate-600">월 (KST)</span>
          <input
            type="month"
            name="month"
            defaultValue={yearMonth}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block min-w-[200px] flex-1">
          <span className="text-xs font-semibold text-slate-600">region_key</span>
          <input
            type="text"
            name="region"
            defaultValue={regionKey}
            placeholder="district:seoul:gangseo-gu"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
          />
        </label>
        <input type="hidden" name="rank" value={rankScope} />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          조회
        </button>
      </form>

      <AdminDemandRegionViewPicker yearMonth={yearMonth} activeRegionKey={regionKey} />

      {stats ? (
        <section className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/50 to-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{yearMonth} (KST)</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{stats.regionLabel}</h2>
          <p className="mt-0.5 font-mono text-xs text-slate-500">{stats.regionKey}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
              <dt className="text-xs text-slate-500">총 조회</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
                {stats.viewsRaw.toLocaleString("ko-KR")}
              </dd>
            </div>
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
              <dt className="text-xs text-slate-500">세션(추정)</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
                {stats.uniqueSessions.toLocaleString("ko-KR")}
              </dd>
            </div>
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
              <dt className="text-xs text-slate-500">방문자(추정)</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
                {stats.uniqueVisitors.toLocaleString("ko-KR")}
              </dd>
            </div>
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
              <dt className="text-xs text-slate-500">로그인 사용자</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
                {stats.uniqueLoggedInUsers.toLocaleString("ko-KR")}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
            <span>허브 {stats.bySource.hub}</span>
            <span>· API {stats.bySource.region_scope}</span>
            <span>· SEO {stats.bySource.seo}</span>
            <span>· 공유 {stats.bySource.share}</span>
          </div>
        </section>
      ) : (
        <p className="text-sm text-slate-500">조회 데이터가 없거나 region_key가 올바르지 않습니다.</p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">이번 달 조회 상위</h2>
            <p className="mt-1 text-xs text-slate-500">DB 집계(RPC) · 최대 50곳</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["district", "시·군·구"],
                ["city", "시·도"],
                ["national", "전국"],
                ["all", "전체"],
              ] as const
            ).map(([id, label]) => (
              <Link
                key={id}
                href={`/admin/radar-ads/region-views?month=${yearMonth}&region=${encodeURIComponent(regionKey)}&rank=${id}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  rankScope === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">현재: {rankScopeLabel}</p>
        {rank.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            아직 기록이 없습니다. 마이그레이션 166·167 적용 후 트래픽이 쌓입니다.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">지역</th>
                  <th className="py-2 pr-4 text-right">총 조회</th>
                  <th className="py-2 text-right">세션</th>
                </tr>
              </thead>
              <tbody>
                {rank.map((row, idx) => (
                  <tr key={row.regionKey} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-4 tabular-nums text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/admin/radar-ads/region-views?month=${yearMonth}&region=${encodeURIComponent(row.regionKey)}&rank=${rankScope}`}
                        className="font-medium text-teal-800 hover:underline"
                      >
                        {row.regionLabel}
                      </Link>
                      <p className="font-mono text-[10px] text-slate-400">{row.regionKey}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                      {row.viewsRaw.toLocaleString("ko-KR")}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">
                      {row.uniqueSessions.toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        수집: 허브 포커스(세션 10분 쿨다운)·region-scope API·SEO·공유 링크. API IP 분당 120회 제한.
        통계는 DB에서 COUNT/GROUP BY로 집계합니다(167).
      </p>
    </div>
  );
}

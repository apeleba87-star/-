import Link from "next/link";
import MonetizationSectionTabs from "@/components/admin/MonetizationSectionTabs";
import { loadRadarAdsAdminBundle } from "@/lib/demand/radar-ads-admin-load";
import { addDaysToDateString, getKstTodayString } from "@/lib/jobs/kst-date";
import { loadMagamAdminStats, parseMagamStatsDateRange } from "@/lib/magam/admin-stats";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import MagamStatsDashboard from "./MagamStatsDashboard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string; to?: string }>;

export default async function AdminMagamStatsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = parseMagamStatsDateRange(params.from, params.to);
  const today = getKstTodayString();

  const sessionSupabase = await createServerSupabase();

  let statsSupabase;
  try {
    statsSupabase = createServiceSupabase();
  } catch {
    return (
      <div className="space-y-6">
        <MonetizationSectionTabs />
        <p className="text-red-600">
          SUPABASE_SERVICE_ROLE_KEY가 필요합니다. 마감앱 전체 공고·광고 통계를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  const bundle = await loadRadarAdsAdminBundle(sessionSupabase);
  const data = await loadMagamAdminStats(statsSupabase, range, bundle);

  const preset7From = addDaysToDateString(today, -6);
  const preset30From = addDaysToDateString(today, -29);
  const preset90From = addDaysToDateString(today, -89);

  return (
    <div className="space-y-6">
      <MonetizationSectionTabs />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">마감앱 통계</h1>
        <p className="mt-1 text-sm text-slate-600">
          마감앱 사용자·공고 수와 직거래 배너 성과를 클린아이덱스 웹과 구분해 확인합니다.
        </p>
      </div>

      <form
        method="get"
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[160px]">
            <span className="text-xs font-semibold text-slate-600">시작일 (KST)</span>
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              max={range.to}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block min-w-[160px]">
            <span className="text-xs font-semibold text-slate-600">종료일 (KST)</span>
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              max={today}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            조회
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-slate-500">빠른 선택:</span>
          <Link
            href={`/admin/magam-stats?from=${preset7From}&to=${today}`}
            className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200"
          >
            최근 7일
          </Link>
          <Link
            href={`/admin/magam-stats?from=${preset30From}&to=${today}`}
            className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200"
          >
            최근 30일
          </Link>
          <Link
            href={`/admin/magam-stats?from=${preset90From}&to=${today}`}
            className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200"
          >
            최근 90일
          </Link>
        </div>
      </form>

      <MagamStatsDashboard data={data} />
    </div>
  );
}

import MonetizationSectionTabs from "@/components/admin/MonetizationSectionTabs";
import RadarAdsSubNav from "@/components/admin/RadarAdsSubNav";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { buildRadarAdsDashboardStats } from "@/lib/demand/radar-ads-admin-stats";
import { loadRadarAdsAdminBundle } from "@/lib/demand/radar-ads-admin-load";
import { loadRadarAdPerformanceRows } from "@/lib/demand/radar-ad-performance";
import RadarAdsDashboard from "./RadarAdsDashboard";

export const dynamic = "force-dynamic";

export default async function AdminRadarAdsDashboardPage() {
  const supabase = await createServerSupabase();
  const bundle = await loadRadarAdsAdminBundle(supabase);
  let performanceSupabase = supabase;
  try {
    performanceSupabase = createServiceSupabase();
  } catch {
    // service role 없으면 RLS 세션으로 조회
  }
  const [stats, performanceRows] = await Promise.all([
    Promise.resolve(buildRadarAdsDashboardStats(bundle)),
    loadRadarAdPerformanceRows(performanceSupabase, bundle),
  ]);

  return (
    <div className="space-y-6">
      <MonetizationSectionTabs />
      <RadarAdsSubNav />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">입주레이더 광고 대시보드</h1>
        <p className="mt-1 text-sm text-slate-600">
          노출·클릭 성과와 마감 임박·슬롯 현황을 한눈에 확인할 수 있습니다.
        </p>
      </div>
      <RadarAdsDashboard stats={stats} performanceRows={performanceRows} />
    </div>
  );
}

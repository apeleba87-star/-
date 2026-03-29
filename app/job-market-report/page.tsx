import Link from "next/link";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";
import NewsCard from "@/components/news/NewsCard";

export const dynamic = "force-dynamic";

function formatJobWageListTitle(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일 말일 · 30일 구간 일당 리포트`;
}

export default async function JobMarketReportIndexPage() {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  const { data: profile } = user
    ? await authSupabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin" || profile?.role === "editor";

  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("job_wage_daily_reports")
    .select("report_date, headline")
    .order("report_date", { ascending: false })
    .limit(365);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
        <div className="page-shell py-10 lg:py-12">
          <div className="lg:text-center">
            <h1 className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              일당 리포트
            </h1>
            <p className="mt-4 text-sm text-red-600">목록을 불러오지 못했습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
        <div className="page-shell py-10 lg:py-12">
          <div className="lg:text-center">
            <h1 className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              일당 리포트
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
              저장된 30일 구간 리포트가 없습니다. 관리자에서「30일 기준 리포트 생성」을 실행해 주세요.
            </p>
          </div>
          <div className="mt-6">
            <NewsCategoryTabs current="job_wage" showPrivateTab={isAdmin} />
          </div>
          <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
            <Link href="/admin/job-wage-report" className="text-sm font-medium text-teal-700 hover:underline">
              관리자 · 일당 리포트
            </Link>
            <span className="mx-2 text-slate-300">·</span>
            <Link href="/marketing-report" className="text-sm font-medium text-teal-700 hover:underline">
              마케팅 리포트
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">구인 공고 · 일당 스냅샷</p>
          <h1 className="mt-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            일당 리포트
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            KST 달력 30일 구간을 한 번에 집계한 시·도별 평균 일당·직종 요약입니다. 갱신할 때마다 리포트는 1건으로 덮어씁니다.
          </p>
        </div>

        <div className="mt-6">
          <NewsCategoryTabs current="job_wage" showPrivateTab={isAdmin} />
        </div>

        <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-slate-500">
          {rows.length}건 (30일 구간 리포트는 보통 1건)
        </p>

        <ul className="mx-auto mt-8 grid w-full max-w-6xl min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.report_date}>
              <NewsCard
                href={`/job-market-report/${r.report_date}`}
                title={formatJobWageListTitle(r.report_date)}
                excerpt={r.headline}
                date={r.report_date}
                categoryTag="일당 리포트"
                accentSeed={r.report_date}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

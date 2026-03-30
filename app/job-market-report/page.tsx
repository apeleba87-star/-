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
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-teal-50/50">
        <div className="page-shell py-10 lg:py-12">
          <div className="lg:text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700/90">구인 시장</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">일당 리포트</h1>
            <p className="mt-4 text-sm font-medium text-red-600">목록을 불러오지 못했습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-teal-50/50">
        <div
          className="pointer-events-none absolute inset-x-0 -top-20 h-64 bg-gradient-to-b from-teal-200/20 to-transparent blur-3xl"
          aria-hidden
        />
        <div className="page-shell relative py-10 lg:py-12">
          <div className="lg:text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700/90">구인 시장 스냅샷</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">일당 리포트</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
              저장된 30일 구간 리포트가 없습니다. 관리자에서「30일 기준 리포트 생성」을 실행해 주세요.
            </p>
          </div>
          <div className="mt-6">
            <NewsCategoryTabs current="job_wage" showPrivateTab={isAdmin} />
          </div>
          <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-slate-200/70 bg-white p-8 text-center shadow-md ring-1 ring-slate-100/80">
            <p className="text-sm text-slate-600">다음으로 이동</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/admin/job-wage-report"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-md hover:bg-teal-700"
              >
                관리자 · 일당 리포트
              </Link>
              <Link
                href="/marketing-report"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-teal-200"
              >
                마케팅 리포트
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-teal-50/50">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-teal-200/25 via-emerald-100/15 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="page-shell relative py-10 lg:py-12">
        <div className="lg:text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700/90">구인 시장 스냅샷</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">일당 리포트</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            최근 30일 <strong className="font-semibold text-slate-800">신규 구인</strong>을 모아, 직종 1위 기준으로 시·도별 평균 일당·지도·표·심화 인사이트까지 한 번에 봅니다. 갱신할 때마다 당일 리포트는 1건으로 덮어씁니다.
          </p>
        </div>

        <div className="mt-6">
          <NewsCategoryTabs current="job_wage" showPrivateTab={isAdmin} />
        </div>

        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/80">
            <span className="text-teal-600">저장된 리포트</span>
            <span className="tabular-nums text-slate-900">{rows.length}건</span>
          </span>
          <span className="text-xs text-slate-500">30일 구간은 보통 1건 · 표시 상한 365일</span>
        </div>

        <ul className="mx-auto mt-10 grid w-full max-w-6xl min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.report_date}>
              <NewsCard
                href={`/job-market-report/${r.report_date}`}
                title={formatJobWageListTitle(r.report_date)}
                excerpt={r.headline}
                date={r.report_date}
                categoryTag="일당 리포트"
                reportHero
                accentSeed={r.report_date}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

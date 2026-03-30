import Link from "next/link";
import { Banknote } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";

export default async function JobMarketReportEmptyPage() {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  const { data: profile } = user
    ? await authSupabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin" || profile?.role === "editor";

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
            아직 30일 구간 리포트가 없습니다. 관리자 일당 리포트 화면에서「30일 기준 리포트 생성」을 실행해 주세요.
          </p>
        </div>
        <div className="mt-6">
          <NewsCategoryTabs current="job_wage" showPrivateTab={isAdmin} />
        </div>

        <div className="mx-auto mt-10 max-w-lg">
          <div className="rounded-3xl border border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/40 p-8 text-center shadow-md ring-1 ring-teal-100/60">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/25">
              <Banknote className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-800">리포트 준비 중</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              집계가 끝나면 목록과 상세 페이지에 자동으로 나타납니다.
            </p>
            {isAdmin ? (
              <Link
                href="/admin/job-wage-report"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-md hover:bg-teal-700"
              >
                관리자 · 일당 리포트
              </Link>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">다른 리포트</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
              <Link href="/jobs" className="text-sm font-semibold text-teal-700 hover:underline">
                인력 구인
              </Link>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <Link href="/marketing-report" className="text-sm font-semibold text-teal-700 hover:underline">
                마케팅 리포트
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

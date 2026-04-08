import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";

export default async function MarketingReportEmptyPage() {
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  const { data: profile } = user
    ? await authSupabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin" || profile?.role === "editor";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-violet-50/40">
      <div
        className="pointer-events-none absolute inset-x-0 -top-20 h-64 bg-gradient-to-b from-indigo-200/20 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="page-shell relative py-10 lg:py-12">
        <div className="lg:text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700/90">검색 트렌드</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">마케팅 리포트</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            아직 발행된 리포트가 없습니다. 관리자에서 키워드 그룹을 등록한 뒤 데이터랩 갱신을 실행하면 여기에 쌓입니다.
          </p>
        </div>
        <div className="mt-6">
          <NewsCategoryTabs section="report" current="marketing" showPrivateTab={isAdmin} />
        </div>

        <div className="mx-auto mt-10 max-w-lg">
          <div className="rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/40 p-8 text-center shadow-md ring-1 ring-indigo-100/60">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
              <Sparkles className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-800">준비 중이에요</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              관리자 메뉴 <span className="font-medium text-slate-800">네이버 마케팅 트렌드</span>에서 키워드를 설정한 다음 크론 또는 수동 갱신을 돌려 주세요.
            </p>
            {isAdmin ? (
              <Link
                href="/admin/naver-trend-keywords"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
              >
                키워드 관리로 이동
              </Link>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">다른 리포트</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
              <Link href="/news?section=report&category=report" className="text-sm font-semibold text-indigo-700 hover:underline">
                입찰 리포트
              </Link>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <Link href="/job-market-report" className="text-sm font-semibold text-indigo-700 hover:underline">
                일당 리포트
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

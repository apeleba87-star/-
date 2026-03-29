import Link from "next/link";
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            일당 리포트
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            아직 30일 구간 리포트가 없습니다. 관리자{" "}
            <Link href="/admin/job-wage-report" className="font-medium text-teal-700 hover:underline">
              일당 리포트
            </Link>
            에서「30일 기준 리포트 생성」을 실행해 주세요.
          </p>
        </div>
        <div className="mt-6">
          <NewsCategoryTabs current="job_wage" showPrivateTab={isAdmin} />
        </div>
        <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
          <Link href="/jobs" className="text-sm font-medium text-teal-700 hover:underline">
            인력 구인으로
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

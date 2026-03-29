import Link from "next/link";
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            마케팅 리포트
          </h1>
          <p className="mx-auto mb-6 max-w-md text-sm text-slate-600">
            아직 발행된 리포트가 없습니다. 관리자에서 키워드를 등록하고 데이터랩 갱신을 실행해 주세요.
          </p>
        </div>
        <NewsCategoryTabs current="marketing" showPrivateTab={isAdmin} />
        <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
          <Link href="/news?category=report" className="text-sm font-medium text-teal-700 hover:underline">
            입찰 리포트(업계 소식)으로
          </Link>
        </div>
      </div>
    </div>
  );
}

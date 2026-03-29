import Link from "next/link";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";
import NewsCard from "@/components/news/NewsCard";

export const dynamic = "force-dynamic";

function formatMarketingListTitle(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일 키워드 트렌드`;
}

export default async function MarketingReportIndexPage() {
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
    .from("naver_trend_daily_reports")
    .select("report_date, headline")
    .order("report_date", { ascending: false })
    .limit(365);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
        <div className="page-shell py-10 lg:py-12">
          <div className="lg:text-center">
            <h1 className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              마케팅 리포트
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
              마케팅 리포트
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
              저장된 일간 리포트가 없습니다. 관리자에서 네이버 트렌드 갱신을 실행해 주세요.
            </p>
          </div>
          <div className="mt-6">
            <NewsCategoryTabs current="marketing" showPrivateTab={isAdmin} />
          </div>
          <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
            <Link href="/news?category=report" className="text-sm font-medium text-teal-700 hover:underline">
              입찰 리포트(업계 소식)으로
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
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">네이버 데이터랩 · 통합검색 트렌드</p>
          <h1 className="mt-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            마케팅 리포트
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            날짜별로 저장된 키워드 트렌드·제목 아이디어를 열람할 수 있습니다. 입찰 리포트와 같이 매일 스냅샷이 쌓입니다.
          </p>
        </div>

        <div className="mt-6">
          <NewsCategoryTabs current="marketing" showPrivateTab={isAdmin} />
        </div>

        <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-slate-500">최근 {rows.length}건 표시 (최대 365일)</p>

        <ul className="mx-auto mt-8 grid w-full max-w-6xl min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.report_date}>
              <NewsCard
                href={`/marketing-report/${r.report_date}`}
                title={formatMarketingListTitle(r.report_date)}
                excerpt={r.headline}
                date={r.report_date}
                categoryTag="마케팅 리포트"
                accentSeed={r.report_date}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

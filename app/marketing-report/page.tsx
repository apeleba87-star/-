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
            <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              마케팅 리포트
            </h1>
            <p className="mb-6 text-sm text-red-600">목록을 불러오지 못했습니다.</p>
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
            <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              마케팅 리포트
            </h1>
            <p className="mx-auto mb-6 max-w-md text-sm text-slate-600">
              저장된 리포트가 없습니다. 관리자에서 네이버 트렌드 갱신을 실행해 주세요.
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            마케팅 리포트
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-sm text-slate-600">
            네이버 데이터랩 통합검색 트렌드 기준 키워드 인사이트입니다. 날짜별 스냅샷을 열람할 수 있으며, 입찰 리포트(업계 소식)와 같은 톤으로 구성했습니다.
          </p>
        </div>

        <NewsCategoryTabs current="marketing" showPrivateTab={isAdmin} />

        <p className="mx-auto mt-6 max-w-4xl text-center text-xs text-slate-500">최근 {rows.length}건 (최대 365일)</p>

        <ul className="mt-8 grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.report_date}>
              <NewsCard
                href={`/marketing-report/${r.report_date}`}
                title={formatMarketingListTitle(r.report_date)}
                excerpt={r.headline}
                date={r.report_date}
                categoryTag="마케팅 리포트"
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

import Link from "next/link";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";
import NewsCard from "@/components/news/NewsCard";
import ReportNextStep from "@/components/report/ReportNextStep";
import ReportTeamShareButton from "@/components/report/ReportTeamShareButton";
import RelatedReportsSection from "@/components/report/RelatedReportsSection";
import { getCrossReportDiscoveryPosts } from "@/lib/content/related-report-posts";
import {
  formatReportCardListDate,
  heroMetricsFromMarketingPayload,
  marketingTopRisingGroupName,
} from "@/lib/news/parseReportCardHero";
import { MARKETING_TEAM_SHARE_TEXT } from "@/lib/report/team-share-messages";

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
  const [{ data: rows, error }, { data: jobWageLatest }, crossPosts] = await Promise.all([
    supabase
      .from("naver_trend_daily_reports")
      .select("report_date, headline, payload")
      .order("report_date", { ascending: false })
      .limit(365),
    supabase.from("job_wage_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(1).maybeSingle(),
    getCrossReportDiscoveryPosts(supabase, 4),
  ]);

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-violet-50/40">
        <div className="page-shell py-10 lg:py-12">
          <div className="lg:text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700/90">검색 트렌드</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">마케팅 리포트</h1>
            <p className="mt-4 text-sm font-medium text-red-600">목록을 불러오지 못했습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!rows?.length) {
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
              저장된 리포트가 없습니다. 관리자에서 키워드를 등록하고 데이터랩 갱신을 실행해 주세요.
            </p>
          </div>
          <div className="mt-6">
            <NewsCategoryTabs section="report" current="marketing" showPrivateTab={isAdmin} />
          </div>
          <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-slate-200/70 bg-white p-8 text-center shadow-md ring-1 ring-slate-100/80">
            <p className="text-sm text-slate-600">다른 리포트 둘러보기</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/news?section=report&category=report"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                입찰 리포트
              </Link>
              <Link
                href="/job-market-report"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-indigo-200"
              >
                일당 리포트
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topKwFirst = marketingTopRisingGroupName((rows[0] as { payload?: unknown }).payload);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-violet-50/40">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-indigo-200/25 via-violet-100/15 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="page-shell relative py-10 lg:py-12">
        <div className="lg:text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700/90">검색 트렌드 스냅샷</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">마케팅 리포트</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            네이버 데이터랩 <strong className="font-semibold text-slate-800">통합검색</strong> 트렌드로 키워드·추천 제목·급상승/하락을 날짜별로 묶었습니다. 카드를 열면 그날의 인사이트 전체를 볼 수 있어요.
          </p>
        </div>

        <div className="mt-6">
          <NewsCategoryTabs section="report" current="marketing" showPrivateTab={isAdmin} />
        </div>

        <ul className="mt-8 grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.report_date}>
              <NewsCard
                href={`/marketing-report/${r.report_date}`}
                title={formatMarketingListTitle(r.report_date)}
                excerpt={r.headline}
                date={formatReportCardListDate(r.report_date)}
                categoryTag="마케팅 리포트"
                reportHero
                heroMetrics={heroMetricsFromMarketingPayload(
                  (r as { payload?: unknown }).payload
                )}
                accentSeed={r.report_date}
                footerShare={{
                  kind: "marketing",
                  reportDate: r.report_date,
                  shareTitle: formatMarketingListTitle(r.report_date),
                  shareText: MARKETING_TEAM_SHARE_TEXT,
                  loginNextPath: `/marketing-report/${r.report_date}`,
                }}
              />
            </li>
          ))}
        </ul>

        {crossPosts.length > 0 ? (
          <div className="mx-auto mt-10 max-w-5xl">
            <RelatedReportsSection
              posts={crossPosts}
              title="입찰·낙찰 등 최근 업계 리포트"
              description="마케팅 스냅샷과 함께 보면 검색 수요와 공고·낙찰 흐름을 같이 짚기 쉽습니다."
              sectionHeadingId="marketing-index-cross-reports"
            />
          </div>
        ) : null}

        <div className="mx-auto mt-10 max-w-2xl">
          <ReportNextStep
            variant="indigo"
            situation={
              topKwFirst
                ? `「${topKwFirst}」 키워드 쪽 검색 관심이 두드러집니다.`
                : "검색 트렌드를 본 뒤에는, 같은 맥락의 실제 일당을 확인하면 수요와 단가를 함께 볼 수 있습니다."
            }
            actionLabel="이 키워드에 맞는 실제 일당 구간 확인하기"
            href={
              jobWageLatest?.report_date
                ? `/job-market-report/${jobWageLatest.report_date}`
                : "/job-market-report"
            }
          />
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <ReportTeamShareButton
            kind="marketing"
            reportDate={rows[0].report_date}
            shareTitle={`마케팅 리포트 ${rows[0].report_date}`}
            shareText={MARKETING_TEAM_SHARE_TEXT}
            loginNextPath="/marketing-report"
            layout="full"
          />
        </div>
      </div>
    </div>
  );
}

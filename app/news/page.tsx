import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import { getReportTypeLabel } from "@/lib/content/report-snapshot-types";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";
import NewsCard from "@/components/news/NewsCard";
import { awardReportListHeroExcerpt, heroMetricsFromAwardExcerpt } from "@/lib/news/parseReportCardHero";
import ReportListPagination from "@/components/report/ReportListPagination";
import ReportNextStep from "@/components/report/ReportNextStep";
import { buildNewsReportListHref } from "@/lib/report/report-list-hrefs";
import {
  clampReportListPage,
  parseReportListPage,
} from "@/lib/report/report-list-pagination";
import {
  countAwardReportPosts,
  countIndustryPosts,
  countMoveBlogPosts,
  countPrivatePosts,
  countTenderDailyReportPosts,
  fetchIndustryPostsPage,
  fetchMoveBlogPostsPage,
  fetchPrivatePostsPage,
  fetchReportPostsPage,
} from "@/lib/report/report-list-queries";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "이사 블로그",
  description:
    "실거래가로 보는 전세·월세·매매 지역 정보와 이사 준비 글을 확인하세요. 클린아이덱스 이사정보 블로그입니다.",
};

const CATEGORY_MOVE_BLOG = "move_blog";
const CATEGORY_REPORT = "report";
const CATEGORY_PRIVATE = "private";
const CONTENT_CATEGORY_SLUGS = ["chemical", "equipment", "labor", "industry"] as const;
export type NewsCategoryKey =
  | typeof CATEGORY_MOVE_BLOG
  | typeof CATEGORY_REPORT
  | "award_report"
  | "marketing"
  | "job_wage"
  | (typeof CONTENT_CATEGORY_SLUGS)[number]
  | typeof CATEGORY_PRIVATE;

function formatReportDateLabel(sourceRef: string | null): string {
  if (!sourceRef || !/^\d{4}-\d{2}-\d{2}$/.test(sourceRef)) return "입찰 리포트";
  const [y, m, d] = sourceRef.split("-").map(Number);
  return `${m}월 ${d}일 리포트`;
}

function newsSectionFromCategory(cat: NewsCategoryKey): "report" | "industry" {
  if (cat === CATEGORY_PRIVATE || CONTENT_CATEGORY_SLUGS.includes(cat as (typeof CONTENT_CATEGORY_SLUGS)[number])) {
    return "industry";
  }
  return "report";
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; section?: string; page?: string }>;
}) {
  const { category: rawCategory, section: rawSection, page: rawPage } = await searchParams;
  const requestedPage = parseReportListPage(rawPage);
  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();
  const { data: profile } = user
    ? await authSupabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin" || profile?.role === "editor";

  let category: NewsCategoryKey;
  if (rawCategory === "marketing") {
    redirect("/marketing-report");
  }
  if (rawCategory === "job_wage") {
    redirect("/job-market-report");
  }
  if (rawCategory === "award_report") {
    category = "award_report";
  } else if (rawCategory === CATEGORY_MOVE_BLOG) {
    category = CATEGORY_MOVE_BLOG;
  } else if (rawCategory === CATEGORY_PRIVATE) {
    if (!isAdmin) redirect("/news");
    category = CATEGORY_PRIVATE;
  } else if (rawCategory && CONTENT_CATEGORY_SLUGS.includes(rawCategory as (typeof CONTENT_CATEGORY_SLUGS)[number])) {
    category = rawCategory as NewsCategoryKey;
  } else if (rawSection === "industry" && !rawCategory) {
    category = "chemical";
  } else if (rawSection === "report" && !rawCategory) {
    category = CATEGORY_REPORT;
  } else {
    category = CATEGORY_MOVE_BLOG;
  }

  const derivedSection = newsSectionFromCategory(category);
  if (rawSection === "report" && derivedSection === "industry") {
    redirect(`/news?section=industry&category=${category}`);
  }
  if (rawSection === "industry" && derivedSection === "report") {
    redirect(`/news?section=report&category=${category}`);
  }

  const supabase = createClient();
  const todayKst = getKstDateString();

  // 비공개 탭: 관리자만, is_private = true 글만
  if (category === CATEGORY_PRIVATE) {
    const totalPrivate = await countPrivatePosts(supabase);
    const privatePage = clampReportListPage(requestedPage, totalPrivate);
    const { data: privatePosts } = await fetchPrivatePostsPage(supabase, privatePage);

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
        <div className="page-shell py-10 lg:py-12">
          <div className="lg:text-center">
            <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              데이터랩
            </h1>
            <p className="mb-6 text-sm text-slate-600">
              사용자에게 비공개로 설정된 글입니다. 관리자만 열람할 수 있습니다.
            </p>
          </div>
          <NewsCategoryTabs section="industry" current={category} showPrivateTab={true} />
          {!privatePosts?.length ? (
            <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
              <p className="text-slate-500">비공개 글이 없습니다.</p>
            </div>
          ) : (
            <ul className="mt-8 grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {privatePosts.map((post) => (
                <li key={post.id}>
                  <NewsCard
                    href={post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`}
                    title={post.title}
                    excerpt={post.excerpt}
                    date={
                      post.published_at
                        ? new Date(post.published_at).toLocaleDateString("ko-KR")
                        : ""
                    }
                    categoryTag="비공개"
                  />
                </li>
              ))}
            </ul>
          )}
          <ReportListPagination
            page={privatePage}
            totalCount={totalPrivate}
            buildHref={(p) => buildNewsReportListHref(CATEGORY_PRIVATE, p)}
          />
        </div>
      </div>
    );
  }

  if (category !== CATEGORY_MOVE_BLOG && category !== CATEGORY_REPORT && category !== "award_report") {
    const { data: contentCat } = await supabase
      .from("content_categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();

    let posts: { id: string; title: string; excerpt: string | null; published_at: string | null; slug: string | null }[] = [];
    let industryTotal = 0;
    let industryPage = 1;
    if (contentCat?.id) {
      industryTotal = await countIndustryPosts(supabase, contentCat.id);
      industryPage = clampReportListPage(requestedPage, industryTotal);
      const { data } = await fetchIndustryPostsPage(supabase, contentCat.id, industryPage);
      posts = data ?? [];
    }

    const categoryLabels: Record<string, string> = {
      chemical: "약품",
      equipment: "장비",
      labor: "근로",
      industry: "업계이슈",
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
        <div className="page-shell py-10 lg:py-12">
          <div className="lg:text-center">
            <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              데이터랩
            </h1>
            <p className="mb-6 text-sm text-slate-600">
              청소·소독·방역 관련 약품, 장비, 근로, 업계이슈 소식입니다.
            </p>
          </div>
          <NewsCategoryTabs section="industry" current={category} showPrivateTab={isAdmin} />
          {!posts?.length ? (
            <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
              <p className="text-slate-500">아직 올라온 글이 없습니다.</p>
            </div>
          ) : (
            <ul className="mt-8 grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <NewsCard
                    href={post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`}
                    title={post.title}
                    excerpt={post.excerpt}
                    date={
                      post.published_at
                        ? new Date(post.published_at).toLocaleDateString("ko-KR")
                        : ""
                    }
                    categoryTag={categoryLabels[category] ?? category}
                  />
                </li>
              ))}
            </ul>
          )}
          <ReportListPagination
            page={industryPage}
            totalCount={industryTotal}
            buildHref={(p) => buildNewsReportListHref(category, p)}
          />
        </div>
      </div>
    );
  }

  const isAwardReportCategory = category === "award_report";
  const isMoveBlogCategory = category === CATEGORY_MOVE_BLOG;
  const totalReports = isAwardReportCategory
    ? await countAwardReportPosts(supabase)
    : isMoveBlogCategory
      ? await countMoveBlogPosts(supabase)
      : await countTenderDailyReportPosts(supabase);
  const reportPage = clampReportListPage(requestedPage, totalReports);
  const [{ data: posts }, { data: marketingLatest }, { data: jobWageLatest }] = await Promise.all([
    isMoveBlogCategory
      ? fetchMoveBlogPostsPage(supabase, reportPage)
      : fetchReportPostsPage(supabase, { isAward: isAwardReportCategory, page: reportPage }),
    supabase
      .from("naver_trend_daily_reports")
      .select("report_date")
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("job_wage_daily_reports")
      .select("report_date")
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            이사 블로그
          </h1>
          <p className="mb-6 text-sm text-slate-600">
            {isMoveBlogCategory
              ? "실거래가로 보는 전세·월세·매매 지역 정보와 이사 준비 글입니다."
              : isAwardReportCategory
              ? "청소·소독·방역 낙찰 리포트 모음입니다. 리포트별 열람 조건은 글 상단에서 안내됩니다."
              : "청소·소독·방역 입찰 리포트와 데이터랩 콘텐츠입니다. 리포트별 열람 조건은 글 상단에서 안내됩니다."}
          </p>
        </div>
        {!isMoveBlogCategory ? (
          <NewsCategoryTabs section="report" current={category} showPrivateTab={isAdmin} />
        ) : null}
        {!posts?.length ? (
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
            <p className="text-slate-500">아직 올라온 소식이 없습니다.</p>
          </div>
        ) : (
          <ul className="mt-8 grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const sourceType = (post as { source_type?: string | null }).source_type ?? null;
              const sourceRef = (post as { source_ref?: string | null }).source_ref ?? null;
              const isDaily = sourceType === "auto_tender_daily" || (post.slug ?? "").includes("daily-tender-digest");
              const isMoveBlog = sourceType === "move_rtms_seo";
              const isToday = isDaily && sourceRef === todayKst;
              const listTitle = isMoveBlog
                ? post.title
                : isDaily
                ? isToday
                  ? "오늘 청소 입찰 리포트"
                  : formatReportDateLabel(sourceRef)
                : isAwardReportCategory &&
                    sourceRef &&
                    /^\d{4}-\d{2}-\d{2}$/.test(sourceRef)
                  ? (() => {
                      const [y, m, d] = sourceRef.split("-").map(Number);
                      return `${m}월 ${d}일 낙찰 리포트`;
                    })()
                  : post.title;
              const categoryTag = isMoveBlog
                ? "이사정보"
                : isDaily
                  ? "입찰 리포트"
                  : isAwardReportCategory
                    ? "낙찰 리포트"
                    : getReportTypeLabel(sourceType ?? "");
              const postHref = post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`;
              const shareText =
                typeof post.excerpt === "string" && post.excerpt.trim()
                  ? post.excerpt.trim()
                  : listTitle;
              const awardHeroExcerpt =
                isAwardReportCategory && !isDaily
                  ? awardReportListHeroExcerpt(
                      post as { excerpt?: string | null; report_snapshot?: unknown },
                    )
                  : null;
              const awardHero =
                isAwardReportCategory && !isDaily ? heroMetricsFromAwardExcerpt(awardHeroExcerpt) : null;
              const reportBadgeKind = isDaily
                ? "daily"
                : sourceType === "award_market_intel"
                  ? "award"
                  : "snapshot";
              return (
                <li key={post.id}>
                  <NewsCard
                    href={postHref}
                    title={listTitle}
                    excerpt={post.excerpt}
                    date={
                      post.published_at
                        ? new Date(post.published_at).toLocaleDateString(
                            "ko-KR"
                          )
                        : ""
                    }
                    categoryTag={categoryTag}
                    reportBadgeKind={isMoveBlog ? undefined : reportBadgeKind}
                    reportHero={!isMoveBlog}
                    heroMetrics={awardHero}
                    reportHeroFallbackTitle={isAwardReportCategory && !isDaily ? "한눈에 보기" : undefined}
                    suppressBodyExcerpt={isAwardReportCategory && !isDaily}
                    accentSeed={post.published_at ?? post.id}
                    footerShare={
                      isMoveBlog
                        ? undefined
                        : {
                            kind: "bid_post",
                            postId: post.id,
                            shareTitle: listTitle,
                            shareText,
                          }
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        <ReportListPagination
          page={reportPage}
          totalCount={totalReports}
          buildHref={(p) => buildNewsReportListHref(category, p)}
        />
        {!isMoveBlogCategory ? (
          <div className="mx-auto mt-10 max-w-2xl">
            {isAwardReportCategory ? (
            <ReportNextStep
              variant="teal"
              situation="낙찰 흐름을 봤다면, 같은 조건의 유사 입찰 목록을 열어 바로 내 관심 조건으로 저장해 다음 공고에도 반복 적용해 보세요."
              actionLabel="유사 입찰 목록으로 이동"
              href="/tenders"
            />
            ) : (
              <>
                <ReportNextStep
                  variant="slate"
                  situation="입찰·발주 쪽 흐름을 봤다면, 같은 날 검색 수요 트렌드도 같이 보면 마케팅·단가 방향을 잡기 쉽습니다."
                  actionLabel="지금 뜨는 키워드 확인하기"
                  href={
                    marketingLatest?.report_date
                      ? `/marketing-report/${marketingLatest.report_date}`
                      : "/marketing-report"
                  }
                />
                <div className="mt-4">
                  <ReportNextStep
                    variant="teal"
                    situation="인건비·구인 단가 감을 잡으려면 같은 시기 일당 스냅샷을 함께 보는 것이 좋습니다."
                    actionLabel="일당 리포트 보기"
                    href={
                      jobWageLatest?.report_date
                        ? `/job-market-report/${jobWageLatest.report_date}`
                        : "/job-market-report"
                    }
                  />
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import { getReportTypeLabel } from "@/lib/content/report-snapshot-types";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";
import NewsCard from "@/components/news/NewsCard";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "뉴스·리포트",
  description: "청소·방역 입찰 리포트와 업계 뉴스. 클린아이덱스에서 입찰 요약, 마감 임박, 개찰 예정 공고와 업계 정보를 확인하세요.",
};

const CATEGORY_REPORT = "report";
const CATEGORY_PRIVATE = "private";
const CONTENT_CATEGORY_SLUGS = ["chemical", "equipment", "labor", "industry"] as const;
export type NewsCategoryKey =
  | typeof CATEGORY_REPORT
  | "marketing"
  | "job_wage"
  | (typeof CONTENT_CATEGORY_SLUGS)[number]
  | typeof CATEGORY_PRIVATE;

function formatReportDateLabel(sourceRef: string | null): string {
  if (!sourceRef || !/^\d{4}-\d{2}-\d{2}$/.test(sourceRef)) return "입찰 리포트";
  const [y, m, d] = sourceRef.split("-").map(Number);
  return `${m}월 ${d}일 리포트`;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
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
  if (rawCategory === CATEGORY_PRIVATE) {
    if (!isAdmin) redirect("/news");
    category = CATEGORY_PRIVATE;
  } else if (rawCategory && CONTENT_CATEGORY_SLUGS.includes(rawCategory as (typeof CONTENT_CATEGORY_SLUGS)[number])) {
    category = rawCategory as NewsCategoryKey;
  } else {
    category = CATEGORY_REPORT;
  }

  const supabase = createClient();
  const todayKst = getKstDateString();

  // 비공개 탭: 관리자만, is_private = true 글만
  if (category === CATEGORY_PRIVATE) {
    const { data: privatePosts } = await supabase
      .from("posts")
      .select("id, title, excerpt, published_at, slug, source_type, source_ref")
      .not("published_at", "is", null)
      .eq("is_private", true)
      .order("published_at", { ascending: false })
      .limit(50);

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
        <div className="page-shell py-10 lg:py-12">
          <div className="lg:text-center">
            <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              업계 소식
            </h1>
            <p className="mb-6 text-sm text-slate-600">
              사용자에게 비공개로 설정된 글입니다. 관리자만 열람할 수 있습니다.
            </p>
          </div>
          <NewsCategoryTabs current={category} showPrivateTab={true} />
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
        </div>
      </div>
    );
  }

  if (category !== CATEGORY_REPORT) {
    const { data: contentCat } = await supabase
      .from("content_categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();

    let posts: { id: string; title: string; excerpt: string | null; published_at: string | null; slug: string | null }[] = [];
    if (contentCat?.id) {
      const { data } = await supabase
        .from("posts")
        .select("id, title, excerpt, published_at, slug")
        .not("published_at", "is", null)
        .eq("category_id", contentCat.id)
        .eq("is_private", false)
        .order("published_at", { ascending: false })
        .limit(50);
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
              업계 소식
            </h1>
            <p className="mb-6 text-sm text-slate-600">
              청소·소독·방역 관련 약품, 장비, 근로, 업계이슈 소식입니다.
            </p>
          </div>
          <NewsCategoryTabs current={category} showPrivateTab={isAdmin} />
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
        </div>
      </div>
    );
  }

  // 입찰·리포트: source_type 있거나 slug가 일간/리포트 패턴인 발행 글 (비공개 제외)
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug, source_type, source_ref")
    .not("published_at", "is", null)
    .eq("is_private", false)
    .or("source_type.not.is.null,slug.ilike.*daily-tender-digest*,slug.ilike.*report-*")
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            업계 소식
          </h1>
          <p className="mb-6 text-sm text-slate-600">
            청소·소독·방역 입찰 리포트와 업계 소식입니다. 리포트별 열람 조건은 글 상단에서 안내됩니다.
          </p>
        </div>
        <NewsCategoryTabs current={category} showPrivateTab={isAdmin} />
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
              const isToday = isDaily && sourceRef === todayKst;
              const listTitle = isDaily
                ? isToday
                  ? "오늘 청소 입찰 리포트"
                  : formatReportDateLabel(sourceRef)
                : post.title;
              const categoryTag = isDaily ? "입찰 리포트" : getReportTypeLabel(sourceType ?? "");
              return (
                <li key={post.id}>
                  <NewsCard
                    href={
                      post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`
                    }
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
                    reportHero
                    accentSeed={post.published_at ?? post.id}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

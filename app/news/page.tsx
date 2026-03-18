import { createClient } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import { getReportTypeLabel } from "@/lib/content/report-snapshot-types";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";
import NewsCard, { type NewsCardBadge } from "@/components/news/NewsCard";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "뉴스·리포트",
  description: "청소·방역 입찰 리포트와 업계 뉴스. 클린아이덱스에서 입찰 요약, 마감 임박, 개찰 예정 공고와 업계 정보를 확인하세요.",
};

const CATEGORY_REPORT = "report";
const CONTENT_CATEGORY_SLUGS = ["chemical", "equipment", "labor", "industry"] as const;
export type NewsCategoryKey = typeof CATEGORY_REPORT | (typeof CONTENT_CATEGORY_SLUGS)[number];

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
  const category: NewsCategoryKey =
    rawCategory && CONTENT_CATEGORY_SLUGS.includes(rawCategory as (typeof CONTENT_CATEGORY_SLUGS)[number])
      ? (rawCategory as NewsCategoryKey)
      : CATEGORY_REPORT;

  const supabase = createClient();
  const todayKst = getKstDateString();

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
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            업계 소식
          </h1>
          <p className="mb-6 text-sm text-slate-600">
            청소·소독·방역 관련 약품, 장비, 근로, 업계이슈 소식입니다.
          </p>
          <NewsCategoryTabs current={category} />
          {!posts?.length ? (
            <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
              <p className="text-slate-500">아직 올라온 글이 없습니다.</p>
            </div>
          ) : (
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

  // 입찰·리포트: source_type 있거나 slug가 일간/리포트 패턴인 발행 글
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug, source_type, source_ref")
    .not("published_at", "is", null)
    .or("source_type.not.is.null,slug.ilike.*daily-tender-digest*,slug.ilike.*report-*")
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          업계 소식
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          청소·소독·방역 입찰 일간 리포트와 업계 관련 소식입니다. 오늘 리포트는
          무료, 이전 소식은 구독 후 이용할 수 있습니다.
        </p>
        <NewsCategoryTabs current={category} />
        {!posts?.length ? (
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-sm">
            <p className="text-slate-500">아직 올라온 소식이 없습니다.</p>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => {
              const sourceType = (post as { source_type?: string | null }).source_type ?? null;
              const sourceRef = (post as { source_ref?: string | null }).source_ref ?? null;
              const isDaily = sourceType === "auto_tender_daily" || (post.slug ?? "").includes("daily-tender-digest");
              const isToday = isDaily && sourceRef === todayKst;
              const isFree = isToday || index === 0;
              const listTitle = isDaily
                ? isToday
                  ? "오늘 청소 입찰 리포트"
                  : formatReportDateLabel(sourceRef)
                : post.title;
              const categoryTag = isDaily ? "입찰 리포트" : getReportTypeLabel(sourceType ?? "");
              const badge: NewsCardBadge = isFree ? "free" : "premium";
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
                    badge={badge}
                    categoryTag={categoryTag}
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

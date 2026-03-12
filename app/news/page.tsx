import Link from "next/link";
import { Lock, LockOpen } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { getKstDateString } from "@/lib/content/kst-utils";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";

export const revalidate = 60;

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

    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">업계 소식</h1>
        <p className="mb-6 text-sm text-slate-500">
          청소·소독·방역 관련 약품, 장비, 근로, 업계이슈 소식입니다.
        </p>
        <NewsCategoryTabs current={category} />
        {!posts?.length ? (
          <div className="card mt-6">
            <p className="text-slate-500">아직 올라온 글이 없습니다.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`}
                  className="card block hover:border-blue-200"
                >
                  <h2 className="font-semibold text-slate-800">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {post.excerpt}
                    </p>
                  )}
                  <time className="mt-2 block text-xs text-slate-500">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("ko-KR")
                      : ""}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, excerpt, published_at, slug, source_type, source_ref")
    .not("published_at", "is", null)
    .eq("source_type", "auto_tender_daily")
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">업계 소식</h1>
      <p className="mb-6 text-sm text-slate-500">
        청소·소독·방역 입찰 일간 리포트와 업계 관련 소식입니다. 오늘 리포트는
        무료, 이전 소식은 구독 후 이용할 수 있습니다.
      </p>
      <NewsCategoryTabs current={category} />
      {!posts?.length ? (
        <div className="card mt-6">
          <p className="text-slate-500">아직 올라온 소식이 없습니다.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {posts.map((post, index) => {
            const sourceRef = (post as { source_ref?: string | null })
              .source_ref ?? null;
            const isToday = sourceRef === todayKst;
            const isFree = isToday || index === 0;
            const listTitle = isToday
              ? "오늘 청소 입찰 리포트"
              : formatReportDateLabel(sourceRef);
            return (
              <li key={post.id}>
                <Link
                  href={
                    post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`
                  }
                  className="card flex items-start justify-between gap-4 hover:border-blue-200"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-800">{listTitle}</h2>
                    {post.excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {post.excerpt}
                      </p>
                    )}
                    <time className="mt-2 block text-xs text-slate-500">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString(
                            "ko-KR"
                          )
                        : ""}
                    </time>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                      isFree
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isFree ? (
                      <>
                        <LockOpen className="h-4 w-4" aria-hidden />
                        무료
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" aria-hidden />
                        구독
                      </>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

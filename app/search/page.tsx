import type { Metadata } from "next";
import GuideSearch from "@/components/knowledge-hub/GuideSearch";
import GuideSearchResultsList from "@/components/knowledge-hub/GuideSearchResultsList";
import { POPULAR_GUIDE_QUERIES, searchGuides } from "@/lib/knowledge-hub/search";
import { buildPageMetadata } from "@/lib/seo";
import Link from "next/link";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q?.trim() ? `"${q.trim()}" 검색 결과` : "가이드 검색";
  return {
    ...buildPageMetadata({
      title: `${title} | 클린아이덱스`,
      description: "청소 방법·오염 제거·약품 가이드를 키워드로 검색합니다.",
      path: "/search",
    }),
    robots: { index: false, follow: true },
  };
}

export default async function GuideSearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? searchGuides(query, 24) : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="page-shell py-8 sm:py-12">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">가이드 검색</h1>
        <p className="mt-2 text-sm text-slate-600">궁금한 청소 방법·오염 제거·약품을 키워드로 찾아보세요.</p>

        <div className="mt-6 max-w-2xl">
          <GuideSearch variant="compact" initialQuery={query} autoFocus />
        </div>

        {query ? (
          <section className="mt-8 max-w-3xl">
            <h2 className="text-lg font-black text-slate-900">
              {results.length ? `"${query}" 검색 결과 ${results.length}건` : `"${query}" 결과 없음`}
            </h2>
            <div className="mt-4">
              <GuideSearchResultsList
                results={results}
                query={query}
                emptyMessage={`"${query}"에 맞는 가이드가 없습니다. 다른 키워드로 시도해 보세요.`}
              />
            </div>
          </section>
        ) : (
          <section className="mt-8 max-w-3xl">
            <h2 className="text-lg font-black text-slate-900">자주 찾는 질문</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {POPULAR_GUIDE_QUERIES.map((item) =>
                item.path ? (
                  <Link
                    key={item.label}
                    href={item.path}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-200 hover:text-teal-800"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    key={item.label}
                    href={`/search?q=${encodeURIComponent(item.query ?? item.label)}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-200 hover:text-teal-800"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

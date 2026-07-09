import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GuideSearch from "@/components/knowledge-hub/GuideSearch";
import { buildPageMetadata } from "@/lib/seo";
import {
  getRecurringCategories,
  getOneTimeCategories,
  getTopicsByCategory,
  HUB_CATEGORIES,
} from "@/lib/knowledge-hub/catalog";
import { hubIcon } from "@/lib/knowledge-hub/hub-icons";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "청소 방법 가이드 | 클린아이덱스",
  description: "사무실·공장·헬스장·입주청소 등 현장별 청소 방법을 카테고리별로 확인하세요.",
  path: "/services",
});

function CategoryGrid({ categories }: { categories: ReturnType<typeof getRecurringCategories> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const Icon = hubIcon(cat.icon);
        const count = getTopicsByCategory(cat.slug).length;
        const href = cat.slug === "pollution" ? "/guides" : cat.hubPath;
        return (
          <Link
            key={cat.slug}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
          >
            <Icon className="h-7 w-7 text-teal-600" aria-hidden />
            <h3 className="mt-3 text-lg font-black text-slate-950 group-hover:text-teal-800">{cat.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{cat.description}</p>
            <p className="mt-2 text-sm font-bold text-teal-700">{count}개 가이드</p>
          </Link>
        );
      })}
    </div>
  );
}

export default function ServicesHubPage() {
  const pollution = HUB_CATEGORIES.find((c) => c.slug === "pollution")!;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="page-shell py-8 sm:py-12">
        <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">청소 방법 가이드</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
          현장 유형별 가이드 또는 키워드 검색으로 찾아보세요.
        </p>

        <div className="mt-6 max-w-2xl">
          <GuideSearch variant="compact" />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-black text-slate-900">정기청소</h2>
          <div className="mt-4">
            <CategoryGrid categories={getRecurringCategories()} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-black text-slate-900">1회성·특수 청소</h2>
          <div className="mt-4">
            <CategoryGrid categories={getOneTimeCategories()} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-black text-slate-900">{pollution.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{pollution.description}</p>
          <Link
            href="/guides"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-900 hover:bg-violet-100"
          >
            {getTopicsByCategory("pollution").length}개 오염·재질 가이드
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">제품·재질·레시피</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/products" className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-800 hover:bg-slate-200">
              세정 제품
            </Link>
            <Link href="/materials" className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-800 hover:bg-slate-200">
              재질별
            </Link>
            <Link href="/pollution" className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-800 hover:bg-slate-200">
              오염별
            </Link>
            <Link href="/cleaning" className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-800 hover:bg-slate-200">
              레시피
            </Link>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/inquiry/regular"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
          >
            정기청소 견적
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/inquiry/move-in"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800"
          >
            입주청소 견적
          </Link>
        </div>
      </div>
    </main>
  );
}

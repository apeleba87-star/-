import Link from "next/link";
import {
  getRecurringCategories,
  getOneTimeCategories,
  getTopicsByCategory,
} from "@/lib/knowledge-hub/catalog";
import { generateFacilityHubSummary } from "@/lib/knowledge-hub/generate-from-db";
import { hubIcon } from "@/lib/knowledge-hub/hub-icons";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "현장별 청소 가이드 | 클린아이덱스",
  description: "사무실·공장·헬스장·입주청소 등 16개 현장 유형별 청소 방법.",
  path: "/facilities",
});

function FacilityList({ categories }: { categories: ReturnType<typeof getRecurringCategories> }) {
  return (
    <ul className="space-y-4">
      {categories.map((cat) => {
        const Icon = hubIcon(cat.icon);
        const summary = generateFacilityHubSummary(cat.slug);
        const count = getTopicsByCategory(cat.slug).length;
        return (
          <li key={cat.slug}>
            <Link
              href={cat.hubPath}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-teal-300 hover:shadow-sm"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">{cat.name}</h2>
                <p className="mt-1 text-slate-600">{cat.description}</p>
                <p className="mt-2 text-sm font-bold text-teal-800">{summary.description}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{count}개 가이드</p>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function FacilitiesHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">현장별 청소 가이드</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          사무실·상가·공장·헬스장·입주청소 등 현장 유형별 방법·용품 가이드입니다.
        </p>
        <Link href="/services" className="mt-3 inline-block text-sm font-bold text-teal-700 hover:underline">
          전체 카테고리 허브 보기 →
        </Link>
      </header>

      <section>
        <h2 className="text-lg font-black text-slate-900">정기청소</h2>
        <div className="mt-4">
          <FacilityList categories={getRecurringCategories()} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black text-slate-900">1회성·특수 청소</h2>
        <div className="mt-4">
          <FacilityList categories={getOneTimeCategories()} />
        </div>
      </section>
    </div>
  );
}

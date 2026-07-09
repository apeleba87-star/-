import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GuideSearch from "@/components/knowledge-hub/GuideSearch";
import type { HubCategory } from "@/lib/knowledge-hub/catalog";
import { getTopicsByCategory } from "@/lib/knowledge-hub/catalog";
import { hubIcon } from "@/lib/knowledge-hub/hub-icons";
import { inquiryPathForType } from "@/lib/knowledge-hub/mvp-pages";
import { groupTopicsBySection } from "@/lib/knowledge-hub/topic-groups";

type Props = {
  category: HubCategory;
};

function typeBadge(guideType: string) {
  if (guideType === "service_supplies") {
    return <span className="mt-0.5 block text-xs font-medium text-amber-700">약품·장비</span>;
  }
  if (guideType === "problem") {
    return <span className="mt-0.5 block text-xs font-medium text-violet-700">오염·재질</span>;
  }
  return null;
}

export default function CategoryHubView({ category }: Props) {
  const topics = getTopicsByCategory(category.slug);
  const groups = groupTopicsBySection(topics);
  const Icon = hubIcon(category.icon);
  const inquiryPath = inquiryPathForType(category.inquiryType);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="page-shell py-6 sm:py-10">
        <nav className="mb-6 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            홈
          </Link>
          <span className="mx-2">/</span>
          <Link href={category.slug === "pollution" ? "/guides" : "/services"} className="hover:text-teal-700">
            {category.slug === "pollution" ? "오염·재질" : "가이드"}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{category.name}</span>
        </nav>

        <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg">
              <Icon className="h-7 w-7" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-700">카테고리</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">{category.name}</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">{category.description}</p>
              <p className="mt-2 text-sm font-bold text-teal-800">{topics.length}개 가이드</p>
            </div>
          </div>
          <div className="mt-6 max-w-xl">
            <GuideSearch variant="compact" />
          </div>
        </header>

        <div className="mt-8 space-y-10">
          {groups.map((group) => (
            <section key={group.id}>
              <h2 className="text-lg font-black text-slate-900">{group.title}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {group.topics.map((topic) => (
                  <li key={topic.path}>
                    <Link
                      href={topic.path}
                      className="group flex min-h-[44px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-slate-900 group-hover:text-teal-800">{topic.h1}</span>
                        {typeBadge(topic.guideType)}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-600" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {inquiryPath ? (
          <section className="mt-10 rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
            <h2 className="text-xl font-black">
              {category.inquiryType === "move_in" ? "입주청소 견적" : "정기청소 견적"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">이 카테고리 청소를 업체에 맡기고 싶다면 문의하세요.</p>
            <Link
              href={`${inquiryPath}?ref=${category.slug}`}
              className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-900"
            >
              견적 문의하기
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}

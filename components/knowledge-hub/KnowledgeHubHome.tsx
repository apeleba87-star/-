import Link from "next/link";
import { Beaker, Building2, ClipboardList, Droplets, FlaskConical, Layers } from "lucide-react";
import GuideSearch from "@/components/knowledge-hub/GuideSearch";
import { getServiceCategories, getTopicsByCategory } from "@/lib/knowledge-hub/catalog";
import { hubIcon } from "@/lib/knowledge-hub/hub-icons";

export default function KnowledgeHubHome() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/40">
      <div className="page-shell py-8 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-700">클린아이덱스 지식 허브</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            청소 방법,
            <br className="sm:hidden" /> 한곳에서
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            궁금한 키워드를 검색하거나 카테고리에서 찾아보세요.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <GuideSearch variant="hero" autoFocus={false} />
        </div>

        <section className="mx-auto mt-12 max-w-4xl">
          <h2 className="text-xl font-black text-slate-950">분류별 탐색</h2>
          <p className="mt-2 text-sm text-slate-600">제품·재질·오염·레시피·사례·장소별로 찾아보세요.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/products", label: "세정 제품", Icon: Beaker },
              { href: "/materials", label: "재질별", Icon: Layers },
              { href: "/pollution", label: "오염별", Icon: Droplets },
              { href: "/cleaning", label: "레시피", Icon: FlaskConical },
              { href: "/cases", label: "사례", Icon: ClipboardList },
              { href: "/services", label: "장소별", Icon: Building2 },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-bold text-slate-800 transition hover:border-teal-300 hover:text-teal-800"
              >
                <item.Icon className="h-5 w-5 shrink-0 text-teal-600" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-4xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-black text-slate-950">장소별 가이드</h2>
            <Link href="/services" className="text-sm font-bold text-teal-700 hover:underline">
              전체 보기
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {getServiceCategories().map((cat) => {
              const Icon = hubIcon(cat.icon);
              const href = cat.hubPath;
              const featured = getTopicsByCategory(cat.slug).slice(0, 3);
              return (
                <article
                  key={cat.slug}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <Link href={href} className="group flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-bold text-slate-900 group-hover:text-teal-800">{cat.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {getTopicsByCategory(cat.slug).length}개 가이드
                      </span>
                    </span>
                  </Link>
                  <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    {featured.map((t) => (
                      <li key={t.path}>
                        <Link href={t.path} className="text-sm font-medium text-slate-600 hover:text-teal-700">
                          {t.h1}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-4xl rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
          <h2 className="text-2xl font-black">청소 견적이 필요하신가요?</h2>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/inquiry/regular"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900"
            >
              정기청소 견적
            </Link>
            <Link
              href="/inquiry/move-in"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-slate-600 px-5 py-3 text-sm font-black"
            >
              입주청소 견적
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

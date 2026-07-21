import Link from "next/link";
import { Beaker, Building2, ChevronRight, Droplets, Layers } from "lucide-react";
import GuideSearch from "@/components/knowledge-hub/GuideSearch";

/**
 * 직관 우선: 오염 / 재질 / 세제 / 장소 갈래 → 검색은 보조 → 견적은 맨 아래
 */
export default function KnowledgeHubHome() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="page-shell pb-16 pt-12 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-lg">
          <p className="text-center text-xl font-black tracking-tight text-teal-800">클린아이덱스</p>
          <h1 className="mt-4 text-center text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
            무엇을 청소하시나요?
          </h1>
          <p className="mt-3 text-center text-base text-slate-600">
            아는 것부터 선택하면 됩니다.
          </p>

          <nav className="mt-8 space-y-3" aria-label="찾기 방법">
            <Link
              href="/pollution"
              className="group flex items-stretch gap-4 rounded-3xl border-2 border-slate-900 bg-white p-5 transition hover:bg-teal-50 active:scale-[0.99] sm:p-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white transition group-hover:scale-105">
                <Droplets className="h-7 w-7" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-2xl font-black text-slate-950">오염으로 찾기</span>
                <span className="mt-1 block text-base text-slate-600">석회 · 곰팡이 · 기름때 · 물때</span>
              </span>
              <ChevronRight
                className="mt-4 h-6 w-6 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-800"
                aria-hidden
              />
            </Link>

            <Link
              href="/materials"
              className="group flex items-stretch gap-4 rounded-3xl border-2 border-slate-900 bg-white p-5 transition hover:bg-teal-50 active:scale-[0.99] sm:p-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white transition group-hover:scale-105">
                <Layers className="h-7 w-7" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-2xl font-black text-slate-950">재질로 찾기</span>
                <span className="mt-1 block text-base text-slate-600">금기 · 권장 · 대리석 · 스테인레스</span>
              </span>
              <ChevronRight
                className="mt-4 h-6 w-6 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-800"
                aria-hidden
              />
            </Link>

            <Link
              href="/products"
              className="group flex items-stretch gap-4 rounded-3xl border-2 border-slate-900 bg-white p-5 transition hover:bg-teal-50 active:scale-[0.99] sm:p-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white transition group-hover:scale-105">
                <Beaker className="h-7 w-7" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-2xl font-black text-slate-950">청소 세제로 찾기</span>
                <span className="mt-1 block text-base text-slate-600">토네이도 · 비노신 · 그라셋 등</span>
              </span>
              <ChevronRight
                className="mt-4 h-6 w-6 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-800"
                aria-hidden
              />
            </Link>

            <Link
              href="/places"
              className="group flex items-stretch gap-4 rounded-3xl border-2 border-slate-900 bg-white p-5 transition hover:bg-teal-50 active:scale-[0.99] sm:p-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white transition group-hover:scale-105">
                <Building2 className="h-7 w-7" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-2xl font-black text-slate-950">장소별로 찾기</span>
                <span className="mt-1 block text-base text-slate-600">사무실 · 헬스장 · 학원 · 걸레질 루틴</span>
              </span>
              <ChevronRight
                className="mt-4 h-6 w-6 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-800"
                aria-hidden
              />
            </Link>
          </nav>

          <div className="mt-5">
            <Link
              href="/blog"
              className="flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-teal-800 bg-teal-800 px-5 py-4 text-xl font-black text-white transition hover:bg-teal-900 active:scale-[0.99] sm:min-h-[64px] sm:text-2xl"
            >
              청소지식
            </Link>
          </div>

          <details className="group mt-6">
            <summary className="cursor-pointer list-none text-center text-sm font-bold text-slate-500 marker:content-none hover:text-teal-800 [&::-webkit-details-marker]:hidden">
              또는 검색하기
              <span className="ml-1 inline-block transition group-open:rotate-180">▾</span>
            </summary>
            <div className="mt-4">
              <GuideSearch variant="hero" autoFocus={false} />
            </div>
          </details>

          <p className="mt-12 text-center text-sm text-slate-500">
            견적이 필요하면{" "}
            <Link href="/inquiry/regular" className="font-bold text-slate-700 underline-offset-2 hover:text-teal-800 hover:underline">
              정기
            </Link>
            {" · "}
            <Link href="/inquiry/move-in" className="font-bold text-slate-700 underline-offset-2 hover:text-teal-800 hover:underline">
              입주
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

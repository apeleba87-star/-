import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "청소업 실무 | 클린아이덱스",
  description:
    "입주·에어컨·바닥 청소와 마케팅 실무. 과정별로 읽고 다음 편으로 이어집니다.",
  path: "/practice",
});

export default function PracticeHubPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="page-shell py-6 sm:py-10">
        <nav className="mb-6 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            홈
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">청소업 실무</span>
        </nav>

        <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            청소업 실무
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">
            입주·에어컨·마케팅처럼 과정별로 실무 글을 모아 두는 곳입니다. 기존 청소지식 글과는 별도입니다.
          </p>
        </header>

        <p className="mt-10 text-center text-slate-500">아직 발행된 실무 글이 없습니다.</p>
      </div>
    </main>
  );
}

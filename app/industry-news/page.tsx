import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "업계소식",
  description:
    "청소·방역 업계 동향과 현장 이야기를 블로그 형식으로 전합니다. 입찰·낙찰 리포트와 통계는 데이터랩에서 확인하세요.",
};

export default function IndustryNewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-violet-50/30">
      <div className="page-shell py-10 lg:py-12">
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="mb-2 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            업계소식
          </h1>
          <p className="text-sm text-slate-600">
            현장과 시장 이슈를 담은 글을 블로그 형식으로 이어서 제공할 예정입니다.
          </p>
        </header>
        <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-sm">
          <p className="text-slate-600">첫 콘텐츠를 준비하고 있습니다.</p>
          <p className="mt-3 text-sm text-slate-500">
            입찰·낙찰 리포트와 주제별 자료는{" "}
            <Link href="/news" className="font-medium text-violet-700 underline-offset-2 hover:underline">
              데이터랩
            </Link>
            에서 보실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

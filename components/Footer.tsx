import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-100/50 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="font-semibold text-slate-800 hover:text-slate-900">
              Newslett
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              청소업 정보 데이터 + 커뮤니티 + 뉴스레터
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 sm:gap-6" aria-label="푸터 링크">
            <Link
              href="/archive"
              className="min-h-[44px] py-2 text-sm text-slate-600 hover:text-slate-900 touch-manipulation"
            >
              아카이브
            </Link>
            <Link
              href="/categories"
              className="min-h-[44px] py-2 text-sm text-slate-600 hover:text-slate-900 touch-manipulation"
            >
              카테고리
            </Link>
            <Link
              href="/listings"
              className="min-h-[44px] py-2 text-sm text-slate-600 hover:text-slate-900 touch-manipulation"
            >
              현장·구인
            </Link>
            <Link
              href="/jobs"
              className="min-h-[44px] py-2 text-sm text-slate-600 hover:text-slate-900 touch-manipulation"
            >
              인력 구인
            </Link>
            <Link
              href="/ugc"
              className="min-h-[44px] py-2 text-sm text-slate-600 hover:text-slate-900 touch-manipulation"
            >
              현장후기
            </Link>
            <Link
              href="/estimate"
              className="min-h-[44px] py-2 text-sm text-slate-600 hover:text-slate-900 touch-manipulation"
            >
              견적 계산기
            </Link>
            <Link
              href="/login"
              className="min-h-[44px] py-2 text-sm text-slate-600 hover:text-slate-900 touch-manipulation"
            >
              로그인
            </Link>
          </nav>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Newslett. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

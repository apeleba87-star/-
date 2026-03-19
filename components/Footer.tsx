import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-gray-900 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="font-semibold text-white hover:text-teal-300 transition-colors">
              클린아이덱스
            </Link>
            <p className="mt-1 text-sm text-slate-400">
              청소업 정보 뉴스레터 - 클린아이덱스
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 sm:gap-6" aria-label="푸터 링크">
            <Link href="/archive" className="min-h-[44px] py-2 text-sm text-slate-400 hover:text-teal-300 transition-colors touch-manipulation">아카이브</Link>
            <Link href="/categories" className="min-h-[44px] py-2 text-sm text-slate-400 hover:text-teal-300 transition-colors touch-manipulation">카테고리</Link>
            <Link href="/listings" className="min-h-[44px] py-2 text-sm text-slate-400 hover:text-teal-300 transition-colors touch-manipulation">현장 거래</Link>
            <Link href="/jobs" className="min-h-[44px] py-2 text-sm text-slate-400 hover:text-teal-300 transition-colors touch-manipulation">인력 구인</Link>
            <Link href="/estimate" className="min-h-[44px] py-2 text-sm text-slate-400 hover:text-teal-300 transition-colors touch-manipulation">견적 계산기</Link>
            <Link href="/login" className="min-h-[44px] py-2 text-sm text-slate-400 hover:text-teal-300 transition-colors touch-manipulation">로그인</Link>
            <Link href="/terms" className="min-h-[44px] py-2 text-sm text-slate-400 hover:text-teal-300 transition-colors touch-manipulation">이용약관</Link>
            <Link href="/privacy" className="min-h-[44px] py-2 text-sm text-slate-400 hover:text-teal-300 transition-colors touch-manipulation">개인정보 처리방침</Link>
          </nav>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} 클린아이덱스. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import HeaderAuth from "./HeaderAuth";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Newslett
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-slate-900">홈</Link>
          <Link href="/archive" className="hover:text-slate-900">뉴스레터 아카이브</Link>
          <Link href="/categories" className="hover:text-slate-900">카테고리</Link>
          <Link href="/tenders" className="hover:text-slate-900">입찰 공고</Link>
          <Link href="/tenders/dashboard" className="hover:text-slate-900">입찰 대시보드</Link>
          <Link href="/contracts" className="hover:text-slate-900">계약</Link>
          <Link href="/ugc" className="hover:text-slate-900">현장·후기</Link>
          <HeaderAuth />
          <Link href="/admin" className="rounded bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200">
            관리자
          </Link>
        </nav>
      </div>
    </header>
  );
}

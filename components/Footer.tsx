import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-100/50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="font-semibold text-slate-800">Newslett</Link>
            <p className="mt-1 text-sm text-slate-500">
              청소업 정보 데이터 + 커뮤니티 + 뉴스레터
            </p>
          </div>
          <nav className="flex gap-6 text-sm text-slate-600">
            <Link href="/archive" className="hover:text-slate-900">아카이브</Link>
            <Link href="/categories" className="hover:text-slate-900">카테고리</Link>
            <Link href="/ugc" className="hover:text-slate-900">현장·후기</Link>
            <Link href="/login" className="hover:text-slate-900">로그인</Link>
          </nav>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Newslett. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-sm text-slate-600">
        주소가 잘못되었거나, 콘텐츠가 아직 제공되지 않았을 수 있습니다.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-teal-800"
        >
          홈으로
        </Link>
        <Link
          href="/services"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          장소별 가이드
        </Link>
        <Link
          href="/pollution"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          오염별
        </Link>
        <Link
          href="/products"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          세정 제품
        </Link>
      </div>
    </div>
  );
}

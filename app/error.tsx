"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">잠시 문제가 발생했습니다</h1>
      <p className="mt-3 text-sm text-slate-600">
        새로고침 후 다시 시도해 주세요. 계속 문제가 발생하면 관리자에게 문의해 주세요.
      </p>

      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error?.message ? (
          <span>
            오류: <span className="font-medium">{error.message}</span>
          </span>
        ) : (
          "알 수 없는 오류"
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}


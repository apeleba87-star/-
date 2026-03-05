"use client";

import Link from "next/link";

export default function UgcSubmittedBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <p className="font-medium">등록되었습니다.</p>
      <p className="mt-0.5 text-emerald-700">검수 후 목록에 반영됩니다.</p>
      <Link href="/ugc" className="mt-2 inline-block text-emerald-700 underline hover:no-underline">
        목록에서 확인
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function TendersListClient({ cleanOnly }: { cleanOnly: boolean }) {
  const searchParams = useSearchParams();
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.set("clean_only", cleanOnly ? "0" : "1");
  const toggleUrl = `/tenders?${nextParams.toString()}`;

  return (
    <Link
      href={toggleUrl}
      className={`rounded-lg border px-4 py-2 text-sm font-medium ${cleanOnly ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
    >
      {cleanOnly ? "전체 보기" : "청소 관련만"}
    </Link>
  );
}

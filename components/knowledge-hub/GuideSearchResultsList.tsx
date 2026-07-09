import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GuideSearchResult } from "@/lib/knowledge-hub/search";

type Props = {
  results: GuideSearchResult[];
  query?: string;
  emptyMessage?: string;
};

function typeLabel(guideType: GuideSearchResult["guideType"]): string | null {
  if (guideType === "service_supplies") return "약품·장비";
  if (guideType === "problem") return "오염·재질";
  return null;
}

export default function GuideSearchResultsList({ results, query, emptyMessage }: Props) {
  if (!results.length) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        {emptyMessage ?? (query ? `"${query}"에 맞는 가이드를 찾지 못했습니다.` : "검색어를 입력해 주세요.")}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {results.map((r) => {
        const badge = typeLabel(r.guideType);
        return (
          <li key={r.path}>
            <Link
              href={r.path}
              className="group flex min-h-[52px] items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900 group-hover:text-teal-800">{r.h1}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{r.categoryName}</span>
                  {badge ? (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700">{badge}</span>
                  ) : null}
                </span>
                {r.snippet ? (
                  <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-slate-600">{r.snippet}</span>
                ) : null}
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-600" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

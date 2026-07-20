import Link from "next/link";
import SolutionsCatalog from "@/components/knowledge-hub/SolutionsCatalog";
import { listContaminants } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { CONTAMINANT_TYPE_KO } from "@/lib/knowledge-hub/korean-labels";
import {
  listSolutionCardData,
  SOLUTIONS_FINDER_SUBTITLE,
} from "@/lib/knowledge-hub/solutions/get-solutions";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "오염으로 찾기 — 장소·부위 검색어 | 클린아이덱스",
  description:
    "가정집·상가·식당·카페·미용실·사무실·병원 등 장소·부위로 세분화된 오염 제거 가이드.",
  path: "/pollution",
});

export default function PollutionHubPage() {
  const solutionPages = listSolutionCardData();
  const contaminants = listContaminants();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <SolutionsCatalog
            pages={solutionPages}
            title="오염으로 찾기"
            subtitle={SOLUTIONS_FINDER_SUBTITLE}
          />

          <details className="mt-14 border-t border-slate-200 pt-8">
            <summary className="cursor-pointer list-none text-base font-bold text-slate-600 marker:content-none hover:text-teal-800 [&::-webkit-details-marker]:hidden">
              오염 마스터만 보기
              <span className="ml-1 text-slate-400">▾</span>
            </summary>
            <ul id="masters" className="mt-4 grid gap-2 sm:grid-cols-2">
              {contaminants.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/pollution/${c.id}`}
                    className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-teal-300"
                  >
                    <span className="text-xs font-bold text-teal-800">
                      {CONTAMINANT_TYPE_KO[c.type] ?? c.type}
                    </span>
                    <span className="mt-0.5 block text-base font-bold text-slate-900">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </main>
  );
}

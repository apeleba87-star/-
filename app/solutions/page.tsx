import SolutionsCatalog from "@/components/knowledge-hub/SolutionsCatalog";
import {
  listSolutionCardData,
  SOLUTIONS_FINDER_SUBTITLE,
} from "@/lib/knowledge-hub/solutions/get-solutions";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "검색어 가이드 — 장소·부위·오염 | 클린아이덱스",
  description:
    "가정집 화장실 변기 요석, 상가 소변기 요석처럼 검색어 단위로 정리한 청소 가이드.",
  path: "/solutions",
});

export default function SolutionsHubPage() {
  const pages = listSolutionCardData();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="page-shell py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <SolutionsCatalog
            pages={pages}
            title="검색어 가이드"
            subtitle={SOLUTIONS_FINDER_SUBTITLE}
          />
        </div>
      </div>
    </main>
  );
}

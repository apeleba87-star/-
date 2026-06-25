import MoveBudgetExplorer from "@/components/move/MoveBudgetExplorer";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "내 예산으로 갈 수 있는 지역 찾기 — 실거래 기반 이사 탐색",
  description:
    "예산, 지역, 주택 유형, 거래 유형을 선택해 최근 실거래 기준으로 갈 수 있는 동네 후보를 탐색합니다. 현재는 UI 확인용 더미 데이터입니다.",
  path: "/move",
});

export default function MoveBudgetPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/40">
      <div className="page-shell py-8 lg:py-12">
        <MoveBudgetExplorer />
      </div>
    </main>
  );
}
